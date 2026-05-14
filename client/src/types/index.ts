/* Domain Types */
export type DomainType = 'ecommerce' | 'food' | 'rides' | 'travel' | 'hospitality';

/* Product/Item Types */
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  platform: string;
  category: string;
  description?: string;
  inStock: boolean;
  discount?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  deliveryTime: number;
  deliveryFee: number;
  image: string;
  isOpen: boolean;
  priceRange: string;
}

export interface Ride {
  id: string;
  type: 'bike' | 'auto' | 'cab' | 'premium';
  fare: number;
  eta: number;
  driverRating: number;
  vehicle: string;
  platform: string;
}

export interface Flight {
  id: string;
  airline: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  stops: number;
  image: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  amenities: string[];
  availability: boolean;
}

/* Deal & Offer Types */
export interface Deal {
  id: string;
  title: string;
  discount: number;
  code?: string;
  expiresAt: Date;
  platform: string;
  category: DomainType;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number | string;
  minAmount?: number;
  expiryDate: Date;
  platform: string;
  isActive: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: number | string;
  validUntil: Date;
  terms?: string;
}

/* AI Recommendation Types */
export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  items: Product[] | Restaurant[] | Ride[] | Flight[] | Hotel[];
  savings: number;
  confidence: number;
  reason: string;
}

export interface SearchQuery {
  query: string;
  domain: DomainType;
  budget?: number;
  filters?: Record<string, any>;
  timestamp: Date;
}

export interface SearchResult {
  id: string;
  query: SearchQuery;
  results: any[];
  recommendations: AIRecommendation[];
  totalSavings: number;
  processingTime: number;
}

export type BackendMoney = {
  currency: 'INR';
  amount: number;
};

export type BackendNormalizedItem = {
  id: string;
  name: string;
  provider: string;
  domain: DomainType;
  itemUrl: string;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  listPrice?: BackendMoney;
  finalPrice: BackendMoney;
  deliveryEtaMinutes?: number;
  offersApplied?: Array<{
    type: 'coupon' | 'bank' | 'wallet' | 'platform' | 'other';
    label: string;
    value?: BackendMoney;
    code?: string;
  }>;
};

export type BackendSearchResult = {
  searchId: string;
  query: string;
  intent: {
    domain: DomainType;
    category?: string;
    budget?: BackendMoney;
    features?: string[];
    keywords?: string[];
  };
  items: BackendNormalizedItem[];
  ai: {
    bestOverall?: BackendNormalizedItem;
    bestValue?: BackendNormalizedItem;
    recommendations: Array<{
      item: BackendNormalizedItem;
      reason: string;
      confidence: number;
    }>;
    comparisonInsights?: string[];
    reviewSummary?: string;
  };
  generatedAt: string;
  cache: { hit: boolean; key: string };
};

/* User Types */
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  preferences: UserPreferences;
  savedDeals: string[];
  purchaseHistory: Purchase[];
  cashback: number;
  rewards: number;
}

export interface UserPreferences {
  preferredDomains: DomainType[];
  priceRange: { min: number; max: number };
  deliveryPreference: 'fastest' | 'cheapest' | 'balanced';
  paymentMethods: string[];
  notificationsEnabled: boolean;
}

export interface Purchase {
  id: string;
  date: Date;
  domain: DomainType;
  amount: number;
  cashbackEarned: number;
  itemName: string;
  platform: string;
}

/* Notification Types */
export interface Notification {
  id: string;
  type: 'deal' | 'price_drop' | 'recommendation' | 'cashback' | 'order';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

/* Analytics Types */
export interface Analytics {
  totalSavings: number;
  dealsUsed: number;
  averageSavingsPerDeal: number;
  favoriteCategory: DomainType;
  totalCashback: number;
}
