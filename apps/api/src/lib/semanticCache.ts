import crypto from 'crypto';
import { redis } from './redis';

export async function getCachedLLMResponse(
  promptHash: string,
): Promise<string | null> {
  return redis.get(`llm:cache:${promptHash}`);
}

export async function setCachedLLMResponse(
  promptHash: string,
  response: string,
  ttlSeconds = 3600,
): Promise<void> {
  await redis.setex(`llm:cache:${promptHash}`, ttlSeconds, response);
}

export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}
