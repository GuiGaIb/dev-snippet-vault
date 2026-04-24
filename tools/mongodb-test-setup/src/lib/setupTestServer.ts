import { MongoMemoryServer } from 'mongodb-memory-server';
import type { ConnectMongooseOptions } from './connectMongoose.js';

export function setupTestServer(
  options: ConnectMongooseOptions = { dbName: 'test' },
) {
  beforeAll(async () => {
    const server = await MongoMemoryServer.create({
      instance: {
        /**
         * Default storage is `ephemeralForTest`.
         * Since we use `mongodb ~7.0`, we need to use `wiredTiger` storage engine.
         */
        storageEngine: 'wiredTiger',
      },
    });

    const mongoose = await import('mongoose');
    await mongoose.connect(server.getUri(), options);

    return async () => {
      await mongoose.disconnect();
      await server.stop({
        doCleanup: true,
      });
    };
  });
}
