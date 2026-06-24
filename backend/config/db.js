const mongoose = require('mongoose');
const dns = require('dns');

// Windows DNS stub resolver refuses TCP SRV queries; use Google DNS instead
dns.setServers(['8.8.8.8', '8.8.4.4']);

let cached = global._mongooseConnection;
if (!cached) cached = global._mongooseConnection = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) throw new Error('MONGODB_URI environment variable is not set');

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, { bufferCommands: false }).then(m => {
      console.log(`MongoDB connected: ${m.connection.host}`);
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
