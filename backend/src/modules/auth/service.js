import { env } from "../../config/env.js";
import { badRequest, unauthorized } from "../../lib/errors.js";
import {
  comparePassword,
  createJwt,
  hashPassword,
  hashToken,
  randomToken
} from "../../lib/security.js";
import { sendSetupEmail } from "../notifications/service.js";
import { findValidSetupToken, createSetupTokenRecord, markSetupTokenUsed } from "./repository.js";
import { findUserByEmail, findUserById, setPasswordHash } from "../users/repository.js";

export async function issueSetupLink(user) {
  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.setupTokenExpiresHours * 60 * 60 * 1000
  ).toISOString();

  await createSetupTokenRecord({
    userId: user.id,
    tokenHash,
    expiresAt
  });

  const setupUrl = `${env.frontendUrl}/setup-password?token=${rawToken}`;

  await sendSetupEmail({
    userId: user.id,
    recipientEmail: user.email,
    fullName: user.full_name,
    setupUrl
  });

  return { setupUrl };
}

export async function completePasswordSetup(token, password) {
  if (!token || !password) {
    throw badRequest("Token and password are required");
  }

  const setupToken = await findValidSetupToken(hashToken(token));

  if (!setupToken) {
    throw badRequest("Invalid or expired setup token");
  }

  const passwordHash = await hashPassword(password);
  await setPasswordHash(setupToken.user_id, passwordHash);
  await markSetupTokenUsed(setupToken.id);
}

export async function login(email, password) {
  const user = await findUserByEmail(email);

  if (!user || !user.password_hash || !user.is_active) {
    throw unauthorized("Invalid credentials");
  }

  const passwordOk = await comparePassword(password, user.password_hash);

  if (!passwordOk) {
    throw unauthorized("Invalid credentials");
  }

  return {
    token: createJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    }),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    }
  };
}

export async function getProfile(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw unauthorized("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    approverUserId: user.approver_user_id,
    delegateUserId: user.delegate_user_id
  };
}

