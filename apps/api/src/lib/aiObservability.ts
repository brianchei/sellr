import { Langfuse, type LangfuseTraceClient } from 'langfuse';

const secretKey = process.env.LANGFUSE_SECRET_KEY;
const publicKey = process.env.LANGFUSE_PUBLIC_KEY;

export const langfuse =
  secretKey && publicKey
    ? new Langfuse({
        secretKey,
        publicKey,
        baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
      })
    : null;

export async function traceAIJob<T>(
  jobType: string,
  fn: (trace: LangfuseTraceClient | null) => Promise<T>,
): Promise<T> {
  if (!langfuse) {
    return fn(null);
  }

  const trace = langfuse.trace({ name: jobType });
  try {
    const result = await fn(trace);
    trace.update({ output: result });
    return result;
  } catch (err) {
    trace.update({ metadata: { error: String(err) } });
    throw err;
  } finally {
    await langfuse.flushAsync();
  }
}
