import { Request, Response, NextFunction } from "express";
import { IUser } from "../models/User.model";

interface AuthRequest extends Request {
  user?: IUser;
}

export const validateProducerRole = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "producer") {
    res.status(403).json({ message: "Producer access required" });
    return;
  }

  next();
};

export const validateAdminRole = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }

  next();
};

export const validateSuperAdminRole = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "superadmin") {
    res.status(403).json({ message: "Super admin access required" });
    return;
  }

  next();
};
