
export interface AppError {
  message: string;
  type: 'validation' | 'network' | 'server' | 'unknown';
}

export const createError = (message: string, type: AppError['type'] = 'unknown'): AppError => ({
  message,
  type
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
