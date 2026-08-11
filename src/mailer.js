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

async function sendWithBrevo(message) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is not configured');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: message.fromName, email: senderEmail },
      to: [{ email: message.to, name: message.toName }],
      ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html
    }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`BREVO_${response.status}: ${error.code || error.message || 'request failed'}`);
  }

  return response.json();
}

async function sendEmail(message) {
  if (process.env.BREVO_API_KEY) return sendWithBrevo(message);

  const mailer = getTransporter();
  if (!mailer) throw new Error('Email delivery is not configured');
  return mailer.sendMail({
    from: `${message.fromName} <${process.env.EMAIL_USER}>`,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

async function sendSubmissionNotification(type, submission) {
  const recipient = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
  if (!recipient) return false;
  const submittedFields = Object.entries(submission).filter(([, value]) => value);
  const fields = submittedFields
    .map(([key, value]) => `<tr><th style="padding:8px 12px;text-align:left;vertical-align:top;background:#f3f6f9">${escapeHtml(fieldLabel(key))}</th><td style="padding:8px 12px">${escapeHtml(value)}</td></tr>`)
    .join('');
  const submittedText = submittedFields
    .map(([key, value]) => `${fieldLabel(key)}: ${value}`)
    .join('\n');

  const messages = [
    {
      fromName: 'AWeA Website',
      to: recipient,
      replyTo: submission.email,
      subject: `New ${type} submission - ${submission.name}`,
      text: submittedText,
      html: `<div style="font-family:Arial,sans-serif;color:#172b42"><h2 style="color:#123f70">New ${escapeHtml(type)} submission</h2><table style="border-collapse:collapse;width:100%;max-width:680px" border="1" bordercolor="#dce4ec">${fields}</table></div>`
    },
    {
      fromName: 'AWeA',
      to: submission.email,
      toName: submission.name,
      subject: 'We received your AWeA enquiry',
      text: `Hello ${submission.name},\n\nThank you for contacting AWeA. We have received your ${type} submission.\n\nYour submitted details:\n${submittedText}\n\nOur team will review your enquiry and contact you shortly.\n\nRegards,\nAWeA - Agile We Advance`,
      html: `<div style="font-family:Arial,sans-serif;color:#172b42;line-height:1.6"><h2 style="color:#123f70">Thank you for contacting AWeA</h2><p>Hello ${escapeHtml(submission.name)},</p><p>We have received your ${escapeHtml(type)} submission. Our team will review it and contact you shortly.</p><h3 style="color:#123f70">Your submitted details</h3><table style="border-collapse:collapse;width:100%;max-width:680px" border="1" bordercolor="#dce4ec">${fields}</table><p style="margin-top:24px">Regards,<br><strong>AWeA - Agile We Advance</strong></p></div>`
    }
  ];

  const results = await Promise.allSettled(messages.map(sendEmail));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const target = index === 0 ? 'Client notification' : 'User confirmation';
      console.error(`${target} email failed:`, result.reason?.code || result.reason?.message || 'unknown error');
    }
  });

  return results.every((result) => result.status === 'fulfilled');
}

module.exports = { sendSubmissionNotification };
