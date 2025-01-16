import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

type TokenMetrics = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
};

type PromptPerformanceData = {
  id: string;
  timestamp: string;
  variant: 'variantA' | 'variantB';
  promptType: 'system' | 'question' | 'space';
  responseTime?: number;
  tokensUsed?: number;
  success: boolean;
  error?: string;
  tokenMetrics?: TokenMetrics;
};

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const performanceData: PromptPerformanceData = {
      id: nanoid(),
      ...data,
    };

    // Store in Redis (Vercel KV)
    const key = `prompt:performance:${performanceData.id}`;
    await kv.set(key, performanceData);

    // Add to time series for analysis
    const timeSeriesKey = `prompt:metrics:${performanceData.variant}:${performanceData.promptType}`;
    await kv.zadd(timeSeriesKey, {
      score: new Date(performanceData.timestamp).getTime(),
      member: performanceData.id,
    });

    // Update success rate
    const successKey = `prompt:success:${performanceData.variant}:${performanceData.promptType}`;
    if (performanceData.success) {
      await kv.incr(`${successKey}:success`);
    } else {
      await kv.incr(`${successKey}:failure`);
    }

    // Update response time metrics
    if (performanceData.responseTime) {
      const responseTimeKey = `prompt:responsetime:${performanceData.variant}:${performanceData.promptType}`;
      await kv.lpush(responseTimeKey, performanceData.responseTime);
      // Keep only last 1000 response times
      await kv.ltrim(responseTimeKey, 0, 999);
    }

    // Update token metrics
    if (performanceData.tokenMetrics) {
      const tokenKey = `prompt:tokens:${performanceData.variant}:${performanceData.promptType}`;
      await kv.lpush(`${tokenKey}:input`, performanceData.tokenMetrics.inputTokens);
      await kv.lpush(`${tokenKey}:output`, performanceData.tokenMetrics.outputTokens);
      await kv.lpush(`${tokenKey}:cost`, performanceData.tokenMetrics.estimatedCost);
      // Keep only last 1000 entries
      await Promise.all([
        kv.ltrim(`${tokenKey}:input`, 0, 999),
        kv.ltrim(`${tokenKey}:output`, 0, 999),
        kv.ltrim(`${tokenKey}:cost`, 0, 999),
      ]);

      // Update total cost
      await kv.incrbyfloat(
        `prompt:cost:${performanceData.variant}:${performanceData.promptType}`,
        performanceData.tokenMetrics.estimatedCost
      );
    }

    return NextResponse.json({ success: true, id: performanceData.id });
  } catch (error) {
    console.error('Error tracking prompt performance:', error);
    return NextResponse.json({ error: 'Failed to track performance' }, { status: 500 });
  }
}

// Analytics retrieval endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant');
    const promptType = searchParams.get('promptType');
    const timeRange = searchParams.get('timeRange') || '24h'; // Default to last 24 hours

    if (!variant || !promptType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Calculate time range
    const now = Date.now();
    const timeRanges = {
      '1h': now - 3600000,
      '24h': now - 86400000,
      '7d': now - 604800000,
      '30d': now - 2592000000,
    };
    const startTime = timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['24h'];

    // Get metrics for the specified time range
    const timeSeriesKey = `prompt:metrics:${variant}:${promptType}`;
    const performanceIds = await kv.zrangebyscore(timeSeriesKey, startTime, now);

    // Get success rates
    const successKey = `prompt:success:${variant}:${promptType}`;
    const [successes, failures] = await Promise.all([
      kv.get<number>(`${successKey}:success`),
      kv.get<number>(`${successKey}:failure`),
    ]);

    // Get average response time
    const responseTimeKey = `prompt:responsetime:${variant}:${promptType}`;
    const responseTimes = await kv.lrange<number>(responseTimeKey, 0, -1);
    const avgResponseTime = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Get token metrics
    const tokenKey = `prompt:tokens:${variant}:${promptType}`;
    const [inputTokens, outputTokens, costs] = await Promise.all([
      kv.lrange<number>(`${tokenKey}:input`, 0, -1),
      kv.lrange<number>(`${tokenKey}:output`, 0, -1),
      kv.lrange<number>(`${tokenKey}:cost`, 0, -1),
    ]);

    const avgInputTokens = inputTokens.length
      ? inputTokens.reduce((a, b) => a + b, 0) / inputTokens.length
      : null;
    const avgOutputTokens = outputTokens.length
      ? outputTokens.reduce((a, b) => a + b, 0) / outputTokens.length
      : null;
    const avgCostPerRequest = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null;

    // Get total cost
    const totalCost = await kv.get<number>(`prompt:cost:${variant}:${promptType}`);

    // Get detailed performance data
    const performances = await Promise.all(
      performanceIds.map((id) => kv.get<PromptPerformanceData>(`prompt:performance:${id}`))
    );

    return NextResponse.json({
      metrics: {
        totalSamples: performanceIds.length,
        successRate: (successes || 0) / ((successes || 0) + (failures || 0) || 1),
        avgResponseTime,
        tokenMetrics: {
          avgInputTokens,
          avgOutputTokens,
          avgCostPerRequest,
          totalCost: totalCost || 0,
        },
        timeRange,
      },
      performances,
    });
  } catch (error) {
    console.error('Error retrieving analytics:', error);
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
  }
}
