import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { query } from "../../db/index.js";

const transporter =
  env.nodeEnv !== "production" && env.smtpHost === "mailhog"
    ? nodemailer.createTransport({
        jsonTransport: true
      })
    : nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: false,
        auth:
          env.smtpUser || env.smtpPass
            ? {
                user: env.smtpUser,
                pass: env.smtpPass
              }
            : undefined
      });

export async function logEmail({
  userId,
  recipientEmail,
  emailType,
  subject,
  status,
  providerMessageId = null,
  errorMessage = null
}) {
  await query(
    `
      INSERT INTO email_logs (
        user_id, recipient_email, email_type, subject, status, provider_message_id, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [userId, recipientEmail, emailType, subject, status, providerMessageId, errorMessage]
  );
}

export async function sendSetupEmail({ userId, recipientEmail, fullName, setupUrl }) {
  const subject = "Set up your attendance system password";
  const html = `
    <p>Hello ${fullName},</p>
    <p>Your account has been created. Use the link below to set your password:</p>
    <p><a href="${setupUrl}">${setupUrl}</a></p>
  `;

  try {
    const info = await transporter.sendMail({
      from: env.smtpFrom,
      to: recipientEmail,
      subject,
      html
    });

    await logEmail({
      userId,
      recipientEmail,
      emailType: "password_setup",
      subject,
      status: "sent",
      providerMessageId: info.messageId
    });
  } catch (error) {
    await logEmail({
      userId,
      recipientEmail,
      emailType: "password_setup",
      subject,
      status: "failed",
      errorMessage: error.message
    });
    throw error;
  }
}
