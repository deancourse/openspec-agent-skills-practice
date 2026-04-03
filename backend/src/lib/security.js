import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createJwt(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
}

export function verifyJwt(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

