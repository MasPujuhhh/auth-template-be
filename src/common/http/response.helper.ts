export function successResponse<T>(
  data: T,
  message = 'Success',
  metadata: Record<string, unknown> = {},
) {
  return {
    message,
    metadata,
    data,
  };
}
