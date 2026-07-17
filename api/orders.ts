import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleOrdersRequest } from './proxy';

export default async function ordersProxy(req: IncomingMessage, res: ServerResponse) {
  await handleOrdersRequest(req, res, process.env);
}
