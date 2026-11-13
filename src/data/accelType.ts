/* Types + derived maths for the accelerator catalog (src/data/accelerators.ts).
   Conventions, shared by every number on the site:
   - TFLOPS are DENSE (no 2:4 / structured sparsity). Vendors often headline sparse figures; we halve them.
   - Bandwidth is decimal TB/s; capacity is decimal GB as marketed.
   - Scale-up bandwidth is per chip, BOTH directions summed (H100 NVLink = 900 GB/s = 450 each way).
     PCIe-only cards list PCIe per-direction bandwidth. */

export type Group = 'nvidia' | 'amd' | 'cloud' | 'other';
export type Segment = 'datacenter' | 'cloud-asic' | 'inference-asic' | 'workstation' | 'local' | 'edge';
export type Status = 'shipping' | 'cloud-only' | 'announced' | 'sampling' | 'internal' | 'legacy';

export interface Accel {
  id: string;
  name: string;
  vendor: string;
  group: Group;
  family: string;          // architecture family, e.g. "Hopper", "CDNA 3", "TPU v6"
  year: number;            // first availability (or announced year for future parts)
  status: Status;
  segment: Segment;
  form: string;            // SXM, OAM, PCIe card, SoC, wafer…
  process?: string;
  transistorsB?: number;
  memType: string;         // HBM3e, GDDR7, LPDDR5X, SRAM…
  memGB: number;           // capacity a model can use (for SRAM-only chips: on-chip SRAM)
  bwTBs: number;           // memory bandwidth (for SRAM-only chips: on-chip SRAM bandwidth)
  sramMB?: number;         // last-level on-chip cache / SRAM
  cores?: number;
  coreLabel?: string;      // "SMs", "CUs", "TensorCores", "NeuronCores"…
  tf32?: number | null;
  bf16: number | null;     // dense BF16/FP16 tensor TFLOPS (null: vendor publishes none)
  fp8?: number | null;
  fp6?: number | null;
  fp4?: number | null;
  int8?: number | null;    // dense INT8 TOPS
  fp4Formats?: string[];
  tdpW?: number | null;
  link?: { name: string; GBs: number; domain: number } | null; // scale-up fabric
  pcie?: string | null;
  partitioning?: string | null;
  price?: [number, number] | null;  // typical on-demand USD per chip-hour, late 2026
  msrp?: number | null;             // approximate purchase price, USD
  clouds?: string[];
  take: string;            // what it is good / bad at for LLM inference
  caveats?: string;        // spec-sheet traps, SKU variants, uncertainty
  sources: string[];
  /** Id in the calculator GPU list (hardware.ts GPUS) when this chip is offered in the chapter calculators and the Lab. */
  calc?: string;
  smemKB?: number;         // shared memory per SM/CU, KB (only needed for calculator GPUs)
}

/** Usable fraction of memory after the driver, CUDA context, activations and fragmentation. */
export const USABLE = 0.9;
/** Achievable fraction of peak bandwidth for decode GEMVs (MBU). */
export const MBU = 0.75;

export const ridgeBF16 = (a: Accel) => (a.bf16 == null ? null : a.bf16 / a.bwTBs);
export const bestLowPrec = (a: Accel) => a.fp4 ?? a.fp8 ?? a.int8 ?? a.bf16;
export const lowPrecLabel = (a: Accel) => (a.fp4 ? 'FP4' : a.fp8 ? 'FP8' : a.int8 ? 'INT8' : 'BF16');
export const priceMid = (a: Accel) => (a.price ? (a.price[0] + a.price[1]) / 2 : null);
export const isSram = (a: Accel) => a.memType === 'SRAM';

/** Chips one server or rack can hold before traffic must cross the network: the scale-up domain, but at least
    8, since a standard server holds 8 cards even when they only share PCIe. */
export const nodeSize = (a: Accel) => Math.max(8, a.link?.domain ?? 1);
/** Placement of a tensor-parallel group of `tp` chips: fast fabric, PCIe inside one server, or across nodes. */
export function placement(a: Accel, tp: number): 'single' | 'fabric' | 'pcie' | 'multi-node' {
  if (tp <= 1) return 'single';
  if (tp > nodeSize(a)) return 'multi-node';
  return (a.link?.domain ?? 1) >= tp && !/^PCIe/i.test(a.link?.name ?? 'PCIe') ? 'fabric' : 'pcie';
}

/** Upper bound on single-stream decode speed: every active weight byte crosses the memory bus once per token. */
export const decodeCeiling = (a: Accel, activeWeightBytes: number, chips = 1) =>
  (chips * a.bwTBs * 1e12 * MBU) / activeWeightBytes;

export const GROUP_LABEL: Record<Group, string> = { nvidia: 'NVIDIA', amd: 'AMD', cloud: 'Cloud ASICs', other: 'Other' };
export const SEGMENT_LABEL: Record<Segment, string> = {
  datacenter: 'Data-centre GPU', 'cloud-asic': 'Cloud ASIC', 'inference-asic': 'Inference ASIC',
  workstation: 'Workstation', local: 'Desktop & local', edge: 'Edge',
};
export const STATUS_LABEL: Record<Status, string> = {
  shipping: 'Shipping', 'cloud-only': 'Cloud only', announced: 'Announced', sampling: 'Sampling', internal: 'Internal only', legacy: 'Previous gen',
};
