// Local MongoDB for development without Atlas: a single-node replica set (transactions work),
// with data kept in apps/api/.localdb between restarts. Stop with Ctrl+C.
import { mkdir } from 'node:fs/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const dbPath = new URL('../../.localdb', import.meta.url);
await mkdir(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: 'local', count: 1 },
  instanceOpts: [
    { port: 27018, dbPath: decodeURIComponent(dbPath.pathname.replace(/^\/(\w:)/, '$1')) },
  ],
});

console.log('Local MongoDB running. Put this in apps/api/.env:');
console.log('MONGODB_URI=mongodb://127.0.0.1:27018/GPT_LMS?replicaSet=local');

const stop = async () => {
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
