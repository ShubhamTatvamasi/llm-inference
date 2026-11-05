/* A real (tiny) byte-level BPE tokenizer, trained in the browser on a small
   embedded English + code corpus. Used by the tokenization chapter diagrams. */

export const CORPUS = `The model reads your prompt as a list of tokens. Each token is a small piece of text: a whole word, part of a word, a number, or a single byte.
When the server receives a request, the tokenizer turns the text into token IDs, the model predicts the next token, and the detokenizer turns new tokens back into text.
The longer the prompt, the more tokens the model has to process before the first token comes out. The more tokens it generates, the longer the request takes.
Serving engines count everything in tokens: the context length, the batch size, the cache size, the price, and the speed of the stream.
In the beginning there were characters, and characters were too many. Then there were words, and words were too few. Tokens are the compromise in between.
A good tokenizer gives common words a single token and still handles rare words by splitting them into smaller pieces that the model has seen before.
They thought that the thing they wanted was there, and then they saw that it was not.
This is the reason the information in the training data matters: what appears often becomes one token; what appears rarely becomes many.
We are serving the model, sending the tokens, streaming the text, and counting the time to the first token and the time per output token.
def generate(prompt, max_tokens=128):
    tokens = tokenizer.encode(prompt)
    for step in range(max_tokens):
        logits = model.forward(tokens)
        next_token = sample(logits, temperature=0.7)
        tokens.append(next_token)
        if next_token == tokenizer.eos_token_id:
            break
    return tokenizer.decode(tokens)
for i in range(10): print(i, i * 2, i * 3)
{"role": "user", "content": "What is the capital of France?"}
{"role": "assistant", "content": "The capital of France is Paris."}
1, 2, 3, 10, 20, 30, 100, 200, 300, 1000, 2024, 2025, 2026
`;

const PRETOK = /'(?:s|t|re|ve|m|ll|d)| ?[\p{L}\p{M}]+| ?\p{N}{1,3}| ?[^\s\p{L}\p{M}\p{N}]+|\s+(?!\S)|\s+/gu;
const enc = new TextEncoder();

export function pretokenize(text: string): string[] {
  return text.match(PRETOK) ?? [];
}

export interface BPE {
  merges: [string, string][];      // in rank order; symbols are comma-joined byte strings
  rank: Map<string, number>;       // "a|b" -> rank
  id: Map<string, number>;         // symbol -> token id
}

export function train(corpus: string, nMerges: number): BPE {
  const counts = new Map<string, number>();
  for (const w of pretokenize(corpus)) {
    const k = [...enc.encode(w)].map(String).join(' ');
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const words = [...counts].map(([k, c]) => ({ syms: k.split(' '), c }));
  const merges: [string, string][] = [];
  for (let m = 0; m < nMerges; m++) {
    const pc = new Map<string, number>();
    for (const w of words) for (let i = 0; i < w.syms.length - 1; i++) {
      const p = w.syms[i] + '|' + w.syms[i + 1];
      pc.set(p, (pc.get(p) ?? 0) + w.c);
    }
    let best = ''; let bc = 1;
    for (const [p, c] of pc) if (c > bc) { best = p; bc = c; }
    if (!best) break;
    const [a, b] = best.split('|');
    merges.push([a, b]);
    for (const w of words) w.syms = applyMerge(w.syms, a, b);
  }
  const rank = new Map<string, number>();
  const id = new Map<string, number>();
  for (let i = 0; i < 256; i++) id.set(String(i), i);
  merges.forEach(([a, b], i) => { rank.set(a + '|' + b, i); id.set(a + ',' + b, 256 + i); });
  return { merges, rank, id };
}

export function applyMerge(syms: string[], a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < syms.length; i++) {
    if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) { out.push(a + ',' + b); i++; }
    else out.push(syms[i]);
  }
  return out;
}

/** Initial state: each pre-token split into raw bytes. */
export function initial(text: string): string[][] {
  return pretokenize(text).map((w) => [...enc.encode(w)].map(String));
}

/** Find the lowest-rank merge present anywhere; returns rank or -1. */
export function nextMerge(state: string[][], bpe: BPE, maxRank = Infinity): number {
  let best = Infinity;
  for (const w of state) for (let i = 0; i < w.length - 1; i++) {
    const r = bpe.rank.get(w[i] + '|' + w[i + 1]);
    if (r !== undefined && r < best && r < maxRank) best = r;
  }
  return best === Infinity ? -1 : best;
}

export function applyRank(state: string[][], bpe: BPE, r: number) {
  const [a, b] = bpe.merges[r];
  let n = 0;
  const next = state.map((w) => { const o = applyMerge(w, a, b); n += w.length - o.length; return o; });
  return { state: next, count: n };
}

export function encodeFull(text: string, bpe: BPE, maxRank = Infinity): string[] {
  let st = initial(text);
  for (;;) { const r = nextMerge(st, bpe, maxRank); if (r < 0) break; st = applyRank(st, bpe, r).state; }
  return st.flat();
}

export const symBytes = (sym: string) => sym.split(',').map(Number);

const strictDec = new TextDecoder('utf-8', { fatal: true });
/** Human-readable label for a token: decoded text if valid UTF-8, else hex bytes. */
export function label(sym: string): string {
  const bytes = new Uint8Array(symBytes(sym));
  try {
    return strictDec.decode(bytes).replace(/ /g, '␣').replace(/\n/g, '↵').replace(/\t/g, '⇥');
  } catch {
    return [...bytes].map((b) => '\\x' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
  }
}

let cached: BPE | null = null;
let cachedN = -1;
export function getBPE(n = 400): BPE {
  if (!cached || cachedN !== n) { cached = train(CORPUS, n); cachedN = n; }
  return cached;
}
