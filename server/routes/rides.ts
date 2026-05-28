import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ridesService } from "../services/ridesService";

const router = Router();

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { "user-agent": "biome-server/1.0" },
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return (await r.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

router.get("/geocode", async (req: Request, res: Response) => {
  const parsed = z.object({ q: z.string().trim().min(2).max(200) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    return;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", parsed.data.q);
  url.searchParams.set("limit", "5");

  try {
    const json = await fetchJsonWithTimeout(url.toString(), 8000);
    res.json({ items: json });
  } catch {
    res.status(502).json({ error: "GEOCODE_FAILED" });
  }
});

router.get("/reverse", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    return;
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(parsed.data.lat));
  url.searchParams.set("lon", String(parsed.data.lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const json = await fetchJsonWithTimeout(url.toString(), 8000);
    res.json(json);
  } catch {
    res.status(502).json({ error: "REVERSE_GEOCODE_FAILED" });
  }
});

router.post("/fare-estimate", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      pickup: z.object({ lat: z.number(), lng: z.number() }),
      dropoff: z.object({ lat: z.number(), lng: z.number() }),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const out = await ridesService.getFareEstimate(parsed.data);
  res.json(out);
});

router.get("/available", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    return;
  }

  const out = await ridesService.getAvailable({ center: { lat: parsed.data.lat, lng: parsed.data.lng } });
  res.json(out);
});

router.post("/book", async (req: Request, res: Response) => {
  const parsed = z.object({ quoteId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }
  const out = await ridesService.book({ quoteId: parsed.data.quoteId });
  res.json(out);
});

export default router;
