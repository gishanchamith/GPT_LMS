import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Each test file gets its own database so files can run in parallel.
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${randomUUID().slice(0, 8)}` });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
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
