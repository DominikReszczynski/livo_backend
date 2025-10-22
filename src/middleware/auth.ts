import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../config/config";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    
    res.status(401).json({ message: "Brak tokenu autoryzacyjnego" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    // Przykład payloadu z Twojego tokenu:
    // { sub: "USER_ID", email: "mail@test.pl", username: "user", iat: ..., exp: ... }

    req.user = {
      id: payload.sub as string,
      email: payload.email,
      username: payload.username,
    };

    next(); // ✅ token poprawny — wpuszczamy dalej
  } catch (err) {
    res.status(401).json({ message: "Nieprawidłowy lub wygasły token" });
    return;
  }
}