import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleMediaRequest } from './proxy';

export default async function mediaProxy(req: IncomingMessage, res: ServerResponse) {
  await handleMediaRequest(req, res, process.env);
}
