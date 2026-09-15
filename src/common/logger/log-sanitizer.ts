const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|jwt|authorization|credential|apikey|api_key|privatekey|private_key|database_url|cloudinary)/i;

const REDACTED = '[REDACTED]';

export function sanitizeLogValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeLogValue(entry);
    }

    return result;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}

function sanitizeString(value: string): string {
  return value
    .replace(
      /(password|passwd|pwd|secret|api[_\s-]?key|token|authorization)\s*[:=]\s*[^\s,;&]+/gi,
      `$1=${REDACTED}`,
    )
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, `$1${REDACTED}`);
}