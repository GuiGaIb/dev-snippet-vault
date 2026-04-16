import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { connectMongoose } from './connectMongoose.js';
import { startMongoMemoryServer } from './startMongoMemoryServer.js';

describe('connectMongoose', () => {
  it("connects Mongoose's default connection to the passed MongoDB Memory Server instance", async () => {
    const server = await startMongoMemoryServer();
    const dbName = faker.string.alphanumeric(10);

    await connectMongoose(server, {
      dbName,
    });

    expect(mongoose.connection.readyState).toBe(
      mongoose.ConnectionStates.connected,
    );
    expect(mongoose.connection.db).toBeDefined();
    expect(mongoose.connection.db?.databaseName).toBe(dbName);

    // Cleanup
    await mongoose.disconnect();
    await server.stop({
      doCleanup: true,
    });

    expect(mongoose.connection.readyState).toBe(
      mongoose.ConnectionStates.disconnected,
    );
  });
});
