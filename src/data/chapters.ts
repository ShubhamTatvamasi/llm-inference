// Single source of truth for navigation, ordering and the home-page map.
// A chapter page lives at src/pages/<slug>.mdx

export interface Part {
  id: string;
  num: string;
  title: string;
  blurb: string;
}

export interface Chapter {
  slug: string;
  part: string;
  title: string;
  short: string; // sidebar label
  blurb: string; // one-line summary for cards
}

export const parts: Part[] = [
  { id: 'model', num: 'I', title: 'Inside the model', blurb: 'What actually happens to your text inside a transformer.' },
  { id: 'gpu', num: 'II', title: 'One request, one GPU', blurb: 'Where time and memory go when a single prompt runs.' },
  { id: 'engine', num: 'III', title: 'Many requests, one engine', blurb: 'How serving engines juggle hundreds of users at once.' },
  { id: 'faster', num: 'IV', title: 'Faster & cheaper', blurb: 'Tricks that buy speed, memory and features.' },
  { id: 'scale', num: 'V', title: 'Scaling out', blurb: 'When one GPU is not enough.' },
  { id: 'prod', num: 'VI', title: 'Production', blurb: 'Measuring, routing, scaling and paying for it.' },
  { id: 'beyond', num: 'VII', title: 'Beyond chat', blurb: 'Reasoning, agents, images and embeddings stress the engine differently.' },
  { id: 'k8s', num: 'VIII', title: 'Running on Kubernetes', blurb: 'Getting GPUs, weights and visibility into a cluster.' },
];

export const chapters: Chapter[] = [
  // I — Inside the model
  { slug: 'tokenization', part: 'model', title: 'Text → Tokens', short: 'Tokenization', blurb: 'BPE merges, token IDs, chat templates and why token counts matter.' },
  { slug: 'embeddings', part: 'model', title: 'Embeddings & Positions', short: 'Embeddings & RoPE', blurb: 'Token IDs become vectors; RoPE rotates them so order is encoded.' },
  { slug: 'attention', part: 'model', title: 'Attention', short: 'Attention', blurb: 'Q·Kᵀ, causal masks, softmax, and MHA vs GQA vs MQA.' },
  { slug: 'transformer', part: 'model', title: 'The Transformer Layer', short: 'Transformer layer', blurb: 'One layer end-to-end: norms, attention, MLP, residuals, params & FLOPs.' },
  { slug: 'sampling', part: 'model', title: 'Logits → Next Token', short: 'Sampling', blurb: 'Temperature, top-k, top-p, min-p, penalties and greedy decoding.' },

  // II — One request, one GPU
  { slug: 'gpu', part: 'gpu', title: 'Anatomy of a GPU', short: 'GPU & memory', blurb: 'HBM, L2, SRAM, tensor cores — and why bandwidth rules inference.' },
  { slug: 'prefill-decode', part: 'gpu', title: 'Prefill vs Decode', short: 'Prefill vs decode', blurb: 'The two phases of every request and why they behave so differently.' },
  { slug: 'roofline', part: 'gpu', title: 'The Roofline', short: 'Roofline', blurb: 'Arithmetic intensity: when you are memory-bound vs compute-bound.' },
  { slug: 'kv-cache', part: 'gpu', title: 'The KV Cache', short: 'KV cache', blurb: 'Why it exists, how big it gets, and why it caps concurrency.' },
  { slug: 'flash-attention', part: 'gpu', title: 'FlashAttention', short: 'FlashAttention', blurb: 'Tiling + online softmax: attention without materialising N×N.' },
  { slug: 'kernels', part: 'gpu', title: 'Kernels, Fusion & CUDA Graphs', short: 'Kernels & CUDA graphs', blurb: 'Launch overhead, kernel fusion and graph capture for tiny decode steps.' },

  // III — Many requests, one engine
  { slug: 'batching', part: 'engine', title: 'Batching', short: 'Batching', blurb: 'Static vs dynamic vs continuous (iteration-level) batching.' },
  { slug: 'paged-attention', part: 'engine', title: 'PagedAttention', short: 'PagedAttention', blurb: 'Virtual memory for the KV cache: blocks, block tables, copy-on-write.' },
  { slug: 'prefix-caching', part: 'engine', title: 'Prefix Caching', short: 'Prefix caching', blurb: 'Hashed blocks, radix trees and LRU eviction to skip repeated prefill.' },
  { slug: 'chunked-prefill', part: 'engine', title: 'Chunked Prefill', short: 'Chunked prefill', blurb: 'Token budgets that stop long prompts from freezing everyone’s stream.' },
  { slug: 'scheduler', part: 'engine', title: 'Scheduler & Preemption', short: 'Scheduler', blurb: 'Waiting / running queues, preemption, recompute vs swap, KV offload.' },

  // IV — Faster & cheaper
  { slug: 'speculative-decoding', part: 'faster', title: 'Speculative Decoding', short: 'Speculative decoding', blurb: 'Draft cheaply, verify in one pass: draft models, EAGLE, Medusa, n-gram.' },
  { slug: 'quantization', part: 'faster', title: 'Quantization', short: 'Quantization', blurb: 'FP8, INT8, INT4, FP4: bit layouts, scales and what each speeds up.' },
  { slug: 'structured-output', part: 'faster', title: 'Structured Output', short: 'Structured output', blurb: 'Grammar-constrained decoding by masking logits with a state machine.' },
  { slug: 'multi-lora', part: 'faster', title: 'Multi-LoRA Serving', short: 'Multi-LoRA', blurb: 'One base model, many adapters, all in the same batch.' },

  // V — Scaling out
  { slug: 'interconnects', part: 'scale', title: 'Interconnects & Collectives', short: 'Interconnects', blurb: 'PCIe, NVLink, NVSwitch, InfiniBand and the all-reduce that rides on them.' },
  { slug: 'parallelism', part: 'scale', title: 'Parallelism', short: 'TP / PP / DP', blurb: 'Tensor, pipeline, data and context parallelism and their communication.' },
  { slug: 'moe', part: 'scale', title: 'Mixture of Experts', short: 'MoE & expert parallel', blurb: 'Routers, top-k experts, load imbalance and all-to-all.' },
  { slug: 'disaggregation', part: 'scale', title: 'Disaggregated Prefill / Decode', short: 'P/D disaggregation', blurb: 'Separate pools for each phase, with KV transfer in between.' },

  // VI — Production
  { slug: 'metrics', part: 'prod', title: 'Latency Metrics & Goodput', short: 'Metrics & goodput', blurb: 'TTFT, ITL, TPOT, E2E, p99, Little’s law and the goodput knee.' },
  { slug: 'benchmarking', part: 'prod', title: 'Benchmarking', short: 'Benchmarking', blurb: 'Workload shapes, concurrency sweeps, the tools, and how benchmarks lie.' },
  { slug: 'routing-autoscaling', part: 'prod', title: 'Routing & Autoscaling', short: 'Routing & autoscaling', blurb: 'KV-aware routing, the right scaling signals, cold starts.' },
  { slug: 'serving-stack', part: 'prod', title: 'The Serving Stack', short: 'Serving stack', blurb: 'API → gateway → engine → GPU: the full request path, and the engines.' },
  { slug: 'capacity-planning', part: 'prod', title: 'Capacity & Cost', short: 'Capacity & cost', blurb: 'From model + SLO + traffic to GPU count and cost per million tokens.' },
  { slug: 'quality-safety', part: 'prod', title: 'Quality & Safety', short: 'Quality & safety', blurb: 'Proving an optimisation kept accuracy, and guarding inputs, outputs and weights.' },

  // VII — Beyond chat
  { slug: 'reasoning-agents', part: 'beyond', title: 'Reasoning Models & Agents', short: 'Reasoning & agents', blurb: 'Thousands of hidden tokens, multi-turn loops and tool calls.' },
  { slug: 'multimodal', part: 'beyond', title: 'Multimodal Serving', short: 'Multimodal', blurb: 'Images become tokens: encoder cost, token budgets and encoder caching.' },
  { slug: 'embedding-serving', part: 'beyond', title: 'Embeddings & Rerankers', short: 'Embeddings & rerankers', blurb: 'Prefill-only models: pooling, batching and serving them cheaply.' },

  // VIII — Running on Kubernetes
  { slug: 'gpus-on-kubernetes', part: 'k8s', title: 'GPUs on Kubernetes', short: 'GPUs on Kubernetes', blurb: 'GPU Operator, device plugin, CDI, node labels and DRA claims.' },
  { slug: 'gpu-sharing', part: 'k8s', title: 'Sharing a GPU', short: 'GPU sharing', blurb: 'Time-slicing, MPS, MIG and vGPU: isolation vs utilisation.' },
  { slug: 'model-loading', part: 'k8s', title: 'Model Weights & Loading', short: 'Weights & loading', blurb: 'File formats, where weights live, and how fast they reach HBM.' },
  { slug: 'observability', part: 'k8s', title: 'Observability & Troubleshooting', short: 'Observability', blurb: 'DCGM metrics, Xid errors and a symptom-first triage path.' },
];

export const chapterIndex = (slug: string) => chapters.findIndex((c) => c.slug === slug);
export const partOf = (c: Chapter) => parts.find((p) => p.id === c.part)!;
