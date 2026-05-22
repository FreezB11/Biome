import { nanoid } from "nanoid";
import type { DomainType, Money, NormalizedItem } from "../entities";

type SearchInput = {
  query: string;
  domain: DomainType;
  filters?: Record<string, unknown>;
};

export type ProviderSearchResult = {
  provider: string;
  items: NormalizedItem[];
};

function inr(amount: number): Money {
  return { currency: "INR", amount: Math.round(amount) };
}

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "";
}

function getRapidApiProviderConfig(provider: string) {
  const key = provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const host = process.env[`RAPIDAPI_${key}_HOST`] || "";
  const url = process.env[`RAPIDAPI_${key}_SEARCH_URL`] || "";
  const detailsUrl = process.env[`RAPIDAPI_${key}_DETAILS_URL`] || "";
  return { host, url, detailsUrl };
}

async function fetchJsonWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    return (await r.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

function pickString(v: unknown, keys: string[]): string | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (typeof val === "string" && val.trim()) return val;
  }
  return undefined;
}

function pickNumber(v: unknown, keys: string[]): number | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() && Number.isFinite(Number(val))) return Number(val);
  }
  return undefined;
}

function pickArray(v: unknown, keys: string[]): unknown[] | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (Array.isArray(val)) return val;
  }
  return undefined;
}

async function rapidApiSearchEcommerce(input: { provider: string; query: string }): Promise<NormalizedItem[] | null> {
  const apiKey = getRapidApiKey();
  if (!apiKey) return null;
  const cfg = getRapidApiProviderConfig(input.provider);
  if (!cfg.host || !cfg.url) return null;

  const u = new URL(cfg.url);
  if (u.toString().includes("{query}")) {
    const replaced = cfg.url.replaceAll("{query}", encodeURIComponent(input.query));
    const ur = new URL(replaced);
    const json = await fetchJsonWithTimeout(ur.toString(), { "x-rapidapi-key": apiKey, "x-rapidapi-host": cfg.host });
    return normalizeRapidApiEcomItems(json, input.provider, input.query);
  }

  if (!u.searchParams.has("query") && !u.searchParams.has("q")) u.searchParams.set("query", input.query);
  const json = await fetchJsonWithTimeout(u.toString(), { "x-rapidapi-key": apiKey, "x-rapidapi-host": cfg.host });
  return normalizeRapidApiEcomItems(json, input.provider, input.query);
}

async function rapidApiGetEcommerceDetails(input: { provider: string; id: string }): Promise<NormalizedItem | null> {
  const apiKey = getRapidApiKey();
  if (!apiKey) return null;
  const cfg = getRapidApiProviderConfig(input.provider);
  if (!cfg.host || !cfg.detailsUrl) return null;

  const rawUrl = cfg.detailsUrl.replaceAll("{id}", encodeURIComponent(input.id));
  const u = new URL(rawUrl);
  if (!cfg.detailsUrl.includes("{id}")) {
    if (!u.searchParams.has("id") && !u.searchParams.has("product_id") && !u.searchParams.has("asin")) {
      u.searchParams.set("id", input.id);
    }
  }

  const json = await fetchJsonWithTimeout(u.toString(), { "x-rapidapi-key": apiKey, "x-rapidapi-host": cfg.host });
  const obj = (json && typeof json === "object" ? json : null) as Record<string, unknown> | null;

  const name = pickString(obj, ["name", "title", "product_title", "productTitle"]);
  const url = pickString(obj, ["url", "link", "product_url", "productUrl", "product_link"]);
  const img = pickString(obj, ["image", "imageUrl", "image_url", "thumbnail", "thumbnail_url"]);
  const amount =
    pickNumber(obj, ["final_price", "price", "sale_price", "salePrice", "offer_price", "offerPrice"]) ??
    pickNumber(pickArray(obj, ["offers"])?.[0], ["price"]);
  const rating = pickNumber(obj, ["rating", "stars", "average_rating", "avg_rating"]);
  const reviewsCount = pickNumber(obj, ["reviews", "reviewsCount", "ratings_total", "ratingsTotal", "reviews_total"]);

  if (!name && typeof amount !== "number" && !url) return null;

  return {
    id: input.id,
    name: name || "Item details",
    provider: input.provider,
    domain: "ecommerce",
    itemUrl: url || "https://example.com/checkout",
    imageUrl: img,
    rating: typeof rating === "number" ? Number(rating.toFixed(1)) : undefined,
    reviewsCount: typeof reviewsCount === "number" ? Math.round(reviewsCount) : undefined,
    finalPrice: { currency: "INR", amount: Math.round(typeof amount === "number" ? amount : 999) },
    raw: json,
  };
}

function normalizeRapidApiEcomItems(json: unknown, provider: string, query: string): NormalizedItem[] {
  const arr =
    (Array.isArray(json) ? json : undefined) ||
    pickArray(json, ["products", "items", "data", "results", "result", "response"]);

  if (!arr) return [];

  const items: NormalizedItem[] = [];
  for (const x of arr) {
    const name = pickString(x, ["name", "title", "product_title", "productTitle"]) || query;
    const url =
      pickString(x, ["url", "link", "product_url", "productUrl", "product_link"]) || "https://example.com/checkout";
    const amount =
      pickNumber(x, ["final_price", "price", "sale_price", "salePrice", "offer_price", "offerPrice"]) ??
      pickNumber(pickArray(x, ["offers"])?.[0], ["price"]) ??
      guessBasePrice("ecommerce");
    const rating = pickNumber(x, ["rating", "stars", "average_rating", "avg_rating"]);
    const reviewsCount = pickNumber(x, ["reviews", "reviewsCount", "ratings_total", "ratingsTotal", "reviews_total"]);

    items.push({
      id: `${provider.toLowerCase()}_${nanoid(10)}`,
      name,
      provider,
      domain: "ecommerce",
      itemUrl: url,
      rating: typeof rating === "number" ? Number(rating.toFixed(1)) : undefined,
      reviewsCount: typeof reviewsCount === "number" ? Math.round(reviewsCount) : undefined,
      finalPrice: { currency: "INR", amount: Math.round(amount) },
    });
  }

  return items.slice(0, 12);
}

function guessBasePrice(domain: DomainType) {
  if (domain === "food") return 250;
  if (domain === "rides") return 180;
  if (domain === "travel") return 4500;
  if (domain === "hospitality") return 2200;
  return 65000;
}

function mockItems(domain: DomainType, provider: string, query: string): NormalizedItem[] {
  const base = guessBasePrice(domain);
  const n = 6;
  return Array.from({ length: n }).map((_, idx) => {
    const price = base * (0.85 + idx * 0.08) + Math.random() * base * 0.05;
    const rating = Math.min(5, 4.2 + Math.random() * 0.7);
    const deliveryEtaMinutes =
      domain === "food"
        ? 20 + idx * 5
        : domain === "rides"
          ? 3 + idx * 2
          : domain === "ecommerce"
            ? undefined
            : undefined;

    return {
      id: `${provider.toLowerCase()}_${nanoid(10)}`,
      name: query,
      provider,
      domain,
      itemUrl: "https://example.com/checkout",
      rating: Number(rating.toFixed(1)),
      reviewsCount: Math.floor(200 + Math.random() * 5000),
      finalPrice: inr(price),
      deliveryEtaMinutes,
      offersApplied: [
        { type: "platform", label: "Platform offer", value: inr(Math.max(0, base * 0.05)) },
      ],
    };
  });
}

export class ProductService {
  async searchAcrossProviders(input: SearchInput): Promise<ProviderSearchResult[]> {
    const providers =
      input.domain === "ecommerce"
        ? ["Amazon", "Flipkart", "Myntra"]
        : input.domain === "food"
          ? ["Swiggy", "Zomato", "ONDC"]
          : input.domain === "rides"
            ? ["Uber", "Ola", "Rapido", "ONDC"]
            : input.domain === "travel"
              ? ["MakeMyTrip", "IRCTC", "RedBus"]
              : ["OYO", "Booking.com", "Airbnb"];

    const results = await Promise.all(
      providers.map(async (provider) => {
        if (input.domain === "ecommerce") {
          try {
            const real = await rapidApiSearchEcommerce({ provider, query: input.query });
            if (real && real.length) return { provider, items: real };
          } catch {
            return { provider, items: mockItems(input.domain, provider, input.query) };
          }
        }
        return { provider, items: mockItems(input.domain, provider, input.query) };
      })
    );

    return results;
  }

  async getDetails(id: string, provider: string): Promise<NormalizedItem | null> {
    try {
      const real = await rapidApiGetEcommerceDetails({ provider, id });
      if (real) return real;
    } catch {
    }
    return {
      id,
      name: "Item details",
      provider,
      domain: "ecommerce",
      itemUrl: "https://example.com/checkout",
      finalPrice: inr(999),
    };
  }

  async getAlternatives(id: string, provider: string): Promise<NormalizedItem[]> {
    return mockItems("ecommerce", provider, "Similar item").slice(0, 4).map((i) => ({ ...i, id: `${id}_${i.id}` }));
  }
}

export const productService = new ProductService();
