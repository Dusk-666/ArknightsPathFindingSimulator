export function createSequentialId(existingIds: string[], prefix: string): string {
  let index = existingIds.length + 1;

  while (existingIds.includes(`${prefix}_${String(index).padStart(3, "0")}`)) {
    index += 1;
  }

  return `${prefix}_${String(index).padStart(3, "0")}`;
}
