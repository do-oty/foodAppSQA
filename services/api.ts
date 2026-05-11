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

export interface ApiNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
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

export interface ApiReview {
  id: string;
  user_id: string;
  restaurant_id: string;
  order_id?: string | null;
  rating: number;
  comment: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
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
    AsyncStorage.setItem('auth_token', cleanToken).catch((err: any) => console.error('Failed to save token:', err));
  }

  async clearToken() {
    this.token = null;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('auth_token');
  }

  async logout() {
    try {
      await this.clearCart();
    } catch (err) {
      console.warn('Failed to clear cart on backend during logout:', err);
    }
    await this.clearToken();
    
    // Clear local notifications when switching accounts
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('local_notifications');
    await AsyncStorage.setItem('unread_notifs', '0');
  }

  private async request<T>(endpoint: string, options: any = {}, retries = 3): Promise<ApiResponse<T>> {
    const isFormData = options.body instanceof FormData;
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };

    if (!options.skipAuth && !this.token) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const stored = await AsyncStorage.getItem('auth_token');
      if (stored) {
        let clean = stored;
        if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
        this.token = clean;
      }
    }

    if (!options.skipAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // Keep the slightly longer timeout

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
        if (retries > 0 && (response.status >= 500 || response.status === 408)) {
          // Linear backoff: 1s, 2s, 3s
          const delay = (3 - retries + 1) * 1000;
          console.log(`[API] Server error ${response.status}, retrying ${endpoint} in ${delay}ms... (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.request<T>(endpoint, options, retries - 1);
        }
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Details [${response.status}]:`, JSON.stringify(errorData, null, 2));
        const err = new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
        (err as any).details = errorData.details;
        (err as any).status = response.status;
        throw err;
      }

      const result = await response.json();

      // Special handling for cold-starts/lazy-loading:
      // If the API returns success but with an empty data array and total=0 for a list endpoint,
      // it's likely the database hasn't fully connected yet. We retry up to 3 times.
      const isListEndpoint = endpoint.includes('/restaurants') || endpoint.includes('/categories') || endpoint.includes('/menu');
      const isEmptyButShouldntBe = result.success && 
                                   Array.isArray(result.data) && 
                                   result.data.length === 0 && 
                                   result.meta?.total === 0;

      if (isEmptyButShouldntBe && isListEndpoint && retries > 0) {
        // Linear backoff: 1s, 2s, 3s
        const delay = (3 - retries + 1) * 1000;
        console.log(`[API] Received empty result for ${endpoint}, server might still be waking up. Retrying in ${delay}ms... (${retries} left)`);
        await new Promise(r => setTimeout(r, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }

      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      if (retries > 0 && err?.name !== 'AbortError') {
        const delay = (3 - retries + 1) * 1000;
        console.log(`[API] Request failed (${err.message}), retrying ${endpoint} in ${delay}ms... (${retries} left)`);
        await new Promise(r => setTimeout(r, delay));
        return this.request<T>(endpoint, options, retries - 1);
      }
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

  // ── Cart ──────────────────────────────────────────────────────────────────

  async getCart(): Promise<ApiResponse<ApiCart>> {
    return this.request<ApiCart>('/cart');
  }

  async addToCart(data: { menu_item_id: string; quantity: number; restaurant_id?: string; selected_options?: any }): Promise<ApiResponse<ApiCart>> {
    return this.request<ApiCart>('/cart', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCartItem(id: string, quantity: number): Promise<ApiResponse<ApiCart>> {
    return this.request<ApiCart>(`/cart/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/cart/${id}`, {
      method: 'DELETE',
    });
  }

  async clearCart(): Promise<ApiResponse<void>> {
    return this.request<void>('/cart', {
      method: 'DELETE',
    });
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

  // ── Notifications (Simulated via AsyncStorage since no backend endpoint exists) ──

  async getNotifications(): Promise<ApiResponse<ApiNotification[]>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const notifsStr = await AsyncStorage.getItem('local_notifications');
    const items = notifsStr ? JSON.parse(notifsStr) : [];
    return { success: true, data: items };
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const notifsStr = await AsyncStorage.getItem('local_notifications');
    const items = notifsStr ? JSON.parse(notifsStr) : [];
    
    const item = items.find((n: any) => n.id === id);
    if (item) item.is_read = true;
    
    await AsyncStorage.setItem('local_notifications', JSON.stringify(items));
    return { success: true, data: undefined as any };
  }

  async addLocalNotification(title: string, message: string, type: string = 'info'): Promise<ApiResponse<ApiNotification>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const notifsStr = await AsyncStorage.getItem('local_notifications');
    const items = notifsStr ? JSON.parse(notifsStr) : [];
    
    const newNotif: ApiNotification = {
      id: Math.random().toString(36).substring(7),
      user_id: 'local',
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    items.unshift(newNotif); // Add to top
    await AsyncStorage.setItem('local_notifications', JSON.stringify(items));

    // Increment unread count for badges
    const unreadStr = await AsyncStorage.getItem('unread_notifs');
    const unread = unreadStr ? parseInt(unreadStr, 10) : 0;
    await AsyncStorage.setItem('unread_notifs', (unread + 1).toString());

    return { success: true, data: newNotif };
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const notifsStr = await AsyncStorage.getItem('local_notifications');
    const items = notifsStr ? JSON.parse(notifsStr) : [];
    
    const filtered = items.filter((n: any) => n.id !== id);
    await AsyncStorage.setItem('local_notifications', JSON.stringify(filtered));
    return { success: true, data: undefined as any };
  }

  async clearAllNotifications(): Promise<ApiResponse<void>> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('local_notifications');
    return { success: true, data: undefined as any };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  async getReviews(restaurantId: string): Promise<ApiResponse<ApiReview[]>> {
    return this.request<ApiReview[]>(`/reviews?restaurant_id=${restaurantId}`);
  }

  async createReview(data: {
    restaurant_id: string;
    rating: number;
    comment: string;
    order_id?: string;
  }): Promise<ApiResponse<ApiReview>> {
    return this.request<ApiReview>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
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
    return this.request<{ url: string }>('/upload/image', { method: 'POST', body: formData });
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async createOrder(data: {
    restaurant_id: string;
    delivery_address_id: string;
    payment_method: string;
    items: Array<{
      menu_item_id: string;
      quantity: number;
      selected_options?: Record<string, any>;
    }>;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyOrders(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    
    const qs = query.toString();
    return this.request<any[]>(`/orders/my-orders${qs ? `?${qs}` : ''}`);
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new FoodApiClient();
