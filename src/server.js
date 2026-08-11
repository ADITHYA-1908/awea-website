require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { connectDatabase, mongoose } = require('./db');
const { ContactMessage, DiagnosticRequest } = require('./models');
const { sendSubmissionNotification } = require('./mailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '20kb', type: 'application/json' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
const publicDirectory = path.join(__dirname, '..', 'public');
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

app.use(express.static(publicDirectory, {
  maxAge: '1d',
  etag: true,
  setHeaders(res, filePath) {
    if (path.basename(filePath) === 'index.html') {
      res.set(noCacheHeaders);
    }
  }
}));

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please wait and try again.' }
});

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);

function field(value, label, max, required = false) {
  const result = clean(value);
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} is too long.`);
  return result;
}

function rejectBots(req, res) {
  if (clean(req.body.website)) {
    res.status(201).json({ message: 'Thank you. Your message has been received.' });
    return true;
  }
  return false;
}

app.get('/api/health', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('Database not connected');
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true, database: 'mongodb' });
  } catch (_error) {
    res.status(503).json({ ok: false });
  }
});

app.post('/api/contact', submissionLimiter, async (req, res) => {
  if (rejectBots(req, res)) return;
  try {
    const name = field(req.body.name, 'Name', 120, true);
    const email = field(req.body.email, 'Email', 160, true).toLowerCase();
    const phone = field(req.body.phone, 'Phone', 30);
    const company = field(req.body.company, 'Company', 160);
    const service = field(req.body.service, 'Service', 120);
    const message = field(req.body.message, 'Message', 5000, true);
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    await ContactMessage.create({ name, email, phone, company, service, message });
    await sendSubmissionNotification('contact form', { name, email, phone, company, service, message });
    res.status(201).json({ message: 'Thank you. Your message has been received.' });
  } catch (error) {
    if (error instanceof TypeError || error.message.endsWith('required.') || error.message.endsWith('too long.')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Contact save failed');
    res.status(500).json({ message: 'Unable to save your message right now.' });
  }
});

app.post('/api/diagnostic', submissionLimiter, async (req, res) => {
  if (rejectBots(req, res)) return;
  try {
    const name = field(req.body.name, 'Name', 120, true);
    const email = field(req.body.email, 'Email', 160, true).toLowerCase();
    const phone = field(req.body.phone, 'Phone', 30);
    const company = field(req.body.company, 'Company', 160, true);
    const annualRevenue = field(req.body.annualRevenue, 'Annual revenue', 80);
    const challenge = field(req.body.challenge, 'Business challenge', 5000, true);
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    await DiagnosticRequest.create({ name, email, phone, company, annualRevenue, challenge });
    await sendSubmissionNotification('diagnostic review', { name, email, phone, company, annualRevenue, challenge });
    res.status(201).json({ message: 'Diagnostic review request submitted successfully.' });
  } catch (error) {
    if (error instanceof TypeError || error.message.endsWith('required.') || error.message.endsWith('too long.')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Diagnostic save failed');
    res.status(500).json({ message: 'Unable to submit your request right now.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'), { headers: noCacheHeaders });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ message: 'Invalid request.' });
  }
  console.error('Unhandled request error');
  res.status(500).json({ message: 'Unexpected server error.' });
});

async function startServer() {
  try {
    await connectDatabase();
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, '0.0.0.0', () => console.log(`AWeA website running on port ${PORT}`));
  } catch (_error) {
    console.error('MongoDB Atlas connection unavailable');
    process.exitCode = 1;
  }
}

startServer();
