import { countTokens } from '@anthropic-ai/tokenizer';
import { encode } from 'gpt-tokenizer';
import { Model } from './ai-generate';

export type TokenCount = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
};

const COST_PER_1K_TOKENS = {
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'mixtral-8x7b-instruct': { input: 0.0005, output: 0.0005 },
} as const;

const MAX_TOKENS = {
  'gpt-4-turbo-preview': 128000,
  'claude-3-opus-20240229': 200000,
  'mixtral-8x7b-instruct': 32000,
} as const;

const MODEL_MAP = {
  'gpt': 'gpt-4-turbo-preview',
  'claude': 'claude-3-opus-20240229',
  'perplexity': 'mixtral-8x7b-instruct',
} as const;

export function countInputTokens(prompt: string, model: Model): TokenCount {
  const modelName = MODEL_MAP[model];
  const tokenCount = model === 'claude' 
    ? countTokens(prompt)
    : encode(prompt).length;

  return {
    inputTokens: tokenCount,
    outputTokens: 0,
    totalTokens: tokenCount,
    estimatedCost: (tokenCount / 1000) * COST_PER_1K_TOKENS[modelName].input,
  };
}

export function updateTokenCount(
  tokenCount: TokenCount,
  output: string,
  model: Model
): TokenCount {
  const modelName = MODEL_MAP[model];
  const outputTokens = model === 'claude'
    ? countTokens(output)
    : encode(output).length;

  const totalTokens = tokenCount.inputTokens + outputTokens;
  const outputCost = (outputTokens / 1000) * COST_PER_1K_TOKENS[modelName].output;

  return {
    ...tokenCount,
    outputTokens,
    totalTokens,
    estimatedCost: tokenCount.estimatedCost + outputCost,
  };
}

export function isPromptTooLong(prompt: string, model: Model): boolean {
  const tokenCount = countInputTokens(prompt, model);
  const modelName = MODEL_MAP[model];
  return tokenCount.totalTokens > MAX_TOKENS[modelName];
} 