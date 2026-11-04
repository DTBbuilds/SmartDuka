import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * ERROR-UX-RELIABILITY1 (PR A/B) — correlation/request-ID middleware.
 *
 * Assigns every request a stable correlation ID (honoring an inbound
 * `x-request-id` from trusted proxies/clients when present) and:
 *   - exposes it to the client as the `x-request-id` response header,
 *   - stamps it on the request object so filters/loggers can include it,
 *   - never logs or returns credentials/tokens.
 *
 * The canonical exception filter embeds this ID in every error response so
 * a user-reported failure can be matched to exactly one server log line
 * without exposing any internal detail.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const inbound = req.headers[REQUEST_ID_HEADER];
    const requestId =
      (typeof inbound === 'string' &&
        /^[\w\-]{8,64}$/.test(inbound) &&
        inbound) ||
      crypto.randomUUID();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
