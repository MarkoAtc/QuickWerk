import { backgroundWorkerRuntime, workerPipelines } from './index.js';

function bootstrapWorkers() {
  const summary = {
    ...backgroundWorkerRuntime,
    pipelineCount: workerPipelines.length,
    pipelines: workerPipelines,
  };

  console.log(JSON.stringify(summary));
}

bootstrapWorkers();