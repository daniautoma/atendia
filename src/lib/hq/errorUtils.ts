export function getErrorMessage(
  error: unknown,
  fallback = 'Error inesperado'
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}
