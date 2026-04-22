/**
 * PropWise — Claude AI Wrapper
 * Server-side only. Never import in client components.
 *
 * Features:
 * - Exponential backoff retry (rate limits, 529 overloaded, 5xx)
 * - Cost calculation per model
 * - Typed JSON response helper
 * - Structured AIError for caller handling
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import {
  AIError,
  type AIRequestOptions,
  type AIResponse,
} from './types'

// Token costs in USD per 1,000,000 tokens
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':             { input: 15.00,  output: 75.00  },
  'claude-sonnet-4-6':           { input: 3.00,   output: 15.00  },
  'claude-3-5-sonnet-20241022':  { input: 3.00,   output: 15.00  },
  'claude-3-5-haiku-20241022':   { input: 0.80,   output: 4.00   },
  'claude-3-haiku-20240307':     { input: 0.25,   output: 1.25   },
}

const DEFAULT_MODEL      = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_TIMEOUT_MS  = 30_000

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] ?? MODEL_COSTS[DEFAULT_MODEL]
  return (inputTokens / 1_000_000) * costs.input
       + (outputTokens / 1_000_000) * costs.output
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Core Claude API call with retry logic.
 * Returns structured AIResponse with usage stats.
 */
export async function callClaude(
  messages: MessageParam[],
  options:  AIRequestOptions = {},
): Promise<AIResponse<string>> {
  const {
    model        = DEFAULT_MODEL,
    maxTokens    = DEFAULT_MAX_TOKENS,
    systemPrompt,
    temperature  = 0,
    maxRetries   = DEFAULT_MAX_RETRIES,
    timeoutMs    = DEFAULT_TIMEOUT_MS,
  } = options

  const client = new Anthropic({
    apiKey:  process.env.ANTHROPIC_API_KEY!,
    timeout: timeoutMs,
  })

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Exponential backoff: 1s → 2s → 4s
    if (attempt > 0) {
      await sleep(Math.pow(2, attempt - 1) * 1_000)
    }

    const startTime = Date.now()

    try {
      const response = await client.messages.create({
        model,
        max_tokens:  maxTokens,
        temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
      })

      const latencyMs = Date.now() - startTime

      const rawText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('')

      const usage = {
        promptTokens:     response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens:      response.usage.input_tokens + response.usage.output_tokens,
        costUsd:          calculateCost(model, response.usage.input_tokens, response.usage.output_tokens),
      }

      return { content: rawText, rawText, usage, latencyMs, model }

    } catch (error: unknown) {
      lastError = error

      if (error instanceof Anthropic.RateLimitError) {
        if (attempt === maxRetries) {
          throw new AIError('Rate limit exceeded after retries', 'RATE_LIMIT', false, error)
        }
        continue
      }

      if (error instanceof Anthropic.InternalServerError) {
        if (attempt === maxRetries) {
          throw new AIError(`Anthropic server error: ${error.status}`, 'API_ERROR', false, error)
        }
        continue
      }

      // Generic APIError — check for 529 overloaded or other 5xx
      if (error instanceof Anthropic.APIError) {
        const status = error.status as number | undefined
        if (status === 529) {
          if (attempt === maxRetries) {
            throw new AIError('Anthropic API overloaded — try again shortly', 'OVERLOADED', false, error)
          }
          continue
        }
        if (status != null && status >= 500) {
          if (attempt === maxRetries) {
            throw new AIError(`Anthropic server error: ${status}`, 'API_ERROR', false, error)
          }
          continue
        }
        // 4xx (not 429, handled above) — not retryable
        throw new AIError(
          `Anthropic API error ${status ?? 'unknown'}: ${error.message}`,
          'API_ERROR',
          false,
          error,
        )
      }

      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new AIError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', true, error)
      }

      if (error instanceof Anthropic.APIConnectionError) {
        if (attempt === maxRetries) {
          throw new AIError('Connection to Anthropic API failed', 'API_ERROR', true, error)
        }
        continue
      }

      throw new AIError('Unknown Anthropic API error', 'API_ERROR', false, error)
    }
  }

  throw new AIError('Max retries exceeded', 'API_ERROR', false, lastError)
}

/**
 * JSON variant — parses the response as T.
 * Strips markdown code fences if present.
 * Throws AIError('INVALID_RESPONSE') on parse failure.
 */
export async function callClaudeJSON<T>(
  messages: MessageParam[],
  options:  AIRequestOptions = {},
): Promise<AIResponse<T>> {
  const response = await callClaude(messages, {
    ...options,
    systemPrompt:
      (options.systemPrompt ?? '') +
      '\n\nIMPORTANT: Respond with valid JSON only. No markdown formatting, no code fences, no explanation outside the JSON object.',
  })

  try {
    const cleaned = response.rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned) as T
    return { ...response, content: parsed }
  } catch {
    throw new AIError(
      `Claude returned invalid JSON: ${response.rawText.slice(0, 300)}`,
      'INVALID_RESPONSE',
      false,
    )
  }
}
