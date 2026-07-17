import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCatalogRequest } from './proxy';

export default async function catalogProxy(req: IncomingMessage, res: ServerResponse) {
  await handleCatalogRequest(req, res, process.env);
}
