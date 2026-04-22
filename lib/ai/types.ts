import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export type { MessageParam }

export interface AIRequestOptions {
  model?:        string
  maxTokens?:    number
  systemPrompt?: string
  temperature?:  number
  maxRetries?:   number
  timeoutMs?:    number
}

export interface AIUsage {
  promptTokens:     number
  completionTokens: number
  totalTokens:      number
  costUsd:          number
}

export interface AIResponse<T = string> {
  content:    T
  rawText:    string
  usage:      AIUsage
  latencyMs:  number
  model:      string
}

export type AIErrorCode =
  | 'RATE_LIMIT'
  | 'OVERLOADED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'API_ERROR'

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code:          AIErrorCode,
    public readonly retryable:     boolean,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = 'AIError'
  }
}
