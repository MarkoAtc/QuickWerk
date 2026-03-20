type StructuredLogEnvelope = {
  source: '@quickwerk/platform-api';
  timestamp: string;
  event: string;
  correlationId: string;
  status: 'started' | 'succeeded' | 'failed';
  details?: Record<string, unknown>;
};

export function logStructuredBreadcrumb(input: Omit<StructuredLogEnvelope, 'source' | 'timestamp'>) {
  const payload: StructuredLogEnvelope = {
    source: '@quickwerk/platform-api',
    timestamp: new Date().toISOString(),
    ...input,
  };

  console.log(JSON.stringify(payload));
}
