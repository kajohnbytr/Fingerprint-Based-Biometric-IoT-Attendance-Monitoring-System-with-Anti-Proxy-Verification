const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  const options = {};
  if (process.env.MONGODB_TLS === 'true' || mongoUri.startsWith('mongodb+srv://')) {
    options.tls = true;
    options.tlsAllowInvalidCertificates = process.env.MONGODB_TLS_ALLOW_INVALID === 'true';
  }

  try {
    await mongoose.connect(mongoUri, options);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
