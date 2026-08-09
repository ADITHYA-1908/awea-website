const nodemailer = require('nodemailer');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
  return transporter;
}

async function sendSubmissionNotification(type, submission) {
  const mailer = getTransporter();
  if (!mailer) return false;

  const recipient = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
  const fields = Object.entries(submission)
    .filter(([, value]) => value)
    .map(([key, value]) => `<tr><th style="padding:8px 12px;text-align:left;vertical-align:top;background:#f3f6f9">${escapeHtml(key)}</th><td style="padding:8px 12px">${escapeHtml(value)}</td></tr>`)
    .join('');

  try {
    await mailer.sendMail({
      from: `AWeA Website <${process.env.EMAIL_USER}>`,
      to: recipient,
      replyTo: submission.email,
      subject: `New ${type} submission — ${submission.name}`,
      text: Object.entries(submission).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n'),
      html: `<div style="font-family:Arial,sans-serif;color:#172b42"><h2 style="color:#123f70">New ${escapeHtml(type)} submission</h2><table style="border-collapse:collapse;width:100%;max-width:680px" border="1" bordercolor="#dce4ec">${fields}</table></div>`
    });
    return true;
  } catch (_error) {
    console.error('Submission email notification failed');
    return false;
  }
}

module.exports = { sendSubmissionNotification };
