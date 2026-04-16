import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Starts a MongoDB Memory Server instance with the given database name using the
 * `wiredTiger` storage engine
 *
 * Since we use `mongodb ~7.0`, we need to use`wiredTiger` storage engine.
 *
 * @returns The MongoDB Memory Server instance.
 */
export async function startMongoMemoryServer(): Promise<MongoMemoryServer> {
  const server = await MongoMemoryServer.create({
    instance: {
      /**
       * Default storage is `ephemeralForTest`.
       * Since we use `mongodb ~7.0`, we need to use `wiredTiger` storage engine.
       */
      storageEngine: 'wiredTiger',
    },
  });

  return server;
}
