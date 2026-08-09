const mongoose = require('mongoose');
const dns = require('node:dns');

mongoose.set('bufferCommands', false);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');

  const dnsServers = (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length) dns.setServers(dnsServers);

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'awea_advisory',
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
    minPoolSize: 0
  });
}

mongoose.connection.on('error', () => console.error('MongoDB connection error'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

module.exports = { connectDatabase, mongoose };
