import { forbidden } from "../lib/errors.js";

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden("Insufficient permissions"));
    }

    return next();
  };
}

