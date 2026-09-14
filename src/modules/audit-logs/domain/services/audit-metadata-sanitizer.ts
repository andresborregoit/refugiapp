const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|jwt|authorization|credential|apikey|api_key|privatekey|private_key)/i;

const REDACTED = '[REDACTED]';

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const value = sanitizeValue(metadata ?? {});
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(entry);
    }

    return result;
  }

  return value;
}