export function recommendedOcrWorkers(hardwareConcurrency = 2, deviceMemory?: number, mobile = false): number {
  const availableCores = Math.max(1, Math.floor(hardwareConcurrency) - 1);
  if (mobile || (deviceMemory !== undefined && deviceMemory <= 2)) return 1;
  if ((deviceMemory !== undefined && deviceMemory <= 6) || hardwareConcurrency <= 4) return Math.min(2, availableCores);
  return Math.min(4, availableCores);
}
