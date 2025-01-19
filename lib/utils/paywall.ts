import { Model } from './ai-generate';

export type SubscriptionTier = 'free' | 'basic' | 'pro';

interface UsageLimit {
  maxSpaces: number;
  maxTokensPerMonth: number;
  allowedModels: Model[];
  maxMentorsPerSpace: number;
}

const TIER_LIMITS: Record<SubscriptionTier, UsageLimit> = {
  free: {
    maxSpaces: 3,
    maxTokensPerMonth: 100000, // 100k tokens
    allowedModels: ['perplexity'],
    maxMentorsPerSpace: 1,
  },
  basic: {
    maxSpaces: 10,
    maxTokensPerMonth: 500000, // 500k tokens
    allowedModels: ['perplexity', 'gpt'],
    maxMentorsPerSpace: 3,
  },
  pro: {
    maxSpaces: 50,
    maxTokensPerMonth: 2000000, // 2M tokens
    allowedModels: ['perplexity', 'gpt', 'claude'],
    maxMentorsPerSpace: 5,
  },
};

export interface PaywallCheck {
  allowed: boolean;
  reason?: string;
  upgradeNeeded?: boolean;
  currentUsage?: {
    spaces: number;
    tokensThisMonth: number;
    mentorsCount: number;
  };
}

export function checkPaywall(
  action: 'create_space' | 'generate_content' | 'add_mentor',
  params: {
    userTier: SubscriptionTier;
    currentSpaces: number;
    tokensUsedThisMonth: number;
    selectedModel?: Model;
    currentMentors?: number;
  }
): PaywallCheck {
  const limits = TIER_LIMITS[params.userTier];
  const usage = {
    spaces: params.currentSpaces,
    tokensThisMonth: params.tokensUsedThisMonth,
    mentorsCount: params.currentMentors || 0,
  };

  switch (action) {
    case 'create_space':
      if (params.currentSpaces >= limits.maxSpaces) {
        return {
          allowed: false,
          reason: `You've reached the maximum number of spaces (${limits.maxSpaces}) for your ${params.userTier} plan`,
          upgradeNeeded: true,
          currentUsage: usage,
        };
      }
      break;

    case 'generate_content':
      if (!params.selectedModel) {
        return {
          allowed: false,
          reason: 'No model selected for content generation',
          upgradeNeeded: false,
        };
      }

      if (!limits.allowedModels.includes(params.selectedModel)) {
        return {
          allowed: false,
          reason: `The ${params.selectedModel} model is not available on your ${params.userTier} plan`,
          upgradeNeeded: true,
          currentUsage: usage,
        };
      }

      if (params.tokensUsedThisMonth >= limits.maxTokensPerMonth) {
        return {
          allowed: false,
          reason: `You've reached your monthly token limit (${limits.maxTokensPerMonth.toLocaleString()} tokens) for your ${params.userTier} plan`,
          upgradeNeeded: true,
          currentUsage: usage,
        };
      }
      break;

    case 'add_mentor':
      if (params.currentMentors && params.currentMentors >= limits.maxMentorsPerSpace) {
        return {
          allowed: false,
          reason: `You've reached the maximum number of mentors (${limits.maxMentorsPerSpace}) per space for your ${params.userTier} plan`,
          upgradeNeeded: true,
          currentUsage: usage,
        };
      }
      break;
  }

  return {
    allowed: true,
    currentUsage: usage,
  };
}

export function getSubscriptionFeatures(tier: SubscriptionTier) {
  const limits = TIER_LIMITS[tier];
  return {
    maxSpaces: limits.maxSpaces,
    maxTokensPerMonth: limits.maxTokensPerMonth,
    allowedModels: limits.allowedModels,
    maxMentorsPerSpace: limits.maxMentorsPerSpace,
  };
} 