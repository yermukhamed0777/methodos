import { parentPort, workerData } from 'node:worker_threads';
import { parseDocument, safeDocumentMessage } from './document-parser.js';
try {
  parentPort.postMessage({
    result: await parseDocument(workerData.bytes, workerData.name),
  });
} catch (error) {
  parentPort.postMessage({ error: safeDocumentMessage(error.message) });
}
