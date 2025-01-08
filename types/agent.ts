// Model configuration type
export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'perplexity';
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// Agent configuration type
export interface AgentConfig {
  name: string;
  model: ModelConfig;
  system_prompt: string;
}

// Agent type
export type AgentType = 'faez' | 'mentor'; 