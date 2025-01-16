import { countTokens } from '@anthropic-ai/tokenizer';
import { encode } from 'gpt-tokenizer';

export type TokenCount = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
};

const COST_PER_1K_TOKENS = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'claude-3-sonnet': { input: 0.0015, output: 0.003 },
  'claude-3-opus': { input: 0.003, output: 0.006 },
};

export function countOpenAITokens(
  messages: { role: string; content: string }[],
  model: string
): TokenCount {
  const inputText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  const inputTokens = encode(inputText).length;

  return {
    inputTokens,
    outputTokens: 0,
    totalTokens: inputTokens,
    estimatedCost:
      (inputTokens / 1000) * COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS].input,
  };
}

export function countAnthropicTokens(
  messages: { role: string; content: string }[],
  model: string
): TokenCount {
  const inputText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  const inputTokens = countTokens(inputText);

  return {
    inputTokens,
    outputTokens: 0,
    totalTokens: inputTokens,
    estimatedCost:
      (inputTokens / 1000) * COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS].input,
  };
}

export function updateOpenAITokenCount(
  tokenCount: TokenCount,
  output: string,
  model: string
): TokenCount {
  const outputTokens = encode(output).length;
  const totalTokens = tokenCount.inputTokens + outputTokens;
  const outputCost =
    (outputTokens / 1000) * COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS].output;

  return {
    ...tokenCount,
    outputTokens,
    totalTokens,
    estimatedCost: tokenCount.estimatedCost + outputCost,
  };
}

export function updateAnthropicTokenCount(
  tokenCount: TokenCount,
  output: string,
  model: string
): TokenCount {
  const outputTokens = countTokens(output);
  const totalTokens = tokenCount.inputTokens + outputTokens;
  const outputCost =
    (outputTokens / 1000) * COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS].output;

  return {
    ...tokenCount,
    outputTokens,
    totalTokens,
    estimatedCost: tokenCount.estimatedCost + outputCost,
  };
}

export function isPromptTooLong(
  messages: { role: string; content: string }[],
  model: string
): boolean {
  const maxTokens = {
    'gpt-3.5-turbo': 16385,
    'gpt-4': 8192,
    'claude-3-sonnet': 200000,
    'claude-3-opus': 200000,
  };

  const tokenCount = model.startsWith('gpt')
    ? countOpenAITokens(messages, model)
    : countAnthropicTokens(messages, model);

  return tokenCount.totalTokens > maxTokens[model as keyof typeof maxTokens];
}
