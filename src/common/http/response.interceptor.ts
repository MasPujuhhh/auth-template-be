import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { buildSuccessResponse } from './api-response';

type WrappedResponse<T = unknown> = {
  data: T;
  message?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ReturnType<typeof buildSuccessResponse<T>>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ReturnType<typeof buildSuccessResponse<T>>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (this.isWrappedResponse<T>(data)) {
          return buildSuccessResponse(
            data.data,
            data.message ?? 'Success',
            data.metadata ?? {},
          );
        }

        return buildSuccessResponse(data as T);
      }),
    );
  }

  private isWrappedResponse<T>(data: unknown): data is WrappedResponse<T> {
    return typeof data === 'object' && data !== null && 'data' in data;
  }
}
