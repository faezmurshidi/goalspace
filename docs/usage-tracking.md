# Usage Tracking and Subscription Management

## Current Gaps in Usage Tracking

The current implementation has several gaps in usage tracking and subscription management:

1. **Limited Usage Metrics**: Only basic counters for API calls without detailed resource usage
2. **No Token Tracking**: Missing input/output token counts for AI interactions
3. **No Cost Attribution**: No way to calculate actual costs per user
4. **Lack of Time-Based Reset**: No mechanism to reset usage counters for billing cycles
5. **No Differential Pricing**: No tracking of different AI models with varied costs
6. **Missing Enforcement**: Framework for limits exists but no actual implementation

## Comprehensive Usage Tracking Design

### 1. Subscription Tiers Schema

```sql
-- Subscription plan definitions
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    limits JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, limits) VALUES
('free', 'Free', 'Limited access to basic features', 0, 0, '{
    "max_spaces": 3,
    "max_goals": 1,
    "max_tokens_per_month": 100000,
    "max_mentors_per_space": 1,
    "allowed_models": ["claude-3-haiku", "gpt-3.5-turbo"],
    "max_documents": 10,
    "max_modules_per_space": 5,
    "vector_search_enabled": false,
    "max_podcast_minutes": 10
}'),
('basic', 'Basic', 'Standard features for individuals', 9.99, 99.99, '{
    "max_spaces": 10,
    "max_goals": 3,
    "max_tokens_per_month": 500000,
    "max_mentors_per_space": 2,
    "allowed_models": ["claude-3-haiku", "claude-3-sonnet", "gpt-3.5-turbo", "gpt-4-turbo"],
    "max_documents": 50,
    "max_modules_per_space": 15,
    "vector_search_enabled": true,
    "max_podcast_minutes": 60
}'),
('pro', 'Professional', 'Advanced features for serious learners', 19.99, 199.99, '{
    "max_spaces": 30,
    "max_goals": 10,
    "max_tokens_per_month": 1500000,
    "max_mentors_per_space": 5,
    "allowed_models": ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus", "gpt-3.5-turbo", "gpt-4-turbo", "gpt-4-vision", "perplexity-online-mixtral"],
    "max_documents": 500,
    "max_modules_per_space": 50,
    "vector_search_enabled": true,
    "max_podcast_minutes": 300
}');

-- User subscriptions
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    payment_provider TEXT,
    payment_provider_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

-- Historical subscription data
CREATE TABLE public.subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Detailed Usage Tracking

```sql
-- Monthly usage periods
CREATE TABLE public.usage_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, period_start)
);

-- Granular usage tracking
CREATE TABLE public.usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.usage_periods(id),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('ai_chat', 'ai_generation', 'vector_search', 'podcast_creation', 'module_generation', 'document_embedding')),
    operation TEXT NOT NULL,
    resource_id UUID,
    ai_model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 6) DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly usage summaries
CREATE TABLE public.usage_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.usage_periods(id),
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_ai_requests INTEGER DEFAULT 0,
    total_vector_searches INTEGER DEFAULT 0,
    total_podcast_minutes INTEGER DEFAULT 0,
    total_estimated_cost DECIMAL(10, 6) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, period_id)
);

-- Model cost configuration for internal calculations
CREATE TABLE public.ai_model_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    input_token_cost DECIMAL(12, 10) NOT NULL,
    output_token_cost DECIMAL(12, 10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data for model costs
INSERT INTO public.ai_model_costs (model_name, provider, input_token_cost, output_token_cost) VALUES
('claude-3-haiku', 'anthropic', 0.00000025, 0.00000125),
('claude-3-sonnet', 'anthropic', 0.000003, 0.000015),
('claude-3-opus', 'anthropic', 0.00001, 0.00003),
('gpt-3.5-turbo', 'openai', 0.0000005, 0.0000015),
('gpt-4-turbo', 'openai', 0.00001, 0.00003),
('gpt-4-vision', 'openai', 0.00001, 0.00003),
('perplexity-online-mixtral', 'perplexity', 0.000001, 0.000005);
```

### 3. Usage Limits and Enforcement

```typescript
// lib/types/subscription.ts
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: {
    maxSpaces: number;
    maxGoals: number;
    maxTokensPerMonth: number;
    maxMentorsPerSpace: number;
    allowedModels: string[];
    maxDocuments: number;
    maxModulesPerSpace: number;
    vectorSearchEnabled: boolean;
    maxPodcastMinutes: number;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan?: SubscriptionPlan;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalAiRequests: number;
  totalVectorSearches: number;
  totalPodcastMinutes: number;
  totalEstimatedCost: number;
  periodStart: string;
  periodEnd: string;
}

// lib/utils/subscription.ts
export async function checkUsageLimit(
  userId: string,
  resourceType: 'tokens' | 'spaces' | 'goals' | 'mentors' | 'documents' | 'modules' | 'podcasts'
): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
}> {
  // Implementation to check specific limit against current usage
}

export async function recordAiUsage(params: {
  userId: string;
  resourceType: 'ai_chat' | 'ai_generation' | 'vector_search' | 'podcast_creation' | 'module_generation';
  operation: string;
  resourceId?: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  // Implementation to record usage and update summaries
}

export async function getCurrentUsagePeriod(userId: string): Promise<{
  id: string;
  periodStart: string;
  periodEnd: string;
  isActive: boolean;
}> {
  // Implementation to get or create current usage period
}

export async function resetUsagePeriod(userId: string): Promise<void> {
  // Implementation to create a new usage period
}
```

### 4. Usage Middleware for API Routes

```typescript
// middleware/usage-tracking.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkUsageLimit } from '@/lib/utils/subscription';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function usageMiddleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return res;
  
  const userId = session.user.id;
  const path = req.nextUrl.pathname;
  
  // Only check usage limits for AI-related endpoints
  if (path.startsWith('/api/generate') || 
      path.startsWith('/api/chat') || 
      path.startsWith('/api/embeddings') ||
      path.startsWith('/api/vector')) {
    
    const { allowed, limit, current } = await checkUsageLimit(userId, 'tokens');
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded', 
          message: `You've reached your monthly token limit of ${limit}. Please upgrade your plan to continue.`,
          current,
          limit 
        }, 
        { status: 429 }
      );
    }
  }
  
  return res;
}
```

### 5. Service to Calculate and Track Token Usage

```typescript
// lib/services/token-tracking.ts
import { createClient } from '@supabase/supabase-js';
import { encode } from 'gpt-tokenizer';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  estimatedCost: number;
}

export async function calculateTokenUsage(
  input: string, 
  output: string, 
  model: string
): Promise<TokenUsage> {
  // Get input token count
  const inputTokens = getTokenCount(input, model);
  
  // Get output token count
  const outputTokens = getTokenCount(output, model);
  
  // Get cost data for model
  const { data: modelCost } = await supabaseAdmin
    .from('ai_model_costs')
    .select('input_token_cost, output_token_cost')
    .eq('model_name', model)
    .single();
  
  const inputCost = modelCost 
    ? inputTokens * parseFloat(modelCost.input_token_cost) 
    : 0;
    
  const outputCost = modelCost 
    ? outputTokens * parseFloat(modelCost.output_token_cost) 
    : 0;
  
  return {
    inputTokens,
    outputTokens,
    model,
    estimatedCost: inputCost + outputCost,
  };
}

function getTokenCount(text: string, model: string): number {
  if (model.startsWith('gpt')) {
    // Use OpenAI tokenizer for GPT models
    return encode(text).length;
  } else {
    // For other models, use an approximation (Claude, etc.)
    // This is an approximation and should be replaced with model-specific tokenizers
    return Math.ceil(text.length / 3.5);
  }
}

export async function recordTokenUsage(
  userId: string,
  usage: TokenUsage,
  resourceType: string,
  operation: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Implementation to record in database
}
```

### 6. Cron Job for Usage Period Management

```typescript
// scripts/reset-usage-periods.ts
import { supabaseAdmin } from '@/lib/supabase-admin';

async function resetMonthlyUsagePeriods() {
  const now = new Date();
  
  // Get all active subscriptions
  const { data: subscriptions } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id, current_period_end')
    .eq('status', 'active');
  
  for (const subscription of subscriptions || []) {
    const periodEnd = new Date(subscription.current_period_end);
    
    // If the current period has ended, create a new period
    if (periodEnd < now) {
      const newPeriodStart = new Date(periodEnd);
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      
      // Deactivate the current period
      await supabaseAdmin
        .from('usage_periods')
        .update({ is_current: false })
        .eq('user_id', subscription.user_id)
        .eq('is_current', true);
      
      // Create a new period
      await supabaseAdmin
        .from('usage_periods')
        .insert({
          user_id: subscription.user_id,
          period_start: newPeriodStart.toISOString(),
          period_end: newPeriodEnd.toISOString(),
          is_current: true,
        });
      
      // Create a new summary record
      await supabaseAdmin
        .from('usage_summaries')
        .insert({
          user_id: subscription.user_id,
          period_id: (await supabaseAdmin
            .from('usage_periods')
            .select('id')
            .eq('user_id', subscription.user_id)
            .eq('is_current', true)
            .single()).data?.id,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_ai_requests: 0,
          total_vector_searches: 0,
          total_podcast_minutes: 0,
          total_estimated_cost: 0,
        });
      
      // Update the subscription period
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
        })
        .eq('id', subscription.id);
      
      // Record in subscription history
      await supabaseAdmin
        .from('subscription_history')
        .insert({
          user_id: subscription.user_id,
          plan_id: (await supabaseAdmin
            .from('user_subscriptions')
            .select('plan_id')
            .eq('id', subscription.id)
            .single()).data?.plan_id,
          status: 'active',
          period_start: newPeriodStart.toISOString(),
          period_end: newPeriodEnd.toISOString(),
        });
    }
  }
  
  console.log('Usage periods reset successfully');
}

// Run this function as a scheduled cron job
resetMonthlyUsagePeriods();
```

### 7. User Dashboard for Usage Monitoring

```tsx
// app/(dashboard)/dashboard/usage/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Progress } from '@/components/ui/progress';

export default function UsageDashboard() {
  const { user } = useUser();
  const [usageSummary, setUsageSummary] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [dailyUsage, setDailyUsage] = useState([]);
  
  useEffect(() => {
    // Fetch usage data implementation
    // ...
  }, [user?.id]);
  
  if (!usageSummary || !subscription) {
    return <div>Loading usage data...</div>;
  }
  
  const tokenLimit = subscription.plan.limits.maxTokensPerMonth;
  const totalTokens = usageSummary.totalInputTokens + usageSummary.totalOutputTokens;
  const tokenPercentage = Math.min(100, (totalTokens / tokenLimit) * 100);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Usage Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{totalTokens.toLocaleString()}</span>
                <span>{tokenLimit.toLocaleString()}</span>
              </div>
              <Progress value={tokenPercentage} />
              <div className="text-sm text-gray-500">
                {(tokenLimit - totalTokens).toLocaleString()} tokens remaining
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional usage cards... */}
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inputTokens" stroke="#8884d8" name="Input Tokens" />
                <Line type="monotone" dataKey="outputTokens" stroke="#82ca9d" name="Output Tokens" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Additional charts... */}
      </div>
    </div>
  );
}
```

### 8. Admin Dashboard for Usage Analytics

```tsx
// app/(admin)/admin/usage/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUsageDashboard() {
  const [topUsers, setTopUsers] = useState([]);
  const [totalUsage, setTotalUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  });
  const [modelUsage, setModelUsage] = useState([]);
  
  useEffect(() => {
    // Implementation to fetch usage data for admin
    // ...
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Usage Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Summary cards... */}
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Top Users by Usage</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Input Tokens</TableHead>
              <TableHead>Output Tokens</TableHead>
              <TableHead>Cost ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.plan}</TableCell>
                <TableCell>{user.inputTokens.toLocaleString()}</TableCell>
                <TableCell>{user.outputTokens.toLocaleString()}</TableCell>
                <TableCell>${user.cost.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Usage by Model</h2>
        {/* Model usage charts and tables... */}
      </div>
    </div>
  );
}
```

## Implementation Strategy

### Phase 1: Schema and Basic Tracking
1. Implement the database schema for subscription plans and usage tracking
2. Create basic tracking for space and goal counts against limits
3. Implement the token calculation service

### Phase 2: Detailed Usage Tracking
1. Implement middleware for usage limit checks
2. Modify AI API endpoints to record token usage
3. Create usage period management with monthly resets

### Phase 3: User Experience
1. Build usage dashboard for users
2. Implement usage warnings when approaching limits
3. Create subscription upgrade flow

### Phase 4: Admin and Analytics
1. Build admin dashboard for usage analytics
2. Implement cost reporting and projections
3. Create usage anomaly detection

## Usage Tracking for Different AI Operations

### 1. Chat Messages
Track each interaction with mentors:

```typescript
// Example implementation in chat API
export async function POST(req: Request) {
  // Authentication and validation...
  
  const { message, spaceId } = await req.json();
  const userId = session.user.id;
  
  // Record the input before processing
  const { inputTokens } = await calculateTokenUsage(message, "", model);
  
  // Process with AI
  const response = await callAI(message, model);
  
  // Record full usage after getting the response
  const tokenUsage = await calculateTokenUsage(message, response.content, model);
  
  await recordAiUsage({
    userId,
    resourceType: 'ai_chat',
    operation: 'chat_with_mentor',
    resourceId: spaceId,
    aiModel: model,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    metadata: { spaceId }
  });
  
  // Return response...
}
```

### 2. Content Generation
Track generation of modules, plans, research:

```typescript
// Example for module generation
export async function POST(req: Request) {
  // Authentication and validation...
  
  const { spaceId, topic } = await req.json();
  const userId = session.user.id;
  
  // Check limit before generation
  const { allowed } = await checkUsageLimit(userId, 'tokens');
  if (!allowed) {
    return new Response('Token limit exceeded', { status: 429 });
  }
  
  // Generate content
  const prompt = `Create a learning module about ${topic}...`;
  const { content } = await generateWithAI(prompt, model);
  
  // Record usage
  const tokenUsage = await calculateTokenUsage(prompt, content, model);
  
  await recordAiUsage({
    userId,
    resourceType: 'ai_generation',
    operation: 'generate_module',
    resourceId: spaceId,
    aiModel: model,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    metadata: { topic, moduleType: 'learning' }
  });
  
  // Return and save the generated content...
}
```

## Database Triggers for Usage Summaries

```sql
-- Function to update usage summaries
CREATE OR REPLACE FUNCTION update_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current period_id for the user
  WITH period AS (
    SELECT id FROM public.usage_periods 
    WHERE user_id = NEW.user_id AND is_current = true
    LIMIT 1
  )
  
  -- Update summary
  INSERT INTO public.usage_summaries (
    user_id, 
    period_id,
    total_input_tokens,
    total_output_tokens,
    total_ai_requests,
    total_vector_searches,
    total_podcast_minutes,
    total_estimated_cost
  )
  SELECT
    NEW.user_id,
    period.id,
    COALESCE(SUM(ur.input_tokens), 0),
    COALESCE(SUM(ur.output_tokens), 0),
    COUNT(*),
    COALESCE(SUM(CASE WHEN ur.resource_type = 'vector_search' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ur.resource_type = 'podcast_creation' 
                    THEN (ur.metadata->>'duration_minutes')::numeric 
                    ELSE 0 
                END), 0),
    COALESCE(SUM(ur.estimated_cost), 0)
  FROM
    public.usage_records ur, period
  WHERE
    ur.user_id = NEW.user_id AND
    ur.period_id = period.id
  GROUP BY
    NEW.user_id, period.id
  ON CONFLICT (user_id, period_id) DO UPDATE SET
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_ai_requests = EXCLUDED.total_ai_requests,
    total_vector_searches = EXCLUDED.total_vector_searches,
    total_podcast_minutes = EXCLUDED.total_podcast_minutes,
    total_estimated_cost = EXCLUDED.total_estimated_cost,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_usage_summary_after_insert
AFTER INSERT ON public.usage_records
FOR EACH ROW
EXECUTE FUNCTION update_usage_summary();
```

## Conclusion

This comprehensive usage tracking system addresses the current gaps by:

1. **Detailed Metrics**: Tracking both input and output tokens for all AI interactions
2. **Cost Attribution**: Calculating estimated costs based on model-specific pricing
3. **Time-Based Tracking**: Monthly usage periods with automatic resets
4. **Differential Tracking**: Separate tracking for different AI models and operations
5. **Proper Enforcement**: Middleware to check limits before processing requests
6. **User Transparency**: Dashboard for users to monitor their usage
7. **Business Intelligence**: Admin analytics for usage patterns and cost analysis

The implementation strategy provides a clear roadmap for adding these critical features to the existing application, ensuring sustainable operation with proper usage controls.