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
/* OpenAI by default. Keys from other OpenAI-compatible providers (gateways that resell many companies' models)
   only work on that provider's own address, set as OPENAI_BASE_URL. Pasted variations are tidied: a trailing
   slash or "/chat/completions" is dropped, and a bare host gets the usual "/v1". */
const BASE = () => {
  const raw = (process.env.OPENAI_BASE_URL || '').trim().replace(/^["'`]+|["'`]+$/g, '');
  if (!raw) return 'https://api.openai.com/v1';
  const url = raw.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  try { return new URL(url).pathname === '/' ? `${url}/v1` : url; } catch { return url; }
};
export const AI_PROVIDER = (() => { try { return new URL(BASE()).hostname.replace(/^api\./, ''); } catch { return 'AI provider'; } })();
export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
export const aiConfigured = () => KEY().length > 0;

export type AiErrorKind = 'config' | 'key' | 'quota' | 'rate_limited' | 'upstream' | 'refused';
export class AiError extends Error {
  /* `code` is OpenAI's own reason (e.g. invalid_api_key); safe to show, it never contains the key. */
  constructor(public kind: AiErrorKind, message: string, public code?: string) { super(message); }
}

/* One chat completion whose reply must match `schema`. OpenAI itself takes strict structured outputs; some
   compatible providers don't, so a rejected request is retried with plain JSON mode, then with the schema in the
   prompt only. Every reply is checked by the caller either way. */
export async function chatJson<T>(system: string, user: string, name: string, schema: object): Promise<T> {
  if (!aiConfigured()) throw new AiError('config', 'No AI key on this server');
  const reasoning = /^(gpt-5|o\d)/.test(AI_MODEL);
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  const inPrompt = [{ role: 'system', content: `${system}\nReply with only a JSON object (no prose, no code fences) that matches this JSON Schema:\n${JSON.stringify(schema)}` }, { role: 'user', content: user }];
  const attempts = [
    { model: AI_MODEL, messages, response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }, max_completion_tokens: 6000, ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0.7 }) },
    { model: AI_MODEL, messages: inPrompt, response_format: { type: 'json_object' }, max_tokens: 4000 },
    { model: AI_MODEL, messages: inPrompt, max_tokens: 4000 },
  ];
  let last: AiError | null = null;
  for (const body of attempts) {
    let res: Response;
    try {
      res = await fetch(`${BASE()}/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(45_000), cache: 'no-store',
      });
    } catch {
      throw new AiError('upstream', 'The AI service did not answer in time');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { code?: string | number; type?: string } };
      const code = String(err.error?.code || err.error?.type || `http_${res.status}`).replace(/[^\w.-]/g, '').slice(0, 60);
      if (res.status === 401 || res.status === 403) throw new AiError('key', 'The AI service rejected the key', code);
      if (res.status === 429) throw new AiError(err.error?.code === 'insufficient_quota' ? 'quota' : 'rate_limited', 'AI limit reached', code);
      last = new AiError('upstream', `AI service ${res.status}`, code);
      if (res.status === 400 || res.status === 404 || res.status === 422) continue; // try a simpler request shape
      throw last;
    }
    const data = await res.json().catch(() => null) as { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] } | null;
    const msg = data?.choices?.[0]?.message;
    if (msg?.refusal) throw new AiError('refused', 'The model declined');
    if (!msg?.content) { last = new AiError('upstream', `Empty reply (${data?.choices?.[0]?.finish_reason ?? 'unknown'})`, 'empty_reply'); continue; }
    const parsed = parseJsonReply<T>(msg.content);
    if (parsed) return parsed;
    last = new AiError('upstream', 'Reply was not valid JSON', 'not_json');
  }
  throw last ?? new AiError('upstream', 'No usable reply');
}

/* Accepts a bare JSON object, or one wrapped in code fences or a sentence. */
function parseJsonReply<T>(text: string): T | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t) as T; } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) as T; } catch {} }
  return null;
}

/* ---- Chat with tools, streamed (Mo) ---- */
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string };
export interface ToolSpec { type: 'function'; function: { name: string; description: string; parameters: object } }
export interface ToolCall { id: string; name: string; args: string }

/* One model turn. Text is passed to `onText` as it streams; tool calls are collected and returned whole.
   Providers that refuse streaming get the same request without it. */
export async function chatTurn(messages: ChatMessage[], tools: ToolSpec[], onText: (d: string) => void, signal?: AbortSignal):
  Promise<{ content: string; calls: ToolCall[]; tokens: number }> {
  if (!aiConfigured()) throw new AiError('config', 'No AI key on this server');
  const reasoning = /^(gpt-5|o\d)/.test(AI_MODEL);
  const base = { model: AI_MODEL, messages, tools, tool_choice: 'auto', max_completion_tokens: 1800, ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0.4 }) };
  for (const stream of [true, false]) {
    let res: Response;
    try {
      res = await fetch(`${BASE()}/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(stream ? { ...base, stream: true, stream_options: { include_usage: true } } : base),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000), cache: 'no-store',
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new AiError('upstream', 'The AI service did not answer in time');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { code?: string | number; type?: string } };
      const code = String(err.error?.code || err.error?.type || `http_${res.status}`).replace(/[^\w.-]/g, '').slice(0, 60);
      if (res.status === 401 || res.status === 403) throw new AiError('key', 'The AI service rejected the key', code);
      if (res.status === 429) throw new AiError(err.error?.code === 'insufficient_quota' ? 'quota' : 'rate_limited', 'AI limit reached', code);
      if (stream && (res.status === 400 || res.status === 422)) continue;
      throw new AiError('upstream', `AI service ${res.status}`, code);
    }
    if (!stream) {
      const data = await res.json().catch(() => null) as { choices?: { message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]; usage?: { total_tokens?: number } } | null;
      const msg = data?.choices?.[0]?.message;
      if (msg?.content) onText(msg.content);
      return { content: msg?.content ?? '', calls: (msg?.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function.name, args: c.function.arguments })), tokens: data?.usage?.total_tokens ?? 0 };
    }
    let content = '', tokens = 0, buf = '';
    const calls: { id: string; name: string; args: string }[] = [];
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        let chunk: { choices?: { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[]; usage?: { total_tokens?: number } };
        try { chunk = JSON.parse(payload); } catch { continue; }
        if (chunk.usage?.total_tokens) tokens = chunk.usage.total_tokens;
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) { content += delta.content; onText(delta.content); }
        for (const tc of delta?.tool_calls ?? []) {
          const c = (calls[tc.index] ??= { id: '', name: '', args: '' });
          if (tc.id) c.id = tc.id;
          if (tc.function?.name) c.name += tc.function.name;
          if (tc.function?.arguments) c.args += tc.function.arguments;
        }
      }
    }
    return { content, calls: calls.filter(Boolean).map((c, i) => ({ id: c.id || `call_${i}`, name: c.name, args: c.args })), tokens };
  }
  throw new AiError('upstream', 'No usable reply');
}
