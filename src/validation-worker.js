import { parentPort, workerData } from 'node:worker_threads';
import { validatePayload } from './core.js';

try {
  parentPort.postMessage({ result: validatePayload(workerData.value, workerData.schema) });
} catch (error) {
  parentPort.postMessage({ error: error.message });
}
