/* The GPU list offered by the chapter calculators and the Inference Lab (data/hardware.ts re-exports
   these, so page code is unchanged). Kept separate from the full accelerator catalog
   (accelerators.ts, ~76 chips with marketing prose and source URLs) so a chapter page with a
   calculator does not download the entire catalog just to power a dropdown.

   The numbers are the same spec-sheet peaks the catalog uses (dense FLOPs, decimal GB/TB/s,
   bidirectional scale-up — see accelType.ts), and are kept in sync with the catalog entry whose
   `calc` id matches each GPU here. That relationship is enforced by test/specs.test.mjs, so the two
   sources cannot silently drift. */

export interface GPU {
  id: string;
  name: string;
  memGB: number;        // HBM / VRAM capacity (GB, decimal as marketed)
  bwTBs: number;        // memory bandwidth TB/s
  bf16TF: number;       // dense BF16/FP16 tensor TFLOPS
  fp8TF: number | null; // dense FP8 TFLOPS (null = unsupported)
  fp4TF: number | null; // dense FP4 TFLOPS
  int8TOPS: number | null;
  linkGBs: number;      // GPU↔GPU bandwidth per GPU, GB/s. NVLink/Infinity Fabric: both directions summed
                        // (H100 900 = 450 each way). PCIe cards: per direction. Halve NVLink for α–β maths.
  sms: number;          // streaming multiprocessors / compute units
  l2MB: number;         // last-level on-chip cache (MI300X: 256 MB Infinity Cache; its true L2 is 4 MB per XCD)
  smemKB: number;       // on-chip shared memory (configurable L1/SMEM) per SM, KB
  pricePerHr: number;   // rough cloud on-demand USD/GPU-hour (illustrative)
}

export const GPUS: GPU[] = [
  { id: 'rtx4090',    name: 'RTX 4090 24GB',       memGB: 24,   bwTBs: 1.008,  bf16TF: 165.2,  fp8TF: 330.3,  fp4TF: null,   int8TOPS: 660.6, linkGBs: 32,    sms: 128, l2MB: 72,   smemKB: 100, pricePerHr: 0.57 },
  { id: 'l40s',       name: 'L40S 48GB',           memGB: 48,   bwTBs: 0.864,  bf16TF: 362,    fp8TF: 733,    fp4TF: null,   int8TOPS: 733,   linkGBs: 32,    sms: 142, l2MB: 96,   smemKB: 100, pricePerHr: 1.35 },
  { id: 'a100',       name: 'A100 80GB SXM',       memGB: 80,   bwTBs: 2.039,  bf16TF: 312,    fp8TF: null,   fp4TF: null,   int8TOPS: 624,   linkGBs: 600,   sms: 108, l2MB: 40,   smemKB: 164, pricePerHr: 2.35 },
  { id: 'h100',       name: 'H100 80GB SXM',       memGB: 80,   bwTBs: 3.35,   bf16TF: 989.5,  fp8TF: 1979,   fp4TF: null,   int8TOPS: 1979,  linkGBs: 900,   sms: 132, l2MB: 50,   smemKB: 228, pricePerHr: 4.1 },
  { id: 'h200',       name: 'H200 141GB',          memGB: 141,  bwTBs: 4.8,    bf16TF: 989.5,  fp8TF: 1979,   fp4TF: null,   int8TOPS: 1979,  linkGBs: 900,   sms: 132, l2MB: 50,   smemKB: 228, pricePerHr: 4.85 },
  { id: 'mi300x',     name: 'MI300X 192GB',        memGB: 192,  bwTBs: 5.3,    bf16TF: 1307.4, fp8TF: 2614.9, fp4TF: null,   int8TOPS: 2614.9, linkGBs: 896,   sms: 304, l2MB: 256,  smemKB: 64,  pricePerHr: 4 },
  { id: 'b200',       name: 'B200 180GB',          memGB: 180,  bwTBs: 8,      bf16TF: 2250,   fp8TF: 4500,   fp4TF: 9000,   int8TOPS: 4500,  linkGBs: 1800,  sms: 148, l2MB: 126,  smemKB: 228, pricePerHr: 6.3 },
  { id: 'l4',         name: 'L4 24GB',             memGB: 24,   bwTBs: 0.3,    bf16TF: 121,    fp8TF: 242,    fp4TF: null,   int8TOPS: 242,   linkGBs: 32,    sms: 58,  l2MB: 48,   smemKB: 100, pricePerHr: 0.7 },
  { id: 'rtx5090',    name: 'RTX 5090 32GB',       memGB: 32,   bwTBs: 1.792,  bf16TF: 209.5,  fp8TF: 419,    fp4TF: 1676,   int8TOPS: 838,   linkGBs: 64,    sms: 170, l2MB: 96,   smemKB: 100, pricePerHr: 0.81 },
  { id: 'rtxpro6000', name: 'RTX PRO 6000 96GB',   memGB: 96,   bwTBs: 1.792,  bf16TF: 503.8,  fp8TF: 1007.6, fp4TF: 2015.2, int8TOPS: 1007.6, linkGBs: 64,    sms: 188, l2MB: 128,  smemKB: 100, pricePerHr: 2.19 },
  { id: 'mi355x',     name: 'MI355X 288GB',        memGB: 288,  bwTBs: 8,      bf16TF: 2516.6, fp8TF: 5033.2, fp4TF: 10066.3, int8TOPS: 5033.2, linkGBs: 1008,  sms: 256, l2MB: 256,  smemKB: 160, pricePerHr: 7.3 },
];

export const getGPU = (id: string) => GPUS.find((g) => g.id === id)!;
