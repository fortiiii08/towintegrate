import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isAdmin: boolean;
    isSecondOwner: boolean;
    linkedCidadeClientId?: string | null;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET não configurado" });
    }

    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
        userRoles: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    let linkedCidadeClientId: string | null = null;
    try {
      const extra = await prisma.$queryRawUnsafe<{ linked_cidade_client_id: string | null }[]>(
        `SELECT linked_cidade_client_id FROM users WHERE id = $1`, user.id
      );
      linkedCidadeClientId = extra[0]?.linked_cidade_client_id ?? null;
    } catch {}

    req.user = {
      id: user.id,
      email: user.email,
      name: user.profile?.name || "Usuário",
      role: user.userRoles[0]?.role || "employee",
      isAdmin: user.userRoles.some(r => r.role === "admin"),
      isSecondOwner: user.userRoles.some(r => r.role === "second_owner"),
      linkedCidadeClientId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Token inválido" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expirado" });
    }
    return res.status(500).json({ error: "Erro de autenticação" });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
};
