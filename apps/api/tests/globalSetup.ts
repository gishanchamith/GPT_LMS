import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

// One in-memory replica set for the whole run (a replica set so transactions work).
// Set MONGODB_URI_TEST to run against a real test database instead.
export default async function setup(project: TestProject) {
  if (process.env.MONGODB_URI_TEST) {
    project.provide('mongoUri', process.env.MONGODB_URI_TEST);
    return;
  }
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide('mongoUri', replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
