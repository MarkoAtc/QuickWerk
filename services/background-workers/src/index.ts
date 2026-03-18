export { workerPipelines } from './workers/index.js';

export const backgroundWorkerRuntime = {
  service: '@quickwerk/background-workers',
  status: 'bootstrap-ready',
} as const;
