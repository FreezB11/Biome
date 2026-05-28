import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * API Service Layer for Biome
 * Handles integration with ONDC, Amazon, Flipkart, Swiggy, Uber, etc.
 */

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const ONDC_PROTOCOL_BASE_URL = import.meta.env.VITE_ONDC_API_URL || '/api/ondc';

export const ONDC_ENDPOINTS = {
  search: '/search',
  select: '/select',
  init: '/init',
  confirm: '/confirm',
  status: '/status',
  track: '/track',
  cancel: '/cancel',
  update: '/update',
  rating: '/rating',
  support: '/support',
  on_search: '/on_search',
  on_select: '/on_select',
  on_init: '/on_init',
  on_confirm: '/on_confirm',
  on_status: '/on_status',
  on_track: '/on_track',
  on_cancel: '/on_cancel',
  on_update: '/on_update',
  on_rating: '/on_rating',
  on_support: '/on_support',
} as const;

// Create API instances
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const ondcClient: AxiosInstance = axios.create({
  baseURL: ONDC_PROTOCOL_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * E-Commerce API Services
 */
export const ecommerceAPI = {
  // Search products across platforms
  searchProducts: async (query: string, filters?: Record<string, any>) => {
    try {
      const response = await apiClient.post('/search/shopping', {
        query,
        filters,
      });
      return response.data;
    } catch (error) {
      console.error('Product search failed:', error);
      throw error;
    }
  },

  // Get product details
  getProductDetails: async (productId: string, platform: string) => {
    try {
      const response = await apiClient.get(`/ecommerce/products/${productId}`, {
        params: { platform },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch product details:', error);
      throw error;
    }
  },

  // Get price comparison across platforms
  getPriceComparison: async (productId: string) => {
    try {
      const response = await apiClient.get(`/ecommerce/price-comparison/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Price comparison failed:', error);
      throw error;
    }
  },

  // Get available coupons and offers
  getCoupons: async (productId: string) => {
    try {
      const response = await apiClient.get(`/ecommerce/coupons/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      throw error;
    }
  },
};

/**
 * Food Delivery API Services
 */
export const foodAPI = {
  // Search restaurants
  searchRestaurants: async (
    query: string,
    center: { lat: number; lng: number },
    providers?: Array<'Swiggy' | 'Zomato' | 'Blinkit'>,
    radiusKm?: number
  ) => {
    try {
      const response = await apiClient.post('/food/search', { query, center, providers, radiusKm });
      return response.data;
    } catch (error) {
      console.error('Restaurant search failed:', error);
      throw error;
    }
  },

  // Get restaurant menu
  getMenu: async (restaurantId: string) => {
    try {
      const response = await apiClient.get(`/food/restaurants/${restaurantId}/menu`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      throw error;
    }
  },

  // Get delivery options
  getDeliveryOptions: async (restaurantId: string, center: { lat: number; lng: number }) => {
    try {
      const response = await apiClient.post('/food/delivery-options', {
        restaurantId,
        center,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch delivery options:', error);
      throw error;
    }
  },
};

/**
 * Rides API Services
 */
export const ridesAPI = {
  // Get fare estimates
  getFareEstimate: async (
    pickup: { lat: number; lng: number },
    dropoff: { lat: number; lng: number }
  ) => {
    try {
      const response = await apiClient.post('/rides/fare-estimate', {
        pickup,
        dropoff,
      });
      return response.data;
    } catch (error) {
      console.error('Fare estimation failed:', error);
      throw error;
    }
  },

  // Get available rides
  getAvailableRides: async (location: { lat: number; lng: number }) => {
    try {
      const response = await apiClient.get('/rides/available', {
        params: { lat: location.lat, lng: location.lng },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch available rides:', error);
      throw error;
    }
  },

  // Book a ride
  bookRide: async (quoteId: string) => {
    try {
      const response = await apiClient.post('/rides/book', { quoteId });
      return response.data;
    } catch (error) {
      console.error('Ride booking failed:', error);
      throw error;
    }
  },

  geocode: async (q: string) => {
    try {
      const response = await apiClient.get('/rides/geocode', { params: { q } });
      return response.data;
    } catch (error) {
      console.error('Geocode failed:', error);
      throw error;
    }
  },

  reverseGeocode: async (lat: number, lng: number) => {
    try {
      const response = await apiClient.get('/rides/reverse', { params: { lat, lng } });
      return response.data;
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      throw error;
    }
  },

  getRoute: async (pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) => {
    try {
      const response = await apiClient.get('/rides/route', {
        params: {
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Route fetch failed:', error);
      throw error;
    }
  },
};

/**
 * Payments API Services
 */
export const paymentsAPI = {
  createIntent: async (input: {
    money: { amount: number; currency?: string };
    customer: { customerId: string; customerPhone: string; customerEmail?: string; customerName?: string };
    returnUrl?: string;
    notifyUrl?: string;
    orderId?: string;
    idempotencyKey?: string;
  }) => {
    try {
      const response = await apiClient.post('/payments/intents', input, {
        headers: input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Create payment intent failed:', error);
      throw error;
    }
  },

  getIntent: async (intentId: string) => {
    try {
      const response = await apiClient.get(`/payments/intents/${intentId}`);
      return response.data;
    } catch (error) {
      console.error('Fetch payment intent failed:', error);
      throw error;
    }
  },
};

export const ordersAPI = {
  createOrder: async (input: {
    domain: 'ecommerce' | 'food' | 'rides' | 'travel' | 'hospitality';
    provider: string;
    title: string;
    itemUrl: string;
    amount: { currency: 'INR'; amount: number };
    metadata?: Record<string, unknown>;
    paymentIntentId?: string;
  }) => {
    try {
      const response = await apiClient.post('/orders', input);
      return response.data;
    } catch (error) {
      console.error('Create order failed:', error);
      throw error;
    }
  },

  listOrders: async (limit?: number) => {
    try {
      const response = await apiClient.get('/orders', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('List orders failed:', error);
      throw error;
    }
  },

  getOrder: async (orderId: string) => {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Get order failed:', error);
      throw error;
    }
  },

  cancelOrder: async (orderId: string) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel order failed:', error);
      throw error;
    }
  },

  createPaymentIntent: async (
    orderId: string,
    input?: {
      customerPhone?: string;
      customerEmail?: string;
      customerName?: string;
      returnUrl?: string;
      notifyUrl?: string;
    }
  ) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/payment-intent`, input ?? {});
      return response.data;
    } catch (error) {
      console.error('Create order payment intent failed:', error);
      throw error;
    }
  },
};

/**
 * Travel API Services
 */
export const travelAPI = {
  // Search flights
  searchFlights: async (from: string, to: string, date: string, passengers?: number) => {
    try {
      const response = await apiClient.post('/search/travel', {
        query: `flight from ${from} to ${to} on ${date} for ${passengers ?? 1} passengers`,
      });
      return response.data;
    } catch (error) {
      console.error('Flight search failed:', error);
      throw error;
    }
  },

  // Search trains
  searchTrains: async (from: string, to: string, date: string) => {
    try {
      const response = await apiClient.post('/travel/trains/search', {
        from,
        to,
        date,
      });
      return response.data;
    } catch (error) {
      console.error('Train search failed:', error);
      throw error;
    }
  },

  // Search buses
  searchBuses: async (from: string, to: string, date: string) => {
    try {
      const response = await apiClient.post('/travel/buses/search', {
        from,
        to,
        date,
      });
      return response.data;
    } catch (error) {
      console.error('Bus search failed:', error);
      throw error;
    }
  },
};

/**
 * Hospitality API Services
 */
export const hospitalityAPI = {
  // Search hotels
  searchHotels: async (location: string, checkIn: string, checkOut: string, guests?: number) => {
    try {
      const response = await apiClient.post('/search/stays', {
        query: `hotel in ${location} from ${checkIn} to ${checkOut} for ${guests ?? 2} guests`,
      });
      return response.data;
    } catch (error) {
      console.error('Hotel search failed:', error);
      throw error;
    }
  },

  // Get hotel details
  getHotelDetails: async (hotelId: string) => {
    try {
      const response = await apiClient.get(`/hospitality/hotels/${hotelId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch hotel details:', error);
      throw error;
    }
  },

  // Get room availability
  getRoomAvailability: async (hotelId: string, checkIn: string, checkOut: string) => {
    try {
      const response = await apiClient.post('/hospitality/availability', {
        hotelId,
        checkIn,
        checkOut,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch room availability:', error);
      throw error;
    }
  },
};

/**
 * ONDC Integration Services
 */
export const ondcAPI = {
  request: async (
    endpoint: keyof typeof ONDC_ENDPOINTS,
    payload: Record<string, unknown>
  ) => {
    try {
      const response = await ondcClient.post(ONDC_ENDPOINTS[endpoint], payload);
      return response.data;
    } catch (error) {
      console.error(`ONDC request failed (${endpoint}):`, error);
      throw error;
    }
  },
};

/**
 * AI Recommendation Services
 */
export const aiAPI = {
  // Get AI recommendations
  getRecommendations: async (query: string, domain: string, preferences?: Record<string, any>) => {
    try {
      const response = await apiClient.post('/ai/recommendations', {
        query,
        domain,
        preferences,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  },

  // Predict price drops
  predictPriceDrop: async (productId: string, platform: string) => {
    try {
      const response = await apiClient.get('/ai/price-prediction', {
        params: { productId, platform },
      });
      return response.data;
    } catch (error) {
      console.error('Price prediction failed:', error);
      throw error;
    }
  },

  // Summarize reviews
  summarizeReviews: async (itemId: string, domain: string) => {
    try {
      const response = await apiClient.get('/ai/review-summary', {
        params: { itemId, domain },
      });
      return response.data;
    } catch (error) {
      console.error('Review summarization failed:', error);
      throw error;
    }
  },
};

/**
 * User Services
 */
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await apiClient.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  },

  // Update user preferences
  updatePreferences: async (preferences: Record<string, any>) => {
    try {
      const response = await apiClient.put('/users/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  },

  // Get purchase history
  getPurchaseHistory: async () => {
    try {
      const response = await apiClient.get('/users/purchases');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
      throw error;
    }
  },

  // Get cashback and rewards
  getRewards: async () => {
    try {
      const response = await apiClient.get('/users/rewards');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
      throw error;
    }
  },
};

export default apiClient;
