const nodemailer = require('nodemailer');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const fieldLabel = (key) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (character) => character.toUpperCase());

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
  const submittedFields = Object.entries(submission).filter(([, value]) => value);
  const fields = submittedFields
    .map(([key, value]) => `<tr><th style="padding:8px 12px;text-align:left;vertical-align:top;background:#f3f6f9">${escapeHtml(fieldLabel(key))}</th><td style="padding:8px 12px">${escapeHtml(value)}</td></tr>`)
    .join('');
  const submittedText = submittedFields
    .map(([key, value]) => `${fieldLabel(key)}: ${value}`)
    .join('\n');

  const messages = [
    {
      from: `AWeA Website <${process.env.EMAIL_USER}>`,
      to: recipient,
      replyTo: submission.email,
      subject: `New ${type} submission - ${submission.name}`,
      text: submittedText,
      html: `<div style="font-family:Arial,sans-serif;color:#172b42"><h2 style="color:#123f70">New ${escapeHtml(type)} submission</h2><table style="border-collapse:collapse;width:100%;max-width:680px" border="1" bordercolor="#dce4ec">${fields}</table></div>`
    },
    {
      from: `AWeA <${process.env.EMAIL_USER}>`,
      to: submission.email,
      subject: 'We received your AWeA enquiry',
      text: `Hello ${submission.name},\n\nThank you for contacting AWeA. We have received your ${type} submission.\n\nYour submitted details:\n${submittedText}\n\nOur team will review your enquiry and contact you shortly.\n\nRegards,\nAWeA - Agile We Advance`,
      html: `<div style="font-family:Arial,sans-serif;color:#172b42;line-height:1.6"><h2 style="color:#123f70">Thank you for contacting AWeA</h2><p>Hello ${escapeHtml(submission.name)},</p><p>We have received your ${escapeHtml(type)} submission. Our team will review it and contact you shortly.</p><h3 style="color:#123f70">Your submitted details</h3><table style="border-collapse:collapse;width:100%;max-width:680px" border="1" bordercolor="#dce4ec">${fields}</table><p style="margin-top:24px">Regards,<br><strong>AWeA - Agile We Advance</strong></p></div>`
    }
  ];

  const results = await Promise.allSettled(messages.map((message) => mailer.sendMail(message)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const target = index === 0 ? 'Client notification' : 'User confirmation';
      console.error(`${target} email failed:`, result.reason?.code || result.reason?.message || 'unknown error');
    }
  });

  return results.every((result) => result.status === 'fulfilled');
}

module.exports = { sendSubmissionNotification };
