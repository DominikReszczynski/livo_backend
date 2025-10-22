import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/config";
import { IUser } from "../models/user";

interface JwtBasePayload {
  sub: string;
  jti: string;
}

interface AccessPayload extends JwtBasePayload {
  email: string;
  username: string;
}

const refreshStore = new Map<string, { userId: string; exp: number }>();

export function signAccessToken(user: IUser): string {
  const payload: AccessPayload = {
    sub: user._id.toString(),
    jti: crypto.randomUUID(),
    email: user.email,
    username: user.username,
  };

  const options: SignOptions = { expiresIn: config.jwt.accessTtl as any };

  return jwt.sign(payload, config.jwt.accessSecret as Secret, options);
}

export function signRefreshToken(user: IUser): string {
  const jti = crypto.randomUUID();
  const payload: JwtBasePayload = { sub: user._id.toString(), jti };

  const options: SignOptions = { expiresIn: config.jwt.refreshTtl as any };

  const token = jwt.sign(payload, config.jwt.refreshSecret as Secret, options);

  const decoded = jwt.decode(token) as JwtPayload;
  if (decoded.exp) {
    refreshStore.set(jti, { userId: user._id.toString(), exp: decoded.exp });
  }

  return token;
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.accessSecret as Secret) as AccessPayload;
}

export function verifyRefreshToken(token: string): JwtBasePayload {
  return jwt.verify(token, config.jwt.refreshSecret as Secret) as JwtBasePayload;
}

export function isRefreshValid(payload: JwtBasePayload): boolean {
  const entry = refreshStore.get(payload.jti);
  return !!entry && entry.userId === payload.sub;
}

export function revokeRefresh(jti: string) {
  refreshStore.delete(jti);
}