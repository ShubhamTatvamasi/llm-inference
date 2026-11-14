/* Learning paths: curated reading orders through the chapters for a goal or a role.
   Shown on /paths/ and on the home page; a reader can follow one, and every chapter in it
   then shows "next in your path". Slugs are validated against chapters.ts at build time. */
import { chapters } from './chapters';

export interface Path {
  id: string;
  title: string;
  who: string;      // who it is for, one line
  outcome: string;  // what you can do at the end
  steps: string[];  // chapter slugs, in reading order
}

export const paths: Path[] = [
  {
    id: 'core',
    title: 'The essentials',
    who: 'New to inference, or short on time.',
    outcome: 'Explain what happens to a prompt, why decode is slow, what the KV cache costs and how engines batch requests.',
    steps: ['tokenization', 'attention', 'prefill-decode', 'kv-cache', 'batching', 'paged-attention', 'metrics', 'serving-stack'],
  },
  {
    id: 'interview',
    title: 'Inference engineer interview',
    who: 'Preparing for an ML systems or inference interview.',
    outcome: 'Reason from first principles about memory, bandwidth and scheduling, and answer the usual follow-up questions.',
    steps: ['transformer', 'gpu', 'prefill-decode', 'roofline', 'kv-cache', 'batching', 'paged-attention', 'prefix-caching', 'scheduler', 'speculative-decoding', 'quantization', 'parallelism', 'metrics', 'capacity-planning'],
  },
  {
    id: 'platform',
    title: 'Platform and SRE on Kubernetes',
    who: 'You run the cluster and the model servers on it.',
    outcome: 'Size a deployment, get GPUs and weights into pods, pick scaling signals and debug a slow or failing replica.',
    steps: ['prefill-decode', 'kv-cache', 'batching', 'metrics', 'benchmarking', 'serving-stack', 'routing-autoscaling', 'capacity-planning', 'gpus-on-kubernetes', 'gpu-sharing', 'model-loading', 'observability'],
  },
  {
    id: 'performance',
    title: 'Performance engineering',
    who: 'You want every last token per second out of the hardware.',
    outcome: 'Read a roofline, find the bottleneck of a decode step and choose between kernels, precision and parallelism to move it.',
    steps: ['gpu', 'roofline', 'kv-cache', 'flash-attention', 'kernels', 'chunked-prefill', 'quantization', 'speculative-decoding', 'interconnects', 'parallelism', 'moe', 'disaggregation'],
  },
  {
    id: 'apps',
    title: 'Building apps and agents',
    who: 'You call models from a product and want to use them well.',
    outcome: 'Shape prompts for cache hits, constrain outputs, budget for reasoning and tools, and measure what users feel.',
    steps: ['tokenization', 'sampling', 'prefill-decode', 'prefix-caching', 'structured-output', 'reasoning-agents', 'multimodal', 'embedding-serving', 'metrics', 'quality-safety'],
  },
];

const known = new Set(chapters.map((c) => c.slug));
for (const p of paths) for (const s of p.steps) if (!known.has(s)) throw new Error(`paths.ts: "${s}" in path "${p.id}" is not a chapter slug`);
