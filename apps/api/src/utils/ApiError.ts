import type { FieldErrors } from '@lp/shared';

export default class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: FieldErrors;

  constructor(statusCode: number, message: string, errors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}
