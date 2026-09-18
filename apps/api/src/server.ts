import mongoose from 'mongoose';
import { assertEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

assertEnv();
await connectDB(process.env.MONGODB_URI);

const port = Number(process.env.PORT) || 5000;
const server = createApp().listen(port, () => {
  console.log(`API listening on port ${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
