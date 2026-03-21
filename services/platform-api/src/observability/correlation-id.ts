import { createHash } from 'node:crypto';

import { correlationIdHeaderName } from '@quickwerk/domain';

const MAX_CORRELATION_ID_LENGTH = 128;
const correlationIdPattern = /^[a-zA-Z0-9._:-]+$/;

type CorrelationIdInput = {
  headerValue?: string;
  method: string;
  path: string;
  token?: string;
  body?: unknown;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

export function normalizeCorrelationId(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const normalized = headerValue.trim();

  if (!normalized || normalized.length > MAX_CORRELATION_ID_LENGTH || !correlationIdPattern.test(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveCorrelationId(input: CorrelationIdInput): string {
  const fromHeader = normalizeCorrelationId(input.headerValue);

  if (fromHeader) {
    return fromHeader;
  }

  const deterministicSeed = [
    input.method.toUpperCase(),
    input.path,
    input.token ?? 'anonymous',
    stableStringify(input.body ?? null),
  ].join('|');

  const digest = createHash('sha256').update(deterministicSeed).digest('hex').slice(0, 24);

  return `corr-${digest}`;
}

export { correlationIdHeaderName };
