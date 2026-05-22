import type { Collection, Db } from "mongodb";
import crypto from "crypto";
import { getMongoDb } from "../db/mongo";
import type { ClickEventEntity, OrderEntity, SearchHistoryEntity, UserEntity } from "../entities";
import type { InMemoryClickRepo, InMemoryOrderRepo, InMemorySearchRepo, InMemoryUserRepo } from "./inMemory";

type UserDoc = Omit<UserEntity, "id"> & { _id: string };
type SearchDoc = Omit<SearchHistoryEntity, "id"> & { _id: string };
type ClickDoc = Omit<ClickEventEntity, "id"> & { _id: string };
type OrderDoc = Omit<OrderEntity, "id"> & { _id: string };

async function collections(db?: Db) {
  const database = db ?? (await getMongoDb());

  const users = database.collection<UserDoc>("users");
  const searches = database.collection<SearchDoc>("search_history");
  const clicks = database.collection<ClickDoc>("click_events");
  const orders = database.collection<OrderDoc>("orders");

  await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  await users.createIndex({ phone: 1 }, { unique: true, sparse: true });
  await searches.createIndex({ userId: 1, createdAt: -1 });
  await clicks.createIndex({ userId: 1, createdAt: -1 });
  await clicks.createIndex({ searchId: 1, createdAt: -1 });
  await orders.createIndex({ userId: 1, createdAt: -1 });
  await orders.createIndex({ paymentIntentId: 1 }, { sparse: true });

  return { users, searches, clicks, orders };
}

export class MongoUserRepo implements Pick<InMemoryUserRepo, "upsertByEmail" | "upsertByPhone" | "getById"> {
  private colPromise: Promise<Collection<UserDoc>> | null = null;

  private async col() {
    if (!this.colPromise) {
      this.colPromise = collections().then((c) => c.users);
    }
    return this.colPromise;
  }

  async upsertByEmail(input: { email: string; name?: string; provider: "email" | "google" }) {
    const now = new Date().toISOString();
    const col = await this.col();

    const email = input.email.trim().toLowerCase();
    await col.updateOne(
      { email },
      {
        $set: { name: input.name, provider: input.provider, lastLogin: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const doc = await col.findOne({ email });
    if (!doc) throw new Error("USER_UPSERT_FAILED");
    return { ...doc, id: doc._id };
  }

  async upsertByPhone(input: { phone: string; name?: string }) {
    const now = new Date().toISOString();
    const col = await this.col();

    const phone = input.phone.trim();
    await col.updateOne(
      { phone },
      {
        $set: { name: input.name, provider: "phone", lastLogin: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const doc = await col.findOne({ phone });
    if (!doc) throw new Error("USER_UPSERT_FAILED");
    return { ...doc, id: doc._id };
  }

  async getById(id: string) {
    const col = await this.col();
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async updateById(id: string, patch: Partial<Pick<UserEntity, "name" | "preferences">>) {
    const col = await this.col();
    await col.updateOne({ _id: id }, { $set: patch });
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }
}

export class MongoSearchRepo implements Pick<InMemorySearchRepo, "create" | "getById" | "listByUser"> {
  private colPromise: Promise<Collection<SearchDoc>> | null = null;

  private async col() {
    if (!this.colPromise) {
      this.colPromise = collections().then((c) => c.searches);
    }
    return this.colPromise;
  }

  async create(input: Omit<SearchHistoryEntity, "id" | "createdAt">) {
    const col = await this.col();
    const createdAt = new Date().toISOString();
    const doc: SearchDoc = { _id: cryptoRandomId("srch"), ...input, createdAt };
    await col.insertOne(doc);
    return { ...doc, id: doc._id };
  }

  async getById(id: string) {
    const col = await this.col();
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async listByUser(userId: string, limit = 20) {
    const col = await this.col();
    const docs = await col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ ...d, id: d._id }));
  }
}

export class MongoClickRepo implements Pick<InMemoryClickRepo, "create" | "listByUser"> {
  private colPromise: Promise<Collection<ClickDoc>> | null = null;

  private async col() {
    if (!this.colPromise) {
      this.colPromise = collections().then((c) => c.clicks);
    }
    return this.colPromise;
  }

  async create(input: Omit<ClickEventEntity, "id" | "createdAt">) {
    const col = await this.col();
    const createdAt = new Date().toISOString();
    const doc: ClickDoc = { _id: cryptoRandomId("clk"), ...input, createdAt };
    await col.insertOne(doc);
    return { ...doc, id: doc._id };
  }

  async listByUser(userId: string, limit = 50) {
    const col = await this.col();
    const docs = await col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ ...d, id: d._id }));
  }
}

export class MongoOrderRepo implements Pick<InMemoryOrderRepo, "create" | "getById" | "listByUser" | "updateById"> {
  private colPromise: Promise<Collection<OrderDoc>> | null = null;

  private async col() {
    if (!this.colPromise) {
      this.colPromise = collections().then((c) => c.orders);
    }
    return this.colPromise;
  }

  async create(input: Omit<OrderEntity, "id" | "createdAt" | "updatedAt">) {
    const col = await this.col();
    const now = new Date().toISOString();
    const doc: OrderDoc = { _id: cryptoRandomId("ord"), ...input, createdAt: now, updatedAt: now };
    await col.insertOne(doc);
    return { ...doc, id: doc._id };
  }

  async getById(id: string) {
    const col = await this.col();
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async listByUser(userId: string, limit = 50) {
    const col = await this.col();
    const docs = await col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ ...d, id: d._id }));
  }

  async updateById(
    id: string,
    patch: Partial<Pick<OrderEntity, "status" | "paymentIntentId" | "metadata" | "title" | "amount" | "itemUrl">>
  ) {
    const col = await this.col();
    const updatedAt = new Date().toISOString();
    await col.updateOne({ _id: id }, { $set: { ...patch, updatedAt } });
    const doc = await col.findOne({ _id: id });
    if (!doc) return null;
    return { ...doc, id: doc._id };
  }

  async listByStatus(status: OrderEntity["status"], limit = 50) {
    const col = await this.col();
    const docs = await col.find({ status }).sort({ updatedAt: 1 }).limit(limit).toArray();
    return docs.map((d) => ({ ...d, id: d._id }));
  }
}

function cryptoRandomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}
