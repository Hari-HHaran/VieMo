import 'server-only';

/* OpenAI, called only from the server. The key never reaches the browser: it is read here, from an environment
   variable without the NEXT_PUBLIC_ prefix, and sent only to OpenAI. */
/* Forgiving about the usual slip-ups: the name in any case, with or without the underscores (OPENAI_API_KEY,
   OPEN_API_KEY, openai_api_key, OPENAI_KEY), and a value pasted with quotes, spaces or a leading "NAME=". */
const NAME = /^open_?(ai_?)?(api_?)?key$/i;
const KEY = () => {
  const raw = process.env.OPENAI_API_KEY ?? Object.entries(process.env).find(([k, v]) => NAME.test(k) && v)?.[1] ?? '';
  return raw.trim().replace(/^[A-Za-z_]+\s*=\s*/, '').replace(/^["'`]+|["'`]+$/g, '').trim();
};
const BASE = () => process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'; // override only for local tests
export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
export const aiConfigured = () => KEY().length > 0;

export type AiErrorKind = 'config' | 'key' | 'quota' | 'rate_limited' | 'upstream' | 'refused';
export class AiError extends Error {
  /* `code` is OpenAI's own reason (e.g. invalid_api_key); safe to show, it never contains the key. */
  constructor(public kind: AiErrorKind, message: string, public code?: string) { super(message); }
}

/* One chat completion whose reply must match `schema` (OpenAI structured outputs). Returns the parsed object. */
export async function chatJson<T>(system: string, user: string, name: string, schema: object): Promise<T> {
  if (!aiConfigured()) throw new AiError('config', 'No OpenAI key on this server');
  const reasoning = /^(gpt-5|o\d)/.test(AI_MODEL);
  let res: Response;
  try {
    res = await fetch(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        max_completion_tokens: 6000,
        ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0.7 }),
      }),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });
  } catch {
    throw new AiError('upstream', 'OpenAI did not answer in time');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { code?: string; type?: string } };
    const code = (body.error?.code || body.error?.type || `http_${res.status}`).replace(/[^\w.-]/g, '').slice(0, 60);
    if (res.status === 401 || res.status === 403) throw new AiError('key', 'OpenAI rejected the key', code);
    if (res.status === 429) throw new AiError(body.error?.code === 'insufficient_quota' ? 'quota' : 'rate_limited', 'OpenAI limit reached', code);
    throw new AiError('upstream', `OpenAI ${res.status}`, code);
  }
  const data = await res.json() as { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] };
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new AiError('refused', 'The model declined');
  if (!msg?.content) throw new AiError('upstream', `Empty reply (${data.choices?.[0]?.finish_reason ?? 'unknown'})`);
  try { return JSON.parse(msg.content) as T; } catch { throw new AiError('upstream', 'Reply was not valid JSON'); }
}
