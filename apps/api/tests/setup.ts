import { afterAll, afterEach, beforeAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { ensureDefaultCategories } from '../src/services/category.service.js';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Each test file gets its own database so files can run in parallel.
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${randomUUID().slice(0, 8)}` });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

// Every test starts with the default categories, like a freshly started server.
beforeEach(async () => {
  await ensureDefaultCategories();
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
