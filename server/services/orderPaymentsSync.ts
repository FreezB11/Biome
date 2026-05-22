import { orderRepo } from "../repositories";

function paymentsBaseUrl() {
  return process.env.PAYMENTS_SERVICE_URL || "http://localhost:4010";
}

type PaymentIntentStatus = "CREATED" | "ACTIVE" | "PAID" | "FAILED" | "CANCELLED";

function asStatus(v: unknown): PaymentIntentStatus | null {
  if (v === "CREATED" || v === "ACTIVE" || v === "PAID" || v === "FAILED" || v === "CANCELLED") return v;
  return null;
}

export function startOrderPaymentsSync() {
  const enabled = (process.env.ORDER_PAYMENTS_SYNC_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) return;

  const intervalMs = Math.max(10_000, Number(process.env.ORDER_PAYMENTS_SYNC_INTERVAL_MS || 30_000));
  const limit = Math.max(1, Math.min(200, Number(process.env.ORDER_PAYMENTS_SYNC_LIMIT || 50)));

  const tick = async () => {
    const pending = await orderRepo.listByStatus("PAYMENT_PENDING", limit);
    if (!pending.length) return;

    await Promise.all(
      pending.map(async (order) => {
        if (!order.paymentIntentId) return;
        try {
          const r = await fetch(`${paymentsBaseUrl()}/v1/payment_intents/${encodeURIComponent(order.paymentIntentId)}`);
          if (!r.ok) return;
          const json = (await r.json().catch(() => null)) as any;
          const status = asStatus(json?.status);
          if (!status) return;

          if (status === "PAID") {
            await orderRepo.updateById(order.id, { status: "CONFIRMED" });
          } else if (status === "FAILED") {
            await orderRepo.updateById(order.id, { status: "FAILED" });
          } else if (status === "CANCELLED") {
            await orderRepo.updateById(order.id, { status: "CANCELLED" });
          }
        } catch {
        }
      })
    );
  };

  void tick();
  setInterval(() => {
    void tick();
  }, intervalMs);
}
