/* Cheat sheet: formulas and numbers worth memorising, each taken from the chapter in `ch`.
   `tex` is KaTeX (rendered at build time; a bad expression fails the build). Other fields are plain text. */
export interface CheatFormula {
  name: string;      // short label, e.g. 'KV cache per token'
  tex: string;       // KaTeX source, display style, no surrounding $$
  vars?: string;     // plain-text legend for the symbols, one short line
  example?: string;  // plain-text worked example with real numbers from the chapter
  ch: string;        // chapter slug
}
export interface CheatNumber {
  label: string;     // what it is, e.g. 'H100 HBM bandwidth'
  value: string;     // e.g. '3.35 TB/s'
  note?: string;     // one short plain-text line on why it matters
  ch: string;
}
export interface CheatSection { id: string; title: string; blurb: string; formulas: CheatFormula[]; numbers: CheatNumber[] }

export const cheatsheet: CheatSection[] = [
  // ───────────────────────────── 1. The model
  {
    id: 'model',
    title: 'The model',
    blurb: 'Tokens, attention, one decoder layer, and the FLOP count every estimate starts from.',
    formulas: [
      {
        name: 'Scaled dot-product attention',
        tex: String.raw`\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d_k}} + M\right) V`,
        vars: 'M = causal mask: 0 where a token may look, −∞ where it may not; d_k = key dimension',
        ch: 'attention',
      },
      {
        name: 'One decoder layer (pre-norm residual, twice)',
        tex: String.raw`h = x + \text{Attention}(\text{RMSNorm}(x)), \qquad x' = h + \text{MLP}(\text{RMSNorm}(h))`,
        vars: 'x = residual stream of shape [n, d_model]; the layer repeats L times, then a final norm and the LM head',
        ch: 'transformer',
      },
      {
        name: 'FLOPs per token',
        tex: String.raw`\text{FLOPs per token} \approx 2 \times N_\text{active} + 4 \, L \, n \, d_\text{attn}`,
        vars: 'N_active = active parameters; L = layers; n = cached tokens attended over; the 2 is one multiply plus one add per weight',
        example: '8B model: 2 × 8e9 = 16 GFLOPs per token, against about 16 GB of weights read: roughly 1 FLOP per byte',
        ch: 'transformer',
      },
      {
        name: 'Softmax with temperature',
        tex: String.raw`p_i = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}`,
        vars: 'z = logits; T → 0 is greedy, T = 1 is the model’s own distribution, T > 1 is flatter',
        ch: 'sampling',
      },
      {
        name: 'RoPE frequencies',
        tex: String.raw`\theta_i = \text{base}^{-2i/d_\text{head}}, \qquad i = 0, 1, \dots, \frac{d_\text{head}}{2} - 1`,
        vars: 'pair i of a token at position m is rotated by m × θ_i; scores then depend only on the distance between positions',
        example: 'd_head = 128 gives 64 pairs; Llama 3 uses base 500,000',
        ch: 'embeddings',
      },
    ],
    numbers: [
      { label: 'Vocabulary size', value: 'about 128K (Llama 3), about 150K (Qwen3)', note: 'One logit per vocabulary entry is produced for every generated token.', ch: 'tokenization' },
      { label: 'English text per token', value: 'about 4 characters, or 0.75 words', note: 'For a modern ~128K vocabulary; code, JSON, other languages and numbers cost more.', ch: 'tokenization' },
      { label: 'Llama 3.1 layer count', value: '32 layers (8B), 80 layers (70B)', note: 'The same decoder layer applied L times, each with its own weights.', ch: 'transformer' },
      { label: 'Llama 3.1 8B attention heads', value: '32 query heads, d_head = 128', note: 'Llama 3 uses 8 KV heads for 32 or 64 query heads (GQA).', ch: 'attention' },
      { label: 'Llama 3.1 8B embedding table', value: '128,256 × 4,096 ≈ 525M parameters, about 1 GB in BF16', note: 'Around 6.5% of the model; a lookup (gather), not a matmul.', ch: 'embeddings' },
      { label: 'Where the parameters are (dense LLM)', value: 'MLPs: about two thirds', note: 'Attention projections take most of the rest; embeddings plus LM head a few percent.', ch: 'transformer' },
    ],
  },

  // ───────────────────────────── 2. Memory
  {
    id: 'memory',
    title: 'Memory: weights and KV cache',
    blurb: 'Weights are paid once; KV cache is paid per request, per token, and caps concurrency.',
    formulas: [
      {
        name: 'KV cache per token',
        tex: String.raw`\text{KV bytes/token} = 2 \times n_\text{layers} \times n_\text{kv heads} \times d_\text{head} \times \text{bytes per element}`,
        vars: 'the 2 is K and V; n_kv heads = KV heads (not query heads); bytes per element = 2 in BF16',
        example: 'Llama 3.1 8B in BF16: 2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KiB per token',
        ch: 'kv-cache',
      },
      {
        name: 'Weight memory',
        tex: String.raw`\text{weight bytes} = N_\text{params} \times \text{bytes per weight}`,
        example: '14B model in BF16: 14B × 2 B = 28 GB',
        ch: 'capacity-planning',
      },
      {
        name: 'Max concurrent sequences (memory ceiling)',
        tex: String.raw`\text{max sequences} \approx \frac{\text{memory budget} - \text{weights} - \text{runtime overhead}}{\text{KV bytes/token} \times \text{context tokens}}`,
        vars: 'memory budget = gpu_memory_utilization × VRAM; everything left after weights and overhead becomes KV blocks',
        example: '80 × 0.9 = 72 GB; minus 28 GB weights and 3–4 GB overhead leaves ~40 GB; at 160 KiB/token ≈ 250k tokens ≈ 60 conversations at 4k',
        ch: 'capacity-planning',
      },
    ],
    numbers: [
      { label: 'Llama 3.1 8B KV cache (BF16)', value: '128 KiB per token', note: 'One 8K-token conversation needs 1 GiB.', ch: 'kv-cache' },
      { label: 'Llama 3.1 70B KV cache (BF16)', value: '320 KiB per token', note: 'An 8K-token prompt produces 2.5 GiB.', ch: 'disaggregation' },
      { label: '8B model weights in BF16', value: '16 GB', note: 'All of it crosses the HBM bus for every decode step.', ch: 'gpu' },
      { label: 'Llama 3.1 70B weights in BF16', value: '141 GB', note: 'An H100 has 80 GB, so it needs more than one GPU.', ch: 'parallelism' },
      { label: 'GQA vs MHA cache size', value: '4–16× smaller', note: 'Groups of query heads share one K/V head; tiny quality cost, now standard.', ch: 'kv-cache' },
      { label: 'MLA cache size', value: '~4× smaller than GQA-8, ~50× smaller than MHA', note: 'Caches one compressed latent instead of K and V.', ch: 'kv-cache' },
      { label: 'gpu-memory-utilization', value: '0.90–0.95', note: 'As high as is stable, so KV gets everything left over.', ch: 'serving-stack' },
    ],
  },

  // ───────────────────────────── 3. Speed
  {
    id: 'speed',
    title: 'Speed: bandwidth, FLOPs and the roofline',
    blurb: 'Decode is bound by bytes read per step, prefill by FLOPs; the ridge point says which one applies.',
    formulas: [
      {
        name: 'Decode step time bound',
        tex: String.raw`t_\text{step} \ge \frac{\text{bytes of weights read}}{\text{memory bandwidth}} \qquad \Rightarrow \qquad \text{tok/s per sequence} \le \frac{\text{bandwidth}}{\text{weight bytes}}`,
        vars: 'decode must read every weight once per step, whatever the batch size',
        example: '8B in BF16 on H100: 16 GB ÷ 3.35 TB/s ≈ 4.8 ms, so about 200 tok/s for one stream, nearer 160 at realistic bandwidth utilisation',
        ch: 'gpu',
      },
      {
        name: 'Decode step time with KV cache',
        tex: String.raw`t_\text{step} \approx \frac{\text{weight bytes} + \sum_\text{seqs} \text{KV bytes}}{\text{memory bandwidth}}`,
        vars: 'the weight term is shared by the whole batch; only the KV term grows with batch size and context',
        ch: 'batching',
      },
      {
        name: 'Arithmetic intensity',
        tex: String.raw`I = \frac{\text{FLOPs performed}}{\text{bytes moved to/from HBM}}`,
        vars: 'I in FLOP/byte',
        ch: 'roofline',
      },
      {
        name: 'Roofline: attainable throughput',
        tex: String.raw`\text{attainable FLOP/s} = \min(P, \; B \times I)`,
        vars: 'P = peak compute (FLOP/s); B = memory bandwidth (byte/s); I = arithmetic intensity',
        ch: 'roofline',
      },
      {
        name: 'Ridge point',
        tex: String.raw`I^{\star} = \frac{P}{B}`,
        vars: 'below the ridge an operation is memory-bound, above it compute-bound',
        example: 'H100 in BF16: 989 TFLOPS ÷ 3.35 TB/s ≈ 295 FLOPs per byte',
        ch: 'roofline',
      },
      {
        name: 'Decode matmul intensity = batch size',
        tex: String.raw`I_\text{decode} \approx \frac{2 b d^2}{2 d^2} = b \quad \text{(BF16)}, \qquad I_\text{decode} \approx 2b \quad \text{(FP8)}`,
        vars: 'b = sequences decoding together (or prompt tokens, for prefill); d = hidden size',
        example: 'Batch 32 in BF16 ≈ 32 FLOP/byte against an H100 ridge of about 295: memory-bound, tensor cores at most about 11% busy',
        ch: 'roofline',
      },
      {
        name: 'Decode attention intensity',
        tex: String.raw`I_\text{attn} \approx \frac{2g}{\text{bytes per element}}`,
        vars: 'g = query heads sharing each K/V head; batching does not change it because every sequence brings its own cache',
        example: 'g = 4 in BF16 gives I ≈ 4',
        ch: 'roofline',
      },
      {
        name: 'Prefill cost',
        tex: String.raw`\text{prefill FLOPs} \approx 2 \times N_\text{params} \times n_\text{prompt}`,
        vars: 'divide by achieved FLOP/s for time; a quadratic attention term is added for long prompts',
        example: '4,000-token prompt, 8B model, one H100: 2 × 8×10⁹ × 4,000 = 6.4×10¹³ FLOPs; at about 55% of 989 TFLOPS that is roughly 120 ms',
        ch: 'prefill-decode',
      },
      {
        name: 'MBU and MFU',
        tex: String.raw`\text{MBU} = \frac{\text{achieved bytes/s}}{\text{peak bandwidth}}, \qquad \text{MFU} = \frac{\text{achieved FLOPs/s}}{\text{peak FLOPs}}`,
        vars: 'judge decode by MBU and prefill or large-batch work by MFU',
        example: 'Good decode kernels reach about 80% MBU; a decode MFU of 1% is expected, not a bug',
        ch: 'gpu',
      },
    ],
    numbers: [
      { label: 'H100 SXM BF16 compute', value: 'about 989 TFLOPS', note: 'The compute roof of the roofline.', ch: 'gpu' },
      { label: 'H100 HBM bandwidth', value: '3.35 TB/s', note: 'Sets single-stream decode speed.', ch: 'gpu' },
      { label: 'H100 ridge point (BF16)', value: '≈ 295 FLOPs per byte', note: 'Roughly 300 sequences must decode together before matmuls become compute-bound.', ch: 'roofline' },
      { label: 'Batch-1 decode intensity', value: 'about one FLOP per byte', note: 'An H100 needs around 300 FLOPs per byte to keep its tensor cores busy.', ch: 'transformer' },
      { label: 'H200 vs H100', value: '4.8 vs 3.35 TB/s (about 1.43×), 141 GB, same compute', note: 'Memory-bound decode gets faster; compute-bound prefill barely changes.', ch: 'gpu' },
      { label: 'Ridge at each chip’s best precision', value: 'A100 BF16 ~150, H100 FP8 ~590, B200 FP4 ~1,100, Rubin FP4 ~1,800 FLOPs per byte', note: 'The batch needed to saturate the tensor cores keeps growing.', ch: 'roofline' },
      { label: 'Achieved bandwidth (MBU)', value: '70–90% of peak', note: 'What real memory-bound kernels reach.', ch: 'gpu' },
      { label: 'FlashAttention vs naive attention', value: '2–4× faster, O(N) extra memory', note: 'Exact, not an approximation: same FLOPs, far fewer bytes moved.', ch: 'flash-attention' },
      { label: 'CUDA graphs on small-batch decode', value: 'commonly 1.5–3×', note: 'Eager frameworks add 10–30 µs of Python and dispatcher overhead per op.', ch: 'kernels' },
    ],
  },

  // ───────────────────────────── 4. Engine
  {
    id: 'engine',
    title: 'The engine: batching, paging, caching, scheduling',
    blurb: 'How one engine keeps many sequences in every step without wasting KV memory or stalling streams.',
    formulas: [
      {
        name: 'Useful slot-time in a locked batch',
        tex: String.raw`\text{useful} = \frac{\text{mean}(L_1, \dots, L_B)}{\max(L_1, \dots, L_B)}`,
        vars: 'L_i = output length of request i; depends on the spread of lengths, not their scale',
        ch: 'batching',
      },
      {
        name: 'PagedAttention block lookup',
        tex: String.raw`\text{physical block} = \text{block table}[\lfloor t / B \rfloor], \qquad \text{slot} = t \bmod B`,
        vars: 't = token position; B = block size in tokens; waste is at most B − 1 slots per sequence',
        ch: 'paged-attention',
      },
      {
        name: 'Prefix-cache block hash (chained)',
        tex: String.raw`h_i = \text{hash}(h_{i-1}, \; \text{tokens in block } i, \; \text{extra keys})`,
        vars: 'extra keys = anything else that changes K/V, such as a LoRA adapter id or multimodal inputs',
        ch: 'prefix-caching',
      },
      {
        name: 'Chunked prefill token budget',
        tex: String.raw`\text{chunk} = \text{budget} - n_\text{decoding}, \qquad \text{iterations to prefill} = \left\lceil \frac{\text{prompt length}}{\text{chunk}} \right\rceil`,
        vars: 'budget = max_num_batched_tokens; n_decoding = running decode sequences, which are served first',
        ch: 'chunked-prefill',
      },
      {
        name: 'KV offload: reload vs recompute',
        tex: String.raw`\frac{\text{tokens} \times \text{KV bytes/token}}{\text{tier bandwidth}} \quad \text{vs.} \quad \frac{2 P N + 2 L N^2 H d}{\text{GPU FLOP/s} \times \text{MFU}}`,
        vars: 'left = reload time from a slower tier; right = recompute the prefill; reload grows linearly, recompute faster than linearly',
        ch: 'scheduler',
      },
    ],
    numbers: [
      { label: 'Default KV block size', value: '16 tokens', note: 'Keeps tail waste under a few percent; some backends prefer 32, 64 or larger.', ch: 'paged-attention' },
      { label: 'KV memory holding real tokens, contiguous allocation', value: '20–40%', note: 'Measured on early systems that reserved max-length buffers.', ch: 'paged-attention' },
      { label: 'KV utilization with paging', value: 'above 95%', note: 'Waste is limited to the last, partially filled block of each sequence.', ch: 'paged-attention' },
      { label: 'Prefix caching default', value: 'On (vLLM automatic prefix caching and SGLang RadixAttention)', note: 'Only full blocks are cached; matching is exact and positional.', ch: 'prefix-caching' },
      { label: 'Chunked prefill budget vs stream stall', value: 'no chunking: 400+ ms freeze; 2048: ~150 ms hiccups; 512: gaps under ~45 ms', note: 'Smaller budget: smoother ITL, later first token for the long prompt.', ch: 'chunked-prefill' },
      { label: 'Token budget for interactive chat', value: 'low thousands of tokens', note: 'Tune against p99 ITL and p95 TTFT on your own traffic.', ch: 'chunked-prefill' },
      { label: 'kv_cache_dtype FP8', value: 'roughly 2× KV capacity', note: 'Possible accuracy cost.', ch: 'scheduler' },
    ],
  },

  // ───────────────────────────── 5. Faster & cheaper
  {
    id: 'faster',
    title: 'Faster and cheaper',
    blurb: 'Speculative decoding, quantization, constrained output and LoRA, with the arithmetic behind each.',
    formulas: [
      {
        name: 'Speculative decoding: acceptance rule',
        tex: String.raw`P(\text{accept } x) = \min\left(1, \frac{p(x)}{q(x)}\right)`,
        vars: 'p = target distribution; q = draft distribution; on rejection, resample from the residual max(0, p − q), renormalised',
        ch: 'speculative-decoding',
      },
      {
        name: 'Expected tokens per target pass',
        tex: String.raw`\mathbb{E}[\text{tokens}] = \frac{1 - \alpha^{k+1}}{1 - \alpha}`,
        vars: 'α = probability a draft token is accepted (overlap of p and q); k = draft length',
        example: 'α = 0.8 and k = 4 gives about 3.4 tokens per pass',
        ch: 'speculative-decoding',
      },
      {
        name: 'Speculative decoding speedup (batch 1)',
        tex: String.raw`\text{speedup} \approx \frac{\mathbb{E}[\text{tokens}]}{1 + k \, c}`,
        vars: 'c = cost of one draft step as a fraction of a target step',
        example: 'α = 0.7, k = 4: (1 − 0.7⁵) / (1 − 0.7) ≈ 2.77 tokens; drafter at 5% of a target step: 2.77 / (1 + 4 × 0.05) ≈ 2.3×',
        ch: 'speculative-decoding',
      },
      {
        name: 'Integer quantization with a scale',
        tex: String.raw`q = \text{round}\left(\frac{w}{s}\right), \qquad s = \frac{\max |w|}{2^{b-1} - 1}, \qquad \hat{w} = q \cdot s`,
        vars: 'w = weights sharing one scale; b = bits; s = scale set by the absmax, so one outlier stretches the grid',
        ch: 'quantization',
      },
      {
        name: 'Constrained decoding: mask the logits',
        tex: String.raw`\tilde{z}_i = z_i \ \text{if output + token}_i \text{ is a valid prefix, else } -\infty, \qquad p = \text{softmax}(\tilde{z} / T)`,
        vars: 'guarantees every prefix is valid, not that the output is finished or correct',
        ch: 'structured-output',
      },
      {
        name: 'LoRA',
        tex: String.raw`W' = W + \frac{\alpha}{r} B A, \qquad y = x W^\top + \frac{\alpha}{r} (x A^\top) B^\top`,
        vars: 'W frozen, d_out × d_in; A is r × d_in; B is d_out × r; r much smaller than d; W′ is never formed at inference',
        ch: 'multi-lora',
      },
      {
        name: 'LoRA adapter size',
        tex: String.raw`\frac{\text{adapter params}}{\text{matrix params}} = \frac{2 r d}{d^2}`,
        vars: 'for a d × d matrix: r·2d parameters instead of d²',
        example: 'r = 16 and d = 4096: about 0.8% of the matrix',
        ch: 'multi-lora',
      },
    ],
    numbers: [
      { label: 'Draft length k in most deployments', value: 'between 2 and 6', note: 'Longer drafts help only while α is high.', ch: 'speculative-decoding' },
      { label: 'Acceptance rate α by workload', value: 'above 0.8 for code completion and structured extraction; near 0.5 for creative chat', note: 'Measure acceptance rate and mean accepted length in production.', ch: 'speculative-decoding' },
      { label: 'BF16 bit layout (S/E/M)', value: '1 / 8 / 7', note: 'Keeps FP32’s 8-bit exponent, so the same range.', ch: 'quantization' },
      { label: 'FP8 E4M3 bit layout and max', value: '1 / 4 / 3, max 448', note: 'Inference weights and activations.', ch: 'quantization' },
      { label: 'Scale granularity for 4-bit weights', value: 'one scale per group of 32–128 weights', note: 'An FP16 scale per 128 weights costs 0.125 bits per weight.', ch: 'quantization' },
      { label: 'Low-precision tensor-core rate', value: '2× (8-bit) or 4× (4-bit) the BF16 rate', note: 'Only when both weights and activations are low precision (W8A8, W4A4).', ch: 'quantization' },
      { label: 'FP8 KV cache', value: 'halves cache memory per token', note: 'Roughly twice the concurrent sequences or context; risk is long-context accuracy.', ch: 'quantization' },
      { label: 'Typical LoRA rank', value: 'r = 8–64', note: 'A whole-model adapter is often tens of MB.', ch: 'multi-lora' },
      { label: 'Multi-LoRA decode overhead', value: 'single-digit-percent slower than the plain base model', note: 'A cold adapter miss adds hundreds of milliseconds to TTFT.', ch: 'multi-lora' },
    ],
  },

  // ───────────────────────────── 6. Scaling out
  {
    id: 'scale',
    title: 'Scaling out: links, collectives, TP / PP / EP',
    blurb: 'Which wire the bytes cross decides whether communication costs microseconds or the whole step.',
    formulas: [
      {
        name: 'α–β transfer model',
        tex: String.raw`T(S) = \alpha + \frac{S}{\beta}`,
        vars: 'S = message size; β = link bandwidth; α = fixed latency per message; messages much smaller than α·β are latency-bound',
        ch: 'interconnects',
      },
      {
        name: 'Ring all-reduce cost',
        tex: String.raw`T_\text{ring} = 2(N-1) \, \alpha + \frac{2(N-1)}{N} \cdot \frac{S}{\beta}`,
        vars: 'N = GPUs; 2(N−1) steps each moving S/N; the latency term grows linearly with N, the bandwidth term barely changes',
        example: '70B at TP = 8: 160 all-reduces per decode step, each about 14 ring steps; with α around 1.5 µs that is ~3 ms of pure latency per token',
        ch: 'interconnects',
      },
      {
        name: 'Bus bandwidth (nccl-tests)',
        tex: String.raw`\text{busbw} = \text{algbw} \times \frac{2(N-1)}{N}`,
        vars: 'algbw = S ÷ time; the factor is the all-reduce traffic per GPU, so busbw compares directly with link bandwidth',
        ch: 'interconnects',
      },
      {
        name: 'All-reduces per TP decode step',
        tex: String.raw`\text{all-reduces per decode step} = 2 \times n_\text{layers}`,
        vars: 'one after attention and one after the MLP, in every layer, for every generated token',
        example: '80-layer 70B model: 160 per step; each message is batch × hidden × 2 bytes, about 0.5 MB for a batch of 32',
        ch: 'parallelism',
      },
      {
        name: 'TP decode step time (first order)',
        tex: String.raw`t_\text{step} \approx \frac{\text{weights} + \text{KV read per GPU}}{\text{HBM bandwidth}} + 2 \times n_\text{layers} \times t_\text{all-reduce}`,
        vars: 'with TP = n each GPU reads only 1/n of the weights, and the GPUs read in parallel',
        ch: 'parallelism',
      },
      {
        name: 'Pipeline bubble',
        tex: String.raw`\text{idle fraction} = \frac{P - 1}{M + P - 1}`,
        vars: 'P = pipeline stages; M = micro-batches in flight',
        ch: 'parallelism',
      },
      {
        name: 'MoE experts touched per step',
        tex: String.raw`\text{fraction of experts touched} \approx 1 - \left(1 - \frac{k}{E}\right)^{\text{batch}}`,
        vars: 'k = experts per token; E = experts per layer; assumes uniform routing',
        ch: 'moe',
      },
      {
        name: 'P/D disaggregation: KV transfer time',
        tex: String.raw`t_\text{transfer} \approx \frac{n_\text{prompt} \times \text{KV bytes/token}}{\text{link bandwidth}}`,
        example: '70B, 8K prompt: 320 KiB × 8,192 tokens ≈ 2.5 GiB; at ~50 GB/s (400 Gb/s RDMA) that is ~54 ms, against 150–300 ms of prefill',
        ch: 'disaggregation',
      },
    ],
    numbers: [
      { label: 'NVLink 5 (B200)', value: '1.8 TB/s (both directions)', note: '72 GPUs in one domain on GB200 NVL72.', ch: 'interconnects' },
      { label: 'NVLink 4 (H100 / H200)', value: '900 GB/s (both directions)', note: 'NVLink is quoted as the sum of both directions: 450 GB/s each way.', ch: 'interconnects' },
      { label: 'PCIe Gen5 x16', value: '~64 GB/s per direction', note: 'GPU to CPU, NIC and NVMe; Gen4 x16 is ~32 GB/s.', ch: 'interconnects' },
      { label: 'InfiniBand XDR / NDR', value: '800 / 400 Gb/s per NIC = ~100 / ~50 GB/s', note: 'Network links are quoted in bits; normalise before comparing.', ch: 'interconnects' },
      { label: 'H100 link ratios', value: 'HBM ≈ 7× NVLink; NVLink ≈ 9× a 400 Gb/s NIC and ≈ 7× PCIe Gen5', note: 'Keep frequent communication off the slow end of the ladder.', ch: 'interconnects' },
      { label: 'TP limit for Llama 3.1', value: '8 KV heads, so TP = 16 replicates KV heads', note: 'Standard layout: TP inside a node, PP or DP across nodes.', ch: 'parallelism' },
      { label: 'DeepSeek-V3 parameters', value: '671B total, about 37B used per token', note: 'Memory scales with total parameters, compute with active parameters.', ch: 'moe' },
      { label: 'Weight memory in BF16', value: 'Dense 70B ~141 GB; MoE 30B-A3B ~61 GB; MoE 671B-A37B ~1.3 TB (≈ 671 GB in FP8)', ch: 'moe' },
      { label: 'Prefill and decode pool sizing', value: 'below about 70–80% utilisation at peak', note: 'Decode concurrency = rate × output length × ITL.', ch: 'disaggregation' },
    ],
  },

  // ───────────────────────────── 7. Production
  {
    id: 'prod',
    title: 'Production: latency, goodput, capacity, cost',
    blurb: 'From SLOs and traffic to replicas and cost per million tokens.',
    formulas: [
      {
        name: 'TPOT from E2E and TTFT',
        tex: String.raw`\text{TPOT} = \frac{\text{E2E} - \text{TTFT}}{N_\text{out} - 1}`,
        vars: 'N_out = output tokens; TPOT is a per-request average, ITL is measured per gap',
        ch: 'metrics',
      },
      {
        name: 'End-to-end latency',
        tex: String.raw`\text{E2E} \approx \text{TTFT} + (N_\text{out} - 1) \cdot \text{TPOT}`,
        vars: 'TTFT ≈ queueing + prefill; TPOT ≈ one decode step',
        ch: 'metrics',
      },
      {
        name: 'Goodput',
        tex: String.raw`\text{goodput} = \frac{\text{requests with TTFT} \le \text{SLO}_\text{TTFT} \text{ and TPOT} \le \text{SLO}_\text{TPOT}}{\text{time window}}`,
        vars: 'the rate of requests that finished within every SLO; capacity is the knee of this curve, not peak throughput',
        ch: 'metrics',
      },
      {
        name: `Little's law`,
        tex: String.raw`L = \lambda \times W`,
        vars: 'L = average requests in flight; λ = arrival rate; W = average time each spends inside',
        example: '4 req/s with 10 s average E2E means about 40 requests in flight; at 24 per replica within SLO, 2 replicas before headroom',
        ch: 'metrics',
      },
      {
        name: 'Requests per second per replica',
        tex: String.raw`\text{req/s per replica} = \frac{1}{\dfrac{N_\text{out} \, t_\text{step}(B)}{B} + t_\text{prefill}}`,
        vars: 'B = batch; t_step(B) ≈ (weight bytes + B × average context × KV/token) ÷ HBM bandwidth; B is capped by memory and the TPOT SLO',
        ch: 'capacity-planning',
      },
      {
        name: 'Replica count',
        tex: String.raw`\text{replicas} = \left\lceil \frac{\lambda}{\text{req/s per replica} \times \text{target utilisation}} \right\rceil`,
        vars: 'λ = peak request rate; target utilisation is the headroom, e.g. 70% of the knee',
        ch: 'capacity-planning',
      },
      {
        name: 'Cost per million output tokens',
        tex: String.raw`\text{cost per M tokens} = \frac{\text{GPUs} \times \text{price per GPU-hour}}{\text{output tokens per hour} / 10^6}`,
        example: '2 GPUs at $2.50/h = $5/h; 1,500 output tok/s is 5.4M tokens/h, so about $0.93/M fully loaded, about $2.30/M at 40% utilisation',
        ch: 'capacity-planning',
      },
    ],
    numbers: [
      { label: 'Percentiles to report', value: 'p50, p95, p99', note: 'Prompt lengths vary by 100×, output lengths by 50×; averages hide the tail.', ch: 'metrics' },
      { label: 'Fleet percentile from replicas', value: 'histogram_quantile(0.95, sum by (le) (rate(...bucket[5m])))', note: 'Merge histogram buckets first; averaging per-replica p95s is wrong.', ch: 'metrics' },
      { label: 'Daily-cycle cost multiplier', value: '30–40% average utilisation makes effective cost 2.5–3× the peak-hour figure', note: 'Utilisation is the hidden multiplier on cost per token.', ch: 'capacity-planning' },
      { label: 'Requests per sweep point for a p99', value: 'at least a few hundred, ideally 1,000+', note: 'With 100 requests the p99 is just the slowest request.', ch: 'benchmarking' },
      { label: 'Typical ISL : OSL', value: 'chat ~3:1; RAG 10–20:1; summarisation 15–30:1; code completion 30–50:1; reasoning 1:5–10; agents 50+:1', ch: 'benchmarking' },
      { label: 'Routing to a replica that holds the prefix', value: 'can cut prefill work by 10×', note: 'One request can occupy a replica 1,000× longer than another.', ch: 'routing-autoscaling' },
      { label: 'Autoscaling signals', value: 'scale on KV-cache usage or queue depth; not CPU or headline GPU utilisation', note: 'vllm:kv_cache_usage_perc rises before vllm:num_requests_waiting does.', ch: 'routing-autoscaling' },
      { label: 'Eval size to resolve a 1-point change', value: 'on the order of 1,000+ paired examples per task', note: 'Gate per task, never on the average.', ch: 'quality-safety' },
    ],
  },

  // ───────────────────────────── 8. Kubernetes
  {
    id: 'k8s',
    title: 'Running on Kubernetes',
    blurb: 'GPU sharing, getting weights into HBM, and the signals worth knowing by heart.',
    formulas: [
      {
        name: 'Weight load time from a shared source',
        tex: String.raw`t_\text{load} \approx \frac{\text{checkpoint bytes}}{\text{bandwidth per replica}}, \qquad \text{bandwidth per replica} = \frac{\text{shared source bandwidth}}{\text{replicas starting together}}`,
        vars: 'shared sources (hub egress, NAT gateway, NFS filer) split their bandwidth; object stores and local disks barely change',
        example: '140 GB checkpoint: about 8 minutes from the internet, about 25 seconds from local NVMe; 20 replicas on a shared source are each roughly 20× slower',
        ch: 'model-loading',
      },
      {
        name: 'Startup probe budget',
        tex: String.raw`\text{failureThreshold} \times \text{periodSeconds} > \text{worst-case download} + \text{load} + \text{compile time}`,
        vars: 'readiness should pass only after warm-up; liveness should stay lenient under load',
        ch: 'serving-stack',
      },
      {
        name: 'Prefix-cache hit rate',
        tex: String.raw`\text{prefix hit rate} = \frac{\text{rate of prefix cache hits}}{\text{rate of prefix cache queries}}`,
        vars: 'vllm:prefix_cache_hits_total over vllm:prefix_cache_queries_total; a sudden drop means more prefill per request',
        ch: 'observability',
      },
    ],
    numbers: [
      { label: 'nvidia.com/gpu requests', value: 'integers only; 0.5 is rejected', note: 'Set in limits, never overcommitted, and all GPUs come from one node.', ch: 'gpus-on-kubernetes' },
      { label: 'MIG slices on H100, H200, B200', value: '7 compute slices and 8 memory slices', note: '3g.40gb = 3 compute slices and 40 GB of memory (4 memory slices).', ch: 'gpu-sharing' },
      { label: 'H100 80GB MIG profiles', value: '1g.10gb ×7, 1g.20gb ×4, 2g.20gb ×3, 3g.40gb ×2, 4g.40gb ×1, 7g.80gb', note: 'L4 and L40S do not support MIG.', ch: 'gpu-sharing' },
      { label: 'Choosing a sharing mechanism', value: 'MIG for isolation, MPS for throughput, time-slicing for convenience', ch: 'gpu-sharing' },
      { label: 'Xid codes: cordon and drain', value: '48 (double-bit ECC), 64 (row remap failure), 74 (NVLink), 79 (fallen off the bus), 95 (uncontained ECC)', ch: 'observability' },
      { label: 'Xid codes: check the application first', value: '13, 31 and 43', note: '119 and 120 (GSP) need a reset or reboot; 63 means schedule a reset; 45 follows another error.', ch: 'observability' },
      { label: 'DCGM_FI_DEV_GPU_UTIL', value: '% of time any kernel ran', note: 'Reads close to 100% at batch-1 decode while the tensor pipe is mostly idle.', ch: 'observability' },
      { label: 'DCGM roof metrics', value: 'DCGM_FI_PROF_DRAM_ACTIVE (memory roof), DCGM_FI_PROF_PIPE_TENSOR_ACTIVE (compute roof)', note: 'Decode lives at high DRAM activity and low tensor activity, and that is fine.', ch: 'observability' },
      { label: 'OOMKilled vs CUDA out of memory', value: 'OOMKilled: host memory cgroup, exit code 137, no traceback; CUDA OOM: GPU HBM, Python traceback', note: 'Different memory, different fixes.', ch: 'observability' },
    ],
  },

  // ───────────────────────────── 9. Beyond chat
  {
    id: 'beyond',
    title: 'Beyond chat: reasoning, agents, images, embeddings',
    blurb: 'Workloads that stress the same engine in different places.',
    formulas: [
      {
        name: 'Time to first answer token (reasoning)',
        tex: String.raw`\text{time to first answer token} = \text{TTFT} + n_\text{thinking} \times \text{ITL}`,
        vars: 'n_thinking = hidden thinking tokens; the engine’s TTFT only covers queueing and prefill',
        ch: 'reasoning-agents',
      },
      {
        name: 'Agent task latency',
        tex: String.raw`\text{task latency} \approx \text{turns} \times (\text{TTFT} + \text{short decode}) + \text{tool time}`,
        vars: 'with a warm prefix TTFT stays flat as the transcript grows; without one it grows every turn',
        ch: 'reasoning-agents',
      },
      {
        name: 'Video token budget',
        tex: String.raw`\text{tokens} = \text{frames} \times \text{tokens per frame} \; (+ \; \text{audio tokens})`,
        vars: 'tokens per frame are halved if pairs of consecutive frames are merged',
        example: 'Ten minutes at 1 fps with 360p frames is already about 90k tokens',
        ch: 'multimodal',
      },
      {
        name: 'Vector storage',
        tex: String.raw`\text{vector storage} = N \times \text{dims} \times \text{bytes per dim}`,
        vars: 'N = documents (or chunks); raw vectors, before any index',
        example: '100M documents × 1,024 dims × 4 bytes = 410 GB of float32 vectors',
        ch: 'embedding-serving',
      },
    ],
    numbers: [
      { label: 'Reasoning vs chat request shape', value: 'chat: 2,000 tokens in, 300 out; reasoning: 2,000 in, 8,000 out', note: 'Almost pure decode, with KV that keeps growing after admission.', ch: 'reasoning-agents' },
      { label: 'Model calls per agent task', value: '10–50', note: 'Each call re-sends the whole transcript; prefix caching and session routing decide latency.', ch: 'reasoning-agents' },
      { label: 'Tokens per image', value: '256 to over 16,000, depending on model and resolution settings', note: 'Image tokens prefill and take KV cache like any text.', ch: 'multimodal' },
      { label: 'Image token schemes', value: 'LLaVA-1.5 fixed 336 px: 576 tokens; InternVL-style 448 px tiles: 256 tokens each; Qwen2.5-VL: one token per 28×28 pixels', ch: 'multimodal' },
      { label: 'Reranker candidates', value: 'rerank 50, not 500', note: 'A cross-encoder runs one forward pass per (query, chunk) pair, so cost is linear in k.', ch: 'embedding-serving' },
      { label: 'Shrinking stored vectors', value: 'int8 quantization 4×, binary quantization 32×, Matryoshka 256 of 1,024 dims 4×', note: 'Usually with a re-scoring pass over the top candidates to recover recall.', ch: 'embedding-serving' },
    ],
  },
];
