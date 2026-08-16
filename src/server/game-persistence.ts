import { MongoClient, type Collection } from "mongodb";
import type { GameState } from "./types";

const COLLECTION_NAME = "lauchgruen_quizz_game_state";
const SCHEMA_VERSION = 1;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredGame {
  gameId: string;
  schemaVersion: number;
  game: GameState;
  updatedAt: Date;
  expiresAt: Date;
}

const globalForMongo = globalThis as unknown as {
  __lauchgruenMongoClient?: Promise<MongoClient>;
  __lauchgruenMongoIndexes?: Promise<void>;
  __lauchgruenGameSaveQueues?: Map<string, Promise<void>>;
};

globalForMongo.__lauchgruenGameSaveQueues ??= new Map<string, Promise<void>>();

function mongoConfig(): { uri: string; dbName: string } | null {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();
  return uri && dbName ? { uri, dbName } : null;
}

export function gamePersistenceEnabled(): boolean {
  return mongoConfig() !== null;
}

async function mongoClient(): Promise<MongoClient> {
  const config = mongoConfig();
  if (!config) throw new Error("MONGODB_URI and MONGODB_DB must both be configured");

  globalForMongo.__lauchgruenMongoClient ??= new MongoClient(config.uri, {
    appName: "lauchgruen-quizz",
  }).connect();
  return globalForMongo.__lauchgruenMongoClient;
}

async function gameCollection(): Promise<Collection<StoredGame>> {
  const config = mongoConfig();
  if (!config) throw new Error("MongoDB game persistence is not configured");

  const client = await mongoClient();
  const collection = client.db(config.dbName).collection<StoredGame>(COLLECTION_NAME);
  globalForMongo.__lauchgruenMongoIndexes ??= Promise.all([
    collection.createIndex({ gameId: 1 }, { unique: true }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]).then(() => undefined);
  await globalForMongo.__lauchgruenMongoIndexes;
  return collection;
}

export async function restorePersistedGames(): Promise<GameState[]> {
  if (!gamePersistenceEnabled()) {
    console.warn("[persistence] MongoDB disabled; games will not survive a restart");
    return [];
  }

  const collection = await gameCollection();
  const documents = await collection
    .find({ schemaVersion: SCHEMA_VERSION, expiresAt: { $gt: new Date() } })
    .toArray();
  console.log(`[persistence] restored ${documents.length} game(s) from ${COLLECTION_NAME}`);
  return documents.map((document) => document.game);
}

export function saveGame(game: GameState): Promise<void> {
  if (!gamePersistenceEnabled()) return Promise.resolve();

  const snapshot = structuredClone(game);
  const queues = globalForMongo.__lauchgruenGameSaveQueues!;
  const previous = queues.get(game.id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const now = new Date();
      const collection = await gameCollection();
      await collection.replaceOne(
        { gameId: snapshot.id },
        {
          gameId: snapshot.id,
          schemaVersion: SCHEMA_VERSION,
          game: snapshot,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + RETENTION_MS),
        },
        { upsert: true },
      );
    });

  queues.set(game.id, next);
  void next.then(
    () => {
      if (queues.get(game.id) === next) queues.delete(game.id);
    },
    () => {
      if (queues.get(game.id) === next) queues.delete(game.id);
    },
  );
  return next;
}

export async function flushGamePersistence(): Promise<void> {
  const queues = globalForMongo.__lauchgruenGameSaveQueues;
  if (!queues?.size) return;
  await Promise.allSettled([...queues.values()]);
}

export async function closeGamePersistence(): Promise<void> {
  const clientPromise = globalForMongo.__lauchgruenMongoClient;
  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
  globalForMongo.__lauchgruenMongoClient = undefined;
  globalForMongo.__lauchgruenMongoIndexes = undefined;
}

export async function gamePersistenceHealth(): Promise<"disabled" | "connected"> {
  const config = mongoConfig();
  if (!config) return "disabled";
  const client = await mongoClient();
  await client.db(config.dbName).command({ ping: 1 });
  return "connected";
}
