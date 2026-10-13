import nodemailer from 'nodemailer';
import fs from 'fs';
import { EmailJob } from '../types';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async (job: EmailJob): Promise<void> => {
  const { recipient, pdfPath, passId, candidateId } = job;
  
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found at ${pdfPath} for candidate ${candidateId}`);
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: `Your Event Pass is Ready [${passId}]`,
    text: `Hello,\n\nPlease find your event pass attached. Present this at the venue.\n\nPass ID: ${passId}\n\nThank you!`,
    html: `
      <p>Hello,</p>
      <p>Please find your personalized event pass attached to this email.</p>
      <p>Present the QR code or Pass ID at the venue for entry.</p>
      <p><strong>Pass ID:</strong> ${passId}</p>
      <p>Thank you!</p>
    `,
    attachments: [
      {
        filename: `EventPass-${passId}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
      },
    ],
  };

  const mailer = getTransporter();
  
  try {
    await mailer.sendMail(mailOptions);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${recipient}`, error);
    throw error;
  }
};
