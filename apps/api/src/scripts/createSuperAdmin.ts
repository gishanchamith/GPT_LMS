// Bootstraps the single super admin from environment variables. Idempotent.
// A script instead of an endpoint: an endpoint that mints super admins is a permanent backdoor.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { ensureSuperAdmin } from '../services/bootstrap.service.js';

try {
  await connectDB(process.env.MONGODB_URI);
  await User.init(); // make sure the single-superadmin index exists
  const { user, created } = await ensureSuperAdmin({
    name: process.env.SUPERADMIN_NAME,
    username: process.env.SUPERADMIN_USERNAME,
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  });
  console.log(
    created
      ? `Super admin created: ${user.username}`
      : `Super admin already exists (${user.username}); nothing to do`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
