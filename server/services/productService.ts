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
      providers.map(async (provider) => ({ provider, items: mockItems(input.domain, provider, input.query) }))
    );

    return results;
  }

  async getDetails(id: string, provider: string): Promise<NormalizedItem | null> {
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

