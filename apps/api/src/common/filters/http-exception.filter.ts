import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : exception.message,
      ...(status === HttpStatus.INTERNAL_SERVER_ERROR && {
        error: 'Internal Server Error',
      }),
    };

    // Log errors
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception.stack,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}`,
        errorResponse.message,
      );
    }

    response.status(status).json(errorResponse);
  }
}
