import type { LatLng } from "./foodService";

export type RideProvider = "Uber" | "Ola" | "Rapido" | "ONDC";
export type RideType = "bike" | "auto" | "cab" | "premium";

export type RideQuote = {
  id: string;
  provider: RideProvider;
  type: RideType;
  fare: number;
  etaMinutes: number;
  driverRating: number;
  distanceKm: number;
  surgeMultiplier?: number;
  deeplinkUrl: string;
};

function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export class RidesService {
  async getFareEstimate(input: { pickup: LatLng; dropoff: LatLng }): Promise<{ quotes: RideQuote[] }> {
    const dist = Number(distanceKm(input.pickup, input.dropoff).toFixed(1));
    const baseEta = clamp(Math.round(5 + dist * 3), 4, 60);

    const providers: RideProvider[] = ["Uber", "Ola", "Rapido", "ONDC"];
    const types: RideType[] = ["bike", "auto", "cab", "premium"];

    const quotes: RideQuote[] = [];
    for (const provider of providers) {
      for (const type of types) {
        const surge = Math.random() > 0.75 ? Number((1 + Math.random() * 0.6).toFixed(2)) : 1;
        const perKm =
          type === "bike" ? 10 : type === "auto" ? 14 : type === "cab" ? 18 : 28;
        const base = 35 + dist * perKm;
        const fare = Math.round(base * surge);

        quotes.push({
          id: `${provider.toLowerCase()}_${type}_${Math.random().toString(16).slice(2, 8)}`,
          provider,
          type,
          fare,
          etaMinutes: clamp(baseEta + (type === "premium" ? -1 : type === "bike" ? 2 : 0) + Math.round(Math.random() * 4), 3, 75),
          driverRating: Number((4.4 + Math.random() * 0.6).toFixed(1)),
          distanceKm: dist,
          surgeMultiplier: surge > 1 ? surge : undefined,
          deeplinkUrl: "https://example.com/checkout",
        });
      }
    }

    quotes.sort((a, b) => a.fare - b.fare);
    return { quotes };
  }

  async getAvailable(input: { center: LatLng }) {
    return {
      center: input.center,
      availability: [
        { provider: "Uber" as const, available: true },
        { provider: "Ola" as const, available: true },
        { provider: "Rapido" as const, available: true },
        { provider: "ONDC" as const, available: true },
      ],
    };
  }

  async book(input: { quoteId: string }) {
    return {
      bookingId: `bk_${Math.random().toString(16).slice(2, 10)}`,
      quoteId: input.quoteId,
      status: "CONFIRMED",
      deeplinkUrl: "https://example.com/checkout",
    };
  }
}

export const ridesService = new RidesService();

