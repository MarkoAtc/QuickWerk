import { backgroundWorkerRuntime, workerPipelines } from './index.js';

function bootstrapWorkers() {
  const summary = {
    ...backgroundWorkerRuntime,
    pipelineCount: workerPipelines.length,
    pipelines: workerPipelines,
    consumers: [
      {
        eventName: 'booking.accepted',
        handler: 'consumeBookingAcceptedAttempt',
        retryVisibility: 'attempt/maxAttempts with structured status logs',
      },
      {
        eventName: 'booking.declined',
        handler: 'consumeBookingDeclinedAttempt',
        retryVisibility: 'attempt/maxAttempts with structured status logs',
      },
    ],
  };

  console.log(JSON.stringify(summary));
}

bootstrapWorkers();