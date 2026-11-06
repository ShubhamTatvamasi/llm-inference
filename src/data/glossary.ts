/* Glossary: short, precise definitions. Used three ways:
   1. hover/tap definitions on the first mention of a term in each chapter (Chapter layout),
   2. the /glossary/ page,
   3. the ⌘K search palette.
   `ch` is the chapter that teaches the term properly. `aliases` are other spellings to match in prose.
   Matching is case-sensitive for acronyms (all-caps terms) and case-insensitive otherwise. */

export interface Term { term: string; aliases?: string[]; def: string; ch: string; hover?: false }

/** Anchor id of a term on the /glossary/ page. */
export const termId = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const glossary: Term[] = [
  // I — model
  { term: 'token', hover: false, def: 'The unit a model reads and writes: a word, part of a word or a symbol, mapped to an integer ID from a fixed vocabulary.', ch: 'tokenization' },
  { term: 'BPE', aliases: ['byte-pair encoding'], def: 'Byte-pair encoding: a tokenizer built by repeatedly merging the most frequent adjacent pair of symbols, so common strings become single tokens.', ch: 'tokenization' },
  { term: 'chat template', def: 'The model-specific wrapper of special tokens (roles, turn separators) that turns a list of messages into the single token sequence the model was trained on.', ch: 'tokenization' },
  { term: 'embedding', hover: false, def: 'A learned vector for each token ID. The first layer of the model is a table lookup from ID to embedding.', ch: 'embeddings' },
  { term: 'RoPE', aliases: ['rotary position embedding'], def: 'Rotary position embedding: rotates query and key vectors by an angle proportional to position, so attention scores depend on relative distance.', ch: 'embeddings' },
  { term: 'attention', hover: false, def: 'The operation that lets each token read from earlier tokens: softmax(QKᵀ/√d)·V, with a causal mask during generation.', ch: 'attention' },
  { term: 'causal mask', def: 'Sets attention scores to −∞ for future positions, so each token only sees itself and earlier tokens. It is what makes caching K and V valid.', ch: 'attention' },
  { term: 'GQA', aliases: ['grouped-query attention'], def: 'Grouped-query attention: several query heads share one K/V head, cutting the KV cache by the group size (e.g. 4–8×) at little quality cost.', ch: 'attention' },
  { term: 'MQA', def: 'Multi-query attention: all query heads share a single K/V head. The smallest KV cache, with some quality loss.', ch: 'attention' },
  { term: 'MLA', aliases: ['multi-head latent attention'], def: 'Multi-head latent attention (DeepSeek-V2/V3): caches one compressed latent vector per token per layer and reconstructs per-head K and V from it.', ch: 'attention' },
  { term: 'residual stream', def: 'The hidden vector that flows through every layer; each attention and MLP block adds its output to it rather than replacing it.', ch: 'transformer' },
  { term: 'logits', def: 'The raw, unnormalised score the model assigns to every vocabulary entry for the next token. Softmax turns them into probabilities.', ch: 'sampling' },
  { term: 'temperature', def: 'Divides the logits before softmax. Below 1 sharpens the distribution toward the top token; above 1 flattens it. As T → 0 it becomes greedy.', ch: 'sampling' },
  { term: 'top-p', aliases: ['nucleus sampling'], def: 'Nucleus sampling: keep the smallest set of tokens whose probabilities sum to at least p, renormalise, and sample from them.', ch: 'sampling' },
  { term: 'top-k', def: 'Keep only the k most likely tokens, renormalise, and sample from them.', ch: 'sampling' },

  // II — one GPU
  { term: 'HBM', aliases: ['high-bandwidth memory'], def: 'High-bandwidth memory: the stacked DRAM next to the GPU die that holds weights and the KV cache. Its bandwidth (TB/s) caps decode speed.', ch: 'gpu' },
  { term: 'SRAM', def: 'Fast on-chip memory (registers, shared memory, L1) inside each SM. Tiny, but an order of magnitude faster than HBM.', ch: 'gpu' },
  { term: 'tensor core', aliases: ['tensor cores'], def: 'Specialised GPU units that do small matrix multiplies per clock. They supply nearly all of a GPU’s headline FLOPs.', ch: 'gpu' },
  { term: 'SM', aliases: ['streaming multiprocessor'], def: 'Streaming multiprocessor: one of the ~100–150 independent compute blocks on an NVIDIA GPU, each with its own tensor cores, registers and shared memory.', ch: 'gpu' },
  { term: 'prefill', hover: false, def: 'The first phase of a request: process the whole prompt in one parallel pass and fill the KV cache. Compute-bound.', ch: 'prefill-decode' },
  { term: 'decode', hover: false, def: 'The second phase: generate one token per forward pass, re-reading the weights and KV cache each step. Memory-bandwidth-bound.', ch: 'prefill-decode' },
  { term: 'arithmetic intensity', def: 'FLOPs performed per byte moved from memory. Below the GPU’s ridge point a kernel is memory-bound; above it, compute-bound.', ch: 'roofline' },
  { term: 'roofline', def: 'A plot of attainable FLOP/s against arithmetic intensity: a bandwidth slope that bends into a flat compute ceiling at the ridge point.', ch: 'roofline' },
  { term: 'memory-bound', def: 'Limited by how fast data can be read from memory, not by math. Decode at small batch is the classic case.', ch: 'roofline' },
  { term: 'compute-bound', def: 'Limited by how fast the tensor cores can do math. Prefill of long prompts is the classic case.', ch: 'roofline' },
  { term: 'KV cache', def: 'The keys and values of every past token, kept in GPU memory so each decode step only computes K and V for the new token.', ch: 'kv-cache' },
  { term: 'FlashAttention', def: 'An attention kernel that tiles Q, K and V through on-chip SRAM with an online softmax, never writing the n×n score matrix to HBM.', ch: 'flash-attention' },
  { term: 'online softmax', def: 'Computes softmax in one streaming pass by keeping a running max and running sum, rescaling earlier partial results as new blocks arrive.', ch: 'flash-attention' },
  { term: 'kernel fusion', def: 'Combining several GPU operations into one kernel so intermediates stay on-chip instead of round-tripping through HBM.', ch: 'kernels' },
  { term: 'CUDA graph', aliases: ['CUDA graphs'], def: 'A recorded sequence of kernel launches that can be replayed with a single CPU call, removing per-kernel launch overhead from tiny decode steps.', ch: 'kernels' },

  // III — engine
  { term: 'continuous batching', aliases: ['iteration-level batching'], def: 'Scheduling at every decode step: finished sequences leave and new ones join the running batch immediately, instead of waiting for the whole batch.', ch: 'batching' },
  { term: 'PagedAttention', def: 'Stores the KV cache in fixed-size blocks mapped through a per-sequence block table, like virtual memory, so it needs no contiguous reservation.', ch: 'paged-attention' },
  { term: 'block table', def: 'The per-sequence map from logical KV block number to physical block in GPU memory, used by PagedAttention.', ch: 'paged-attention' },
  { term: 'prefix caching', def: 'Reusing the KV blocks of an identical earlier prompt prefix (system prompt, shared document) so that part is not prefilled again.', ch: 'prefix-caching' },
  { term: 'chunked prefill', def: 'Splitting a long prompt’s prefill into chunks that share each step with ongoing decodes, under a per-step token budget.', ch: 'chunked-prefill' },
  { term: 'preemption', def: 'Evicting a running request when the KV cache runs out; its KV is later recomputed (or swapped back) when there is room.', ch: 'scheduler' },

  // IV — faster
  { term: 'speculative decoding', def: 'A cheap drafter proposes several tokens, and the target model verifies them all in one forward pass, keeping the longest accepted prefix. The output distribution is unchanged.', ch: 'speculative-decoding' },
  { term: 'acceptance rate', def: 'In speculative decoding, the probability that the target model accepts a drafted token. It sets how many tokens each verify pass yields.', ch: 'speculative-decoding' },
  { term: 'quantization', def: 'Storing weights, activations or KV in fewer bits (FP8, INT8, INT4, FP4) with scale factors, to cut memory and bytes moved.', ch: 'quantization' },
  { term: 'FP8', def: '8-bit floating point (E4M3 or E5M2). Halves memory versus BF16 and doubles tensor-core throughput on Hopper and Blackwell.', ch: 'quantization' },
  { term: 'BF16', aliases: ['bfloat16'], def: '16-bit floating point with FP32’s 8-bit exponent and a 7-bit mantissa. The default precision for serving weights.', ch: 'quantization' },
  { term: 'constrained decoding', aliases: ['grammar-constrained decoding'], def: 'Masking the logits at every step so only tokens allowed by a grammar or JSON schema can be sampled.', ch: 'structured-output' },
  { term: 'LoRA', def: 'Low-rank adaptation: a fine-tune stored as two small matrices per layer (rank r). Many adapters can share one base model in the same batch.', ch: 'multi-lora' },

  // V — scale
  { term: 'NVLink', def: 'NVIDIA’s high-bandwidth GPU-to-GPU link inside a server (H100: 900 GB/s total, 450 GB/s each way).', ch: 'interconnects' },
  { term: 'all-reduce', def: 'A collective in which every GPU contributes a tensor and every GPU receives the sum. Tensor parallelism runs two per layer.', ch: 'interconnects' },
  { term: 'tensor parallelism', aliases: ['TP'], def: 'Splitting each weight matrix across GPUs so they all work on every layer together, joined by all-reduces. Cuts per-GPU memory and latency.', ch: 'parallelism' },
  { term: 'pipeline parallelism', aliases: ['PP'], def: 'Giving each GPU a contiguous slice of layers; activations flow GPU to GPU. Little communication, but adds pipeline bubbles.', ch: 'parallelism' },
  { term: 'data parallelism', def: 'Running independent full replicas of the model and splitting requests between them.', ch: 'parallelism' },
  { term: 'MoE', aliases: ['mixture of experts', 'Mixture of Experts'], def: 'Mixture of experts: each layer has many expert MLPs and a router that sends each token to only the top-k, so active parameters ≪ total.', ch: 'moe' },
  { term: 'expert parallelism', aliases: ['EP'], def: 'Placing different experts on different GPUs; tokens travel to their experts and back with all-to-all communication.', ch: 'moe' },
  { term: 'disaggregation', aliases: ['disaggregated serving', 'P/D disaggregation'], def: 'Running prefill and decode on separate GPU pools sized independently, and transferring the KV cache between them.', ch: 'disaggregation' },

  // VI — production
  { term: 'TTFT', aliases: ['time to first token'], def: 'Time to first token: from request arrival to the first streamed token. Queueing + prefill + one decode step.', ch: 'metrics' },
  { term: 'TPOT', aliases: ['time per output token'], def: 'Time per output token: average gap between tokens after the first, (E2E − TTFT) / (output tokens − 1).', ch: 'metrics' },
  { term: 'ITL', aliases: ['inter-token latency'], def: 'Inter-token latency: each individual gap between consecutive streamed tokens. Its tail (p99) shows stalls that TPOT averages away.', ch: 'metrics' },
  { term: 'goodput', def: 'Throughput counting only requests that met their latency SLOs. The number worth maximising.', ch: 'metrics' },
  { term: 'SLO', aliases: ['service-level objective'], def: 'Service-level objective: a latency target such as “p99 TTFT < 500 ms”.', ch: 'metrics' },
  { term: "Little's law", aliases: ['Little’s law'], def: 'In steady state, requests in flight = arrival rate × time in system. Links concurrency, throughput and latency.', ch: 'metrics' },
  { term: 'KV-aware routing', aliases: ['cache-aware routing', 'prefix-aware routing'], def: 'Sending a request to the replica that already holds its prefix in cache, instead of round-robin.', ch: 'routing-autoscaling' },
  { term: 'cold start', def: 'The delay before a new replica can serve: pull the image, load weights to HBM, compile and capture CUDA graphs.', ch: 'routing-autoscaling' },
  { term: 'vLLM', def: 'A widely used open-source inference engine that introduced PagedAttention.', ch: 'serving-stack' },
  { term: 'SGLang', def: 'An open-source inference engine known for RadixAttention prefix caching and fast structured output.', ch: 'serving-stack' },

  // VII / VIII
  { term: 'reasoning model', aliases: ['reasoning models'], def: 'A model trained to emit a long hidden chain of thought before answering, so output tokens (and KV) grow by 10–100×.', ch: 'reasoning-agents' },
  { term: 'pooling', def: 'Collapsing a sequence of token vectors into one embedding (mean, CLS token or last token).', ch: 'embedding-serving' },
  { term: 'reranker', def: 'A cross-encoder that scores each (query, document) pair jointly; slower than embeddings but more accurate for ordering search results.', ch: 'embedding-serving' },
  { term: 'MIG', aliases: ['Multi-Instance GPU'], def: 'Multi-Instance GPU: hardware partitioning of one GPU into isolated slices, each with its own SMs, L2 and memory.', ch: 'gpu-sharing' },
  { term: 'MPS', def: 'Multi-Process Service: lets several processes run kernels on one GPU concurrently, sharing memory and SMs without hardware isolation.', ch: 'gpu-sharing' },
  { term: 'time-slicing', def: 'Sharing a GPU by giving each process turns. Simple, but no memory isolation and context-switch overhead.', ch: 'gpu-sharing' },
  { term: 'DRA', aliases: ['Dynamic Resource Allocation'], def: 'Dynamic Resource Allocation: the Kubernetes API for requesting devices by attributes through ResourceClaims, replacing simple GPU counts.', ch: 'gpus-on-kubernetes' },
  { term: 'device plugin', def: 'The Kubernetes component that advertises GPUs on a node as an extended resource (nvidia.com/gpu) and wires them into containers.', ch: 'gpus-on-kubernetes' },
  { term: 'safetensors', def: 'A simple, safe weight file format: a JSON header of tensor names, shapes and offsets followed by raw bytes, so it can be memory-mapped.', ch: 'model-loading' },
  { term: 'DCGM', def: 'NVIDIA Data Center GPU Manager: the agent and exporter behind GPU metrics such as utilisation, memory, power, clocks and errors.', ch: 'observability' },
  { term: 'Xid', aliases: ['Xid error', 'Xid errors'], def: 'A numbered error code the NVIDIA driver writes to the kernel log, e.g. 79 = GPU fell off the bus, 48 = double-bit ECC error.', ch: 'observability' },
];
