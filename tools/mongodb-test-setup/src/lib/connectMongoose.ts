import type { MakeRequired } from '@models/types/shared';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Initializes Mongoose's default connection to a MongoDB Memory Server instance.
 * @param server - The MongoDB Memory Server instance.
 * @param options - Additional options to pass to the `mongoose.connect` function. Defaults to `{ dbName: 'test' }`.
 */
export async function connectMongoose(
  server: MongoMemoryServer,
  options: ConnectMongooseOptions = {
    dbName: 'test',
  },
): Promise<void> {
  await mongoose.connect(server.getUri(), {
    ...options,
  });
}

export type ConnectMongooseOptions = MakeRequired<
  mongoose.ConnectOptions,
  'dbName'
>;
