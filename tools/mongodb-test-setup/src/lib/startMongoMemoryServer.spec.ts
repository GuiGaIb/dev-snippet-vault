import { MongoMemoryServer } from 'mongodb-memory-server';
import { startMongoMemoryServer } from './startMongoMemoryServer.js';

describe('startMongoMemoryServer', () => {
  let server: MongoMemoryServer;

  afterEach(async () => {
    await server?.stop({
      doCleanup: true,
    });
  });

  it('starts a MongoDB Memory Server instance', async () => {
    await expect(startServer()).resolves.toBeInstanceOf(MongoMemoryServer);
  });

  async function startServer() {
    server = await startMongoMemoryServer();
    return server;
  }
});
