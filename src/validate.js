import { Worker } from 'node:worker_threads';

// Schemas can contain expensive regular expressions. Bound their execution,
// including compilation, without blocking the MCP server event loop.
export function validateBounded(value, schema, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./validation-worker.js', import.meta.url), {
      workerData: { value, schema },
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
      // Avoid inheriting test runners / eval flags into the worker.
      execArgv: []
    });
    const finish = (error, result) => {
      clearTimeout(timer);
      worker.removeAllListeners();
      void worker.terminate();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('Schema validation exceeded the time limit. Simplify the schema or input.')), timeoutMs);
    worker.once('message', ({ result, error }) => finish(error ? new Error(error) : null, result));
    worker.once('error', () => finish(new Error('Schema validation failed within its resource limits.')));
    worker.once('exit', () => finish(new Error('Schema validation stopped before returning a result.')));
  });
}
