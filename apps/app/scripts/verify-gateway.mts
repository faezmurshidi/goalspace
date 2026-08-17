/**
 * Smoke test for Vercel AI Gateway connectivity.
 *
 * Run:  pnpm --filter @goalspace/app verify:gateway
 *
 * Proves three things in one shot: that a credential resolves, that the
 * gateway accepts it, and that a named model streams tokens back. It is
 * deliberately not a test — it hits the network and costs a fraction of a
 * cent, so it stays out of `pnpm test`.
 *
 * Auth resolves in this order (the gateway checks the static key first):
 *   1. AI_GATEWAY_API_KEY   — .env.local
 *   2. VERCEL_OIDC_TOKEN    — written by `vercel env pull`, ~24h lifetime
 */
import { config } from 'dotenv';
import { streamText, gateway } from 'ai';

config({ path: new URL('../.env.local', import.meta.url).pathname });

const MODEL = process.env.GATEWAY_MODEL ?? 'openai/gpt-5.6-sol';

function credential(): string {
  if (process.env.AI_GATEWAY_API_KEY) return 'AI_GATEWAY_API_KEY';
  if (process.env.VERCEL_OIDC_TOKEN) return 'VERCEL_OIDC_TOKEN';
  return 'none';
}

/**
 * A wrong model slug is the likeliest failure and the least self-evident, so
 * on any error we ask the gateway what it actually serves. Printing near
 * misses beats printing all 100+.
 */
async function explain(error: unknown): Promise<never> {
  console.error(`\n\n✗ Gateway call failed for "${MODEL}"`);
  console.error(`  ${error instanceof Error ? error.message : String(error)}`);

  try {
    const { models } = await gateway.getAvailableModels();
    const ids: string[] = models.map((m: { id: string }) => m.id);
    const stem = MODEL.split('/')[0];
    const near = ids.filter((id) => id.startsWith(stem));

    console.error(`\n  ${ids.length} models available.`);
    if (near.length) {
      console.error(`  From "${stem}":`);
      for (const id of near.slice(0, 15)) console.error(`    ${id}`);
    }
    console.error('\n  Re-run against one of these with:');
    console.error('    GATEWAY_MODEL=<slug> pnpm --filter @goalspace/app verify:gateway');
  } catch (listError) {
    console.error(
      `\n  Could not list models either: ${
        listError instanceof Error ? listError.message : String(listError)
      }`
    );
    console.error('  That points at the credential rather than the model slug.');
  }
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`credential: ${credential()}`);
  console.log(`model:      ${MODEL}\n`);

  if (credential() === 'none') {
    console.error('✗ No credential. Put AI_GATEWAY_API_KEY in apps/app/.env.local,');
    console.error('  or run `vercel link && vercel env pull` for an OIDC token.');
    process.exit(1);
  }

  try {
    const result = streamText({
      model: MODEL,
      prompt: 'In one sentence, what is a project log good for?',
    });

    for await (const chunk of result.textStream) process.stdout.write(chunk);

    const usage = await result.usage;
    console.log(`\n\n✓ Gateway reachable. Tokens in/out: ${usage.inputTokens}/${usage.outputTokens}`);
  } catch (error) {
    await explain(error);
  }
}

void main();
