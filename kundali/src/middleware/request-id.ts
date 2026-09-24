import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const supplied = req.header("X-Request-ID")?.trim();
  const id = supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();

  res.setHeader("X-Request-ID", id);
  res.locals.requestId = id;
  next();
}
