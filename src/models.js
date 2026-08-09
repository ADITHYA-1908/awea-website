const { mongoose } = require('./db');

const sharedOptions = {
  timestamps: true,
  versionKey: false
};

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120, trim: true },
  email: { type: String, required: true, maxlength: 160, trim: true, lowercase: true },
  phone: { type: String, maxlength: 30, trim: true },
  company: { type: String, maxlength: 160, trim: true },
  service: { type: String, maxlength: 120, trim: true },
  message: { type: String, required: true, maxlength: 5000, trim: true }
}, sharedOptions);

const diagnosticRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120, trim: true },
  email: { type: String, required: true, maxlength: 160, trim: true, lowercase: true },
  phone: { type: String, maxlength: 30, trim: true },
  company: { type: String, required: true, maxlength: 160, trim: true },
  annualRevenue: { type: String, maxlength: 80, trim: true },
  challenge: { type: String, required: true, maxlength: 5000, trim: true }
}, sharedOptions);

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema, 'contact_messages');
const DiagnosticRequest = mongoose.model('DiagnosticRequest', diagnosticRequestSchema, 'diagnostic_requests');

module.exports = { ContactMessage, DiagnosticRequest };
