const API_BASE_URL = 'https://food-api-wheat.vercel.app/api/v1';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone?: string | null;
  role?: string | null;
}

export interface ApiAuthResponse {
  user: ApiUser;
  token: string;
}

export interface ApiRestaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  delivery_fee: number;
  min_order_amount: number;
  rating: number;           // schema field
  average_rating?: number;  // alias some responses use
  review_count?: number;
  cuisine_type: string[];
  is_featured: boolean;
  street_address: string;
  city: string;
  state?: string;
  delivery_time_min?: number;
}

export interface ApiMenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_vegetarian: boolean;
  calories: number | null;
}

export interface ApiCategory {
  id: string;
  name: string;
  icon_url: string | null;
}

export interface ApiCartItem {
  id: string;
  cart_id: string;
  menu_item_id: string;
  quantity: number;
  menu_item?: ApiMenuItem;
}

export interface ApiCart {
  id: string;
  user_id: string;
  items: ApiCartItem[];
  total_amount: number;
}

export interface ApiAddress {
  id: string;
  user_id: string;
  label: string;
  street_address: string; // API field (was wrongly 'street')
  city: string;
  state: string;          // API field (was wrongly 'province')
  postal_code: string;    // API field (was wrongly 'zip')
  country?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

export interface ApiFavorite {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  menu_item_id: string | null;
  restaurant?: ApiRestaurant;
  menu_item?: ApiMenuItem;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────

export function extractArray<T = any>(response: any): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response.favorites && Array.isArray(response.favorites)) return response.favorites;
  if (response.restaurants && Array.isArray(response.restaurants)) return response.restaurants;
  if (response.menu_items && Array.isArray(response.menu_items)) return response.menu_items;
  if (response.items && Array.isArray(response.items)) return response.items;
  if (response.data?.items && Array.isArray(response.data.items)) return response.data.items;
  return [];
}

// ── Client ─────────────────────────────────────────────────────────────────

class FoodApiClient {
  private token: string | null = null;

  async loadToken() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      const stored = await AsyncStorage.getItem('auth_token');
      if (stored) {
        let clean = stored;
        if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
        this.token = clean;
      }
    } catch (err) {
      console.error('Failed to load token:', err);
    }
  }

  getToken() {
    return this.token;
  }

  setToken(token: string) {
    let cleanToken = token;
    if (typeof cleanToken === 'string' && cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }
    this.token = cleanToken;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem('auth_token', cleanToken).catch(err => console.error('Failed to save token:', err));
  }

  async clearToken() {
    this.token = null;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('auth_token');
  }

  async logout() {
    await this.clearToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean } = {},
    isFormData = false
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };

    if (!options.skipAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Details [${response.status}]:`, JSON.stringify(errorData, null, 2));
        const err = new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
        (err as any).details = errorData.details;
        (err as any).status = response.status;
        throw err;
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out. The server may be waking up — please try again.');
      }
      throw err;
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<ApiResponse<ApiAuthResponse>> {
    const res = await this.request<ApiAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async register(data: any): Promise<ApiResponse<ApiAuthResponse>> {
    const res = await this.request<ApiAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async me(): Promise<ApiResponse<ApiUser>> {
    return this.request<ApiUser>('/auth/me');
  }

  // ── Restaurants ───────────────────────────────────────────────────────────

  async getRestaurants(params?: {
    search?: string;
    featured?: boolean;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ApiRestaurant[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.featured != null) query.set('featured', String(params.featured));
    if (params?.lat != null) query.set('lat', String(params.lat));
    if (params?.lng != null) query.set('lng', String(params.lng));
    if (params?.radius != null) query.set('radius', String(params.radius));
    if (params?.page != null) query.set('page', String(params.page));
    if (params?.limit != null) query.set('limit', String(params.limit));

    const qs = query.toString();
    return this.request<ApiRestaurant[]>(`/restaurants${qs ? `?${qs}` : ''}`);
  }

  async getRestaurant(id?: string): Promise<ApiResponse<ApiRestaurant>> {
    if (!id) throw new Error('Restaurant ID is required');
    return this.request<ApiRestaurant>(`/restaurants/${id}`);
  }

  async createRestaurant(data: Partial<ApiRestaurant>): Promise<ApiResponse<ApiRestaurant>> {
    return this.request<ApiRestaurant>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Menu ──────────────────────────────────────────────────────────────────

  async getMenu(restaurantId?: string, params?: {
    category?: string;
    featured?: boolean;
    available?: boolean;
  }): Promise<ApiResponse<ApiMenuItem[]>> {
    if (!restaurantId) throw new Error('Restaurant ID is required');
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.featured != null) query.set('featured', String(params.featured));
    if (params?.available != null) query.set('available', String(params.available));

    const qs = query.toString();
    return this.request<ApiMenuItem[]>(`/restaurants/${restaurantId}/menu${qs ? `?${qs}` : ''}`);
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(): Promise<ApiResponse<ApiCategory[]>> {
    return this.request<ApiCategory[]>('/categories');
  }

  // ── Cart (Simulated via AsyncStorage for robustness) ───────────

  async getCart(): Promise<ApiResponse<ApiCart>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cartStr = await AsyncStorage.getItem('local_cart');
    const items = cartStr ? JSON.parse(cartStr) : [];
    return { success: true, data: { id: 'local', user_id: 'local', items, total_amount: 0 } };
  }

  async addToCart(data: { menu_item_id: string; quantity: number; restaurant_id?: string; menu_item?: any }): Promise<ApiResponse<ApiCart>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cartStr = await AsyncStorage.getItem('local_cart');
    const items = cartStr ? JSON.parse(cartStr) : [];
    
    const existing = items.find((i: any) => i.menu_item_id === data.menu_item_id);
    if (existing) {
      existing.quantity += data.quantity;
    } else {
      items.push({
        id: Math.random().toString(36).substring(7),
        menu_item_id: data.menu_item_id,
        quantity: data.quantity,
        restaurant_id: data.restaurant_id,
        menu_item: data.menu_item || { id: data.menu_item_id, name: 'Item', price: 0 }
      });
    }
    await AsyncStorage.setItem('local_cart', JSON.stringify(items));
    return { success: true, data: { id: 'local', user_id: 'local', items, total_amount: 0 } };
  }

  async updateCartItem(id: string, quantity: number): Promise<ApiResponse<ApiCart>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cartStr = await AsyncStorage.getItem('local_cart');
    const items = cartStr ? JSON.parse(cartStr) : [];
    
    const item = items.find((i: any) => i.id === id || i.menu_item_id === id);
    if (item) item.quantity = quantity;
    
    await AsyncStorage.setItem('local_cart', JSON.stringify(items));
    return { success: true, data: { id: 'local', user_id: 'local', items, total_amount: 0 } };
  }

  async removeFromCart(id: string): Promise<ApiResponse<void>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cartStr = await AsyncStorage.getItem('local_cart');
    let items = cartStr ? JSON.parse(cartStr) : [];
    
    items = items.filter((i: any) => i.id !== id && i.menu_item_id !== id);
    await AsyncStorage.setItem('local_cart', JSON.stringify(items));
    return { success: true, data: undefined as any };
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  async getAddresses(): Promise<ApiResponse<ApiAddress[]>> {
    return this.request<ApiAddress[]>('/addresses');
  }

  async createAddress(data: Partial<ApiAddress>): Promise<ApiResponse<ApiAddress>> {
    return this.request<ApiAddress>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAddress(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultAddress(id: string): Promise<ApiResponse<ApiAddress>> {
    return this.request<ApiAddress>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_default: true }),
    });
  }

  // ── Favorites ─────────────────────────────────────────────────────────────

  async getFavorites(): Promise<ApiResponse<ApiFavorite[]>> {
    return this.request<ApiFavorite[]>('/favorites');
  }

  async addFavorite(data: { restaurant_id?: string; menu_item_id?: string }): Promise<ApiResponse<ApiFavorite>> {
    return this.request<ApiFavorite>('/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeFavorite(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/favorites/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Image Uploads ─────────────────────────────────────────────────────────

  async uploadImage(formData: FormData): Promise<ApiResponse<{ url: string }>> {
    return this.request<{ url: string }>('/upload/image', { method: 'POST', body: formData }, true);
  }
}

export const api = new FoodApiClient();
