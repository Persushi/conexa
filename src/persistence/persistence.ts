import { Logger } from '@nestjs/common';
import mongoose, { type Connection, type Model, type Schema } from 'mongoose';

export type PersistenceMode = 'mongo' | 'memory';

export interface Persistence {
  mode: PersistenceMode;
  /** Open connection in `mongo` mode, null in `memory` mode. */
  connection: Connection | null;
}

export interface ConnectOptions {
  uri: string;
  timeoutMs: number;
  fallbackEnabled: boolean;
}

/**
 * Decides once, at boot, where data lives. When MongoDB cannot be reached the
 * app still starts on in-memory repositories (data is lost on restart) unless
 * the fallback is disabled, in which case booting fails loudly.
 */
export async function connectOrFallback(
  options: ConnectOptions,
): Promise<Persistence> {
  const logger = new Logger('Persistence');
  const connection = mongoose.createConnection(options.uri, {
    serverSelectionTimeoutMS: options.timeoutMs,
  });

  try {
    await connection.asPromise();
    logger.log('Connected to MongoDB');
    return { mode: 'mongo', connection };
  } catch (error) {
    await connection.close().catch(() => undefined);
    const reason = (error as Error).message;

    if (!options.fallbackEnabled) {
      throw new Error(
        `Could not connect to MongoDB and DB_FALLBACK_ENABLED=false: ${reason}`,
        { cause: error },
      );
    }
    logger.warn(
      `Could not connect to MongoDB (${reason}). Starting in DEGRADED mode on in-memory ` +
        'data: reads serve the bundled SWAPI snapshot, and every write is lost on restart.',
    );
    return { mode: 'memory', connection: null };
  }
}

/**
 * Registers a model once per connection (safe if a module is instantiated twice).
 * The casts are deliberate: instantiating mongoose's `Model<T>` generics with a
 * free `T` sends the compiler into runaway type recursion.
 */
export function modelFor<T>(
  connection: Connection,
  name: string,
  schema: Schema,
): Model<T> {
  const existing: unknown = connection.models[name];
  if (existing) return existing as Model<T>;
  return connection.model(name, schema) as unknown as Model<T>;
}
