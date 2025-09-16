// email.js
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
// Load .env from current working directory first, then fallback three levels up
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = typeof process.env.SMTP_SECURE === 'string'
    ? process.env.SMTP_SECURE === 'true'
    : port === 465; // default secure for 465
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    return { transporter: null, reason: 'SMTP not configured (missing SMTP_HOST)' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 20000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,
    // Optionally allow skipping TLS verification for dev setups
    ...(process.env.SMTP_IGNORE_TLS_ERRORS === 'true' ? { tls: { rejectUnauthorized: false } } : {}),
  });

  return { transporter };
}

export async function sendAuditReportEmail({ to, subject, text, folderPath }) {
  const { transporter, reason } = buildTransport();
  if (!transporter) {
    console.warn('Email skipped:', reason);
    return { success: false, error: reason };
  }

  // Collect all files in the report folder
  let attachments = [];
  if (folderPath) {
    try {
      const dirEntries = await fs.readdir(folderPath, { withFileTypes: true });
      attachments = dirEntries
        .filter(de => de.isFile())
        .map(de => ({ filename: de.name, path: path.join(folderPath, de.name) }));
    } catch (err) {
      console.error('Error reading report folder:', err);
    }
  }

  const mailOptions = {
    from: `SilverSurfers <${process.env.SMTP_USER || 'no-reply@silversurfers.local'}>`,
    to,
    subject,
    text,
    attachments,
  };

  try {
    // Verify transport before sending to fail fast with clearer errors
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBasicEmail({ to, subject, text }) {
  const { transporter, reason } = buildTransport();
  if (!transporter) {
    console.warn('Email skipped:', reason);
    return { success: false, error: reason };
  }
  const mailOptions = {
    from: `SilverSurfers <${process.env.SMTP_USER || 'no-reply@silversurfers.local'}>`,
    to,
    subject,
    text,
  };
  try {
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}
