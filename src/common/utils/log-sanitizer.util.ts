const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
]);

export function sanitizeForLogging<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (accumulator, [key, nestedValue]) => {
      accumulator[key] = SENSITIVE_KEYS.has(key)
        ? REDACTED
        : sanitizeForLogging(nestedValue);
      return accumulator;
    },
    {},
  ) as T;
}
