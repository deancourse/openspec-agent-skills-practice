export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(message = "Resource not found") {
  return new HttpError(404, message);
}

export function badRequest(message = "Bad request") {
  return new HttpError(400, message);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

