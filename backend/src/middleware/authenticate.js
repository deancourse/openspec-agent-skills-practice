import { unauthorized } from "../lib/errors.js";
import { verifyJwt } from "../lib/security.js";

export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(unauthorized("Missing bearer token"));
  }

  try {
    req.user = verifyJwt(token);
    return next();
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }
}

