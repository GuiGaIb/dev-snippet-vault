import mongoose from 'mongoose';
import { setupTestServer } from './setupTestServer.js';

describe('setupTestServer', () => {
  setupTestServer();

  it("ensures that Mongoose's default connection state is connected", () => {
    expect(mongoose.connection.readyState).toBe(
      mongoose.ConnectionStates.connected,
    );
  });
});
