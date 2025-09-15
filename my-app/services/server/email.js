// email.js
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

export async function sendAuditReportEmail({ to, subject, text, folderPath }) {
  // Load SMTP settings from environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

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
    from: `SilverSurfers <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBasicEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const mailOptions = {
    from: `SilverSurfers <${process.env.SMTP_USER}>`,
    to,
    subject,
    text
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}
