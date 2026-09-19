// Verifies OPENAI_API_KEY and OPENAI_MODEL with one tiny request: `npm run ai:check`.
// The API itself turns every provider error into a generic 502, so this is where you
// see the real reason a key or model doesn't work.
import OpenAI from 'openai';
import { aiModel } from '../services/ai/openai.client.js';

const HINTS: Record<number, string> = {
  401: 'The key is invalid or revoked. Copy it again from platform.openai.com/api-keys.',
  403: 'This key or project is not allowed to use the model. Check the project permissions.',
  404: 'The model is not available to this key. Set OPENAI_MODEL to a model your key can use.',
  429: 'Rate limit or no remaining quota. Check billing at platform.openai.com.',
};

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in apps/api/.env');
  process.exit(1);
}

const model = aiModel();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000, maxRetries: 0 });

try {
  const started = Date.now();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'user', content: 'Reply with the JSON object {"ok": true} and nothing else.' },
    ],
    response_format: { type: 'json_object' },
  });
  const reply = completion.choices[0]?.message?.content ?? '';
  console.log(`OK: ${model} answered in ${Date.now() - started} ms: ${reply.trim()}`);
} catch (err) {
  const { status, message } = err as { status?: number; message?: string };
  console.error(`FAILED (${status ?? 'no status'}) with model ${model}: ${message}`);
  if (status && HINTS[status]) console.error(`Hint: ${HINTS[status]}`);
  process.exitCode = 1;
}
