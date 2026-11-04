import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Stable machine-readable error codes — the client-facing contract.
 * Derived from the HTTP status unless the exception carries an explicit
 * `errorCode` (SmartDuka business convention, e.g. MPESA_007).
 */
export const ERROR_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

/** Statuses where an automatic client retry is legitimate. */
const RETRYABLE_STATUSES = new Set([
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.BAD_GATEWAY,
  HttpStatus.SERVICE_UNAVAILABLE,
  HttpStatus.GATEWAY_TIMEOUT,
]);

/**
 * ERROR-UX-RELIABILITY1 (PR A/B) — canonical exception filter.
 *
 * Backward compatible: every field the previous filter emitted
 * (statusCode, timestamp, path, method, message, errors[]) is unchanged.
 * Added: `code` (stable machine-readable), `requestId` (correlation —
 * matches the x-request-id response header and server logs), and
 * `retryable` where appropriate.
 *
 * P0 safety fix: a NON-HttpException Error (an unhandled exception — by
 * definition not a deliberate API response) previously had its raw
 * `error.message` sent to the client, leaking internals (Mongo duplicate-key
 * details, cast errors with collection names, driver/stack fragments). Now
 * the full diagnostic is logged SERVER-SIDE under the correlation ID and the
 * client receives a generic message + the same correlation ID. Legitimate
 * user-facing errors must be HttpExceptions — that is the contract.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;
    let code = ERROR_CODES[status];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = ERROR_CODES[status] || 'HTTP_ERROR';
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as any;
        // Business convention: explicit errorCode wins over the status map.
        if (typeof resp.errorCode === 'string' && resp.errorCode) {
          code = resp.errorCode;
        }
        if (Array.isArray(resp.message)) {
          errors = resp.message.map(String);
          message = resp.message.join(', ');
        } else if (resp.message) {
          message = String(resp.message);
        } else {
          message = exception.message;
        }
      }

      // 4xx = expected business outcome: warn-level, no stack noise.
      const logLine = `${request.method} ${request.url} [${requestId}] -> ${status} ${code}`;
      if (status >= 500) {
        this.logger.error(logLine, exception.stack);
      } else {
        this.logger.warn(`${logLine} (${message})`);
      }
    } else if (exception instanceof Error) {
      // P0: never disclose the raw internal exception to the client.
      this.logger.error(
        `${request.method} ${request.url} [${requestId}] -> 500 INTERNAL_ERROR unhandled: ${exception.message}`,
        exception.stack,
      );
      message = 'Internal server error. Please try again.';
      code = 'INTERNAL_ERROR';
    } else {
      this.logger.error(
        `${request.method} ${request.url} [${requestId}] -> 500 INTERNAL_ERROR non-error throw: ${JSON.stringify(
          exception,
        )}`,
      );
      message = 'Internal server error. Please try again.';
      code = 'INTERNAL_ERROR';
    }

    const errorResponse: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code,
      requestId,
    };

    if (errors) {
      errorResponse.errors = errors;
    }
    if (RETRYABLE_STATUSES.has(status)) {
      errorResponse.retryable = true;
    }

    // Check if response has already been sent (e.g., by redirects)
    if (!response.headersSent) {
      response.status(status).json(errorResponse);
    }
  }
}
