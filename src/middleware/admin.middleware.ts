import type { RequestHandler } from 'express';
import { isAdminUser } from '../utils/admin';
import { HttpError } from '../types';

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const u = req.user;
  if (!u) {
    next(new HttpError(401, 'Unauthorized'));
    return;
  }
  if (!isAdminUser(u.sub, u.email)) {
    next(new HttpError(403, 'Admin access required'));
    return;
  }
  next();
};

/** Admin or the user themselves (same `userId` as JWT `sub`). */
export const requireAdminOrSelf =
  (paramName: string = 'userId'): RequestHandler =>
  (req, _res, next) => {
    const u = req.user;
    if (!u) {
      next(new HttpError(401, 'Unauthorized'));
      return;
    }
    const target = req.params[paramName];
    if (!target) {
      next(new HttpError(400, 'Missing user id'));
      return;
    }
    if (isAdminUser(u.sub, u.email) || target === u.sub) {
      next();
      return;
    }
    next(new HttpError(403, 'You can only access your own analytics'));
  };
