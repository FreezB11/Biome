import { nanoid } from "nanoid";
import type { ClickEventEntity, OrderEntity, SearchHistoryEntity, UserEntity } from "../entities";

export class InMemoryUserRepo {
  private users = new Map<string, UserEntity>();

  async upsertByEmail(input: { email: string; name?: string; provider: "email" | "google" }) {
    const existing = Array.from(this.users.values()).find((u) => u.email === input.email);
    const now = new Date().toISOString();
    if (existing) {
      const updated: UserEntity = { ...existing, name: input.name ?? existing.name, lastLogin: now };
      this.users.set(updated.id, updated);
      return updated;
    }
    const created: UserEntity = {
      id: `usr_${nanoid(12)}`,
      email: input.email,
      name: input.name,
      provider: input.provider,
      createdAt: now,
      lastLogin: now,
    };
    this.users.set(created.id, created);
    return created;
  }

  async upsertByPhone(input: { phone: string; name?: string }) {
    const existing = Array.from(this.users.values()).find((u) => u.phone === input.phone);
    const now = new Date().toISOString();
    if (existing) {
      const updated: UserEntity = { ...existing, name: input.name ?? existing.name, lastLogin: now, provider: "phone" };
      this.users.set(updated.id, updated);
      return updated;
    }
    const created: UserEntity = {
      id: `usr_${nanoid(12)}`,
      phone: input.phone,
      name: input.name,
      provider: "phone",
      createdAt: now,
      lastLogin: now,
    };
    this.users.set(created.id, created);
    return created;
  }

  async getById(id: string) {
    return this.users.get(id) ?? null;
  }

  async updateById(id: string, patch: Partial<Pick<UserEntity, "name" | "preferences">>) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: UserEntity = { ...existing, ...patch };
    this.users.set(updated.id, updated);
    return updated;
  }
}

export class InMemorySearchRepo {
  private searches = new Map<string, SearchHistoryEntity>();

  async create(input: Omit<SearchHistoryEntity, "id" | "createdAt">) {
    const created: SearchHistoryEntity = {
      ...input,
      id: `srch_${nanoid(12)}`,
      createdAt: new Date().toISOString(),
    };
    this.searches.set(created.id, created);
    return created;
  }

  async getById(id: string) {
    return this.searches.get(id) ?? null;
  }

  async listByUser(userId: string, limit = 20) {
    return Array.from(this.searches.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export class InMemoryClickRepo {
  private clicks = new Map<string, ClickEventEntity>();

  async create(input: Omit<ClickEventEntity, "id" | "createdAt">) {
    const created: ClickEventEntity = {
      ...input,
      id: `clk_${nanoid(12)}`,
      createdAt: new Date().toISOString(),
    };
    this.clicks.set(created.id, created);
    return created;
  }

  async listByUser(userId: string, limit = 50) {
    return Array.from(this.clicks.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export class InMemoryOrderRepo {
  private orders = new Map<string, OrderEntity>();

  async create(input: Omit<OrderEntity, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const created: OrderEntity = {
      ...input,
      id: `ord_${nanoid(12)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(created.id, created);
    return created;
  }

  async getById(id: string) {
    return this.orders.get(id) ?? null;
  }

  async listByUser(userId: string, limit = 50) {
    return Array.from(this.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async updateById(id: string, patch: Partial<Pick<OrderEntity, "status" | "paymentIntentId" | "metadata" | "title" | "amount" | "itemUrl">>) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: OrderEntity = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.orders.set(updated.id, updated);
    return updated;
  }

  async listByStatus(status: OrderEntity["status"], limit = 50) {
    return Array.from(this.orders.values())
      .filter((o) => o.status === status)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(0, limit);
  }
}
