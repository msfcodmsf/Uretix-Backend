import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/User.model";

interface AuthRequest extends Request {
  user?: any;
}

// Belirli rollere erişim kontrolü
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Yetkilendirme gerekli" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Bu işlem için yetkiniz bulunmuyor",
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Sadece admin ve super admin
export const requireAdmin = requireRole(["admin", "superadmin"]);

// Sadece super admin
export const requireSuperAdmin = requireRole(["superadmin"]);

// Sadece üretici
export const requireProducer = requireRole(["producer"]);

// Üretici veya admin
export const requireProducerOrAdmin = requireRole([
  "producer",
  "admin",
  "superadmin",
]);

// Kullanıcı veya üretici
export const requireUserOrProducer = requireRole(["user", "producer"]);

// Kendi profilini düzenleme kontrolü
export const requireOwnProfile = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Yetkilendirme gerekli" });
  }

  const requestedUserId = req.params.userId || req.params.id;

  if (req.user.role === "superadmin") {
    // Super admin herkesin profilini düzenleyebilir
    return next();
  }

  if (req.user._id.toString() === requestedUserId) {
    // Kullanıcı kendi profilini düzenleyebilir
    return next();
  }

  return res.status(403).json({
    message: "Sadece kendi profilinizi düzenleyebilirsiniz",
  });
};
