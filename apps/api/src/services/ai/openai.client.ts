import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import ApiError from '../../utils/ApiError.js';

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(503, 'AI recommendations are not configured on this server');
  }
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // Stay under Nginx's proxy_read_timeout so the user gets our error, not a 504.
    timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 20000,
    maxRetries: 1,
  });
  return client;
}

// Server-side only: the key never reaches the browser. Returns the raw message text.
export async function callOpenAI({
  system,
  user,
}: {
  system: string;
  user: string;
}): Promise<string> {
  const openai = getClient();
  const params: ChatCompletionCreateParamsNonStreaming = {
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  };
  const effort = process.env.OPENAI_REASONING_EFFORT;
  if (effort)
    params.reasoning_effort = effort as ChatCompletionCreateParamsNonStreaming['reasoning_effort'];

  try {
    const completion = await openai.chat.completions.create(params);
    return completion.choices[0]?.message?.content ?? '';
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    console.error('OpenAI request failed:', status ?? '', message);
    throw new ApiError(502, 'The recommendation service is unavailable, please try again');
  }
}
