export function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split('-')[0].split('.').map((part) => Number(part));
  const a = parse(left);
  const b = parse(right);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return left.localeCompare(right);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}
