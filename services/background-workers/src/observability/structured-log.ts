type WorkerLogEnvelope = {
  source: '@quickwerk/background-workers';
  timestamp: string;
  event: string;
  correlationId: string;
  status: 'started' | 'succeeded' | 'retrying' | 'failed';
  details?: Record<string, unknown>;
};

export function logWorkerEvent(input: Omit<WorkerLogEnvelope, 'source' | 'timestamp'>) {
  const payload: WorkerLogEnvelope = {
    source: '@quickwerk/background-workers',
    timestamp: new Date().toISOString(),
    ...input,
  };

  console.log(JSON.stringify(payload));
}
