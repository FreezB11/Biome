import type { Collection } from "mongodb";
import { getMongoDb } from "../db/mongo";

export type OtpChannel = "email" | "phone";

export type OtpRecord = {
  requestId: string;
  channel: OtpChannel;
  destination: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  attemptsLeft: number;
  resendCount: number;
};

export interface OtpStore {
  create(record: OtpRecord): Promise<void>;
  get(requestId: string): Promise<OtpRecord | null>;
  update(requestId: string, patch: Partial<Pick<OtpRecord, "otpHash" | "attemptsLeft" | "resendCount" | "expiresAt">>): Promise<void>;
  delete(requestId: string): Promise<void>;
}

export class InMemoryOtpStore implements OtpStore {
  private store = new Map<string, OtpRecord>();

  async create(record: OtpRecord) {
    this.store.set(record.requestId, record);
  }

  async get(requestId: string) {
    return this.store.get(requestId) ?? null;
  }

  async update(requestId: string, patch: Partial<Pick<OtpRecord, "otpHash" | "attemptsLeft" | "resendCount" | "expiresAt">>) {
    const current = this.store.get(requestId);
    if (!current) return;
    this.store.set(requestId, { ...current, ...patch });
  }

  async delete(requestId: string) {
    this.store.delete(requestId);
  }
}

type MongoOtpDoc = {
  _id: string;
  channel: OtpChannel;
  destination: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  attemptsLeft: number;
  resendCount: number;
};

export class MongoOtpStore implements OtpStore {
  private collectionPromise: Promise<Collection<MongoOtpDoc>> | null = null;

  private async collection() {
    if (!this.collectionPromise) {
      this.collectionPromise = (async () => {
        const db = await getMongoDb();
        const col = db.collection<MongoOtpDoc>("otp_requests");
        await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await col.createIndex({ destination: 1, channel: 1, createdAt: -1 });
        return col;
      })();
    }
    return this.collectionPromise;
  }

  async create(record: OtpRecord) {
    const col = await this.collection();
    await col.insertOne({
      _id: record.requestId,
      channel: record.channel,
      destination: record.destination,
      otpHash: record.otpHash,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      attemptsLeft: record.attemptsLeft,
      resendCount: record.resendCount,
    });
  }

  async get(requestId: string) {
    const col = await this.collection();
    const doc = await col.findOne({ _id: requestId });
    if (!doc) return null;
    return {
      requestId: doc._id,
      channel: doc.channel,
      destination: doc.destination,
      otpHash: doc.otpHash,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      attemptsLeft: doc.attemptsLeft,
      resendCount: doc.resendCount,
    };
  }

  async update(
    requestId: string,
    patch: Partial<Pick<OtpRecord, "otpHash" | "attemptsLeft" | "resendCount" | "expiresAt">>
  ) {
    const col = await this.collection();
    await col.updateOne({ _id: requestId }, { $set: patch });
  }

  async delete(requestId: string) {
    const col = await this.collection();
    await col.deleteOne({ _id: requestId });
  }
}

export function createOtpStore(): OtpStore {
  if (process.env.MONGODB_URI) {
    return new MongoOtpStore();
  }
  return new InMemoryOtpStore();
}

