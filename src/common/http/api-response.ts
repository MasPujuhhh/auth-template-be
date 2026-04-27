export interface ApiError {
  code: number;
  message: string | string[] | null;
}

export interface ApiMetadata {
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  errors: ApiError | null;
  metadata: ApiMetadata;
  data: T | null;
}

export function buildSuccessResponse<T>(
  data: T,
  message = 'Success',
  metadata: ApiMetadata = {},
): ApiResponse<T> {
  return {
    success: true,
    message,
    errors: null,
    metadata,
    data,
  };
}

export function buildErrorResponse(
  code: number,
  message: string | string[] | null = 'Failed',
  metadata: ApiMetadata = {},
): ApiResponse<null> {
  return {
    success: false,
    message: 'Failed',
    errors: {
      code,
      message,
    },
    metadata,
    data: null,
  };
}
