function collectMessages(error: unknown, depth: number): string[] {
  if (depth > 2 || typeof error !== "object" || error === null) {
    return [];
  }
  const record = error as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["shortMessage", "reason", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      parts.push(value);
    }
  }
  if ("error" in record) {
    parts.push(...collectMessages(record.error, depth + 1));
  }
  return parts;
}

export function failureMessage(error: unknown): string {
  const text = collectMessages(error, 0).join(" ");
  return text.length > 0 ? text.slice(0, 800) : "The operation failed.";
}

export function includesReason(error: unknown, reason: string): boolean {
  return failureMessage(error).includes(reason);
}
