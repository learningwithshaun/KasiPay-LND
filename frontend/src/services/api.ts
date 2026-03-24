import type { 
  ApiResponse, 
  AuthResponse, 
  Task, 
  TaskClaim, 
  Verification,
  Payout,
  User,
  PaginatedResponse,
  ExchangeRateInfo,
  TreasuryStats,
  TaskStatus,
  PayoutStatus,
  UserRole,
  UserStatus,
} from '../types';

const API_BASE = '/api';

// Token management
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function loadTokens() {
  accessToken = localStorage.getItem('accessToken');
  refreshToken = localStorage.getItem('refreshToken');
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return accessToken;
}

// API request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    // Try to refresh token on 401
    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
        const retryData: ApiResponse<T> = await retryResponse.json();
        if (retryData.success) {
          return retryData.data as T;
        }
      }
    }
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data: ApiResponse<{ accessToken: string }> = await response.json();
    
    if (data.success && data.data) {
      accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', accessToken);
      return true;
    }
  } catch {
    // Refresh failed
  }
  
  clearTokens();
  return false;
}

// ==================== AUTH API ====================

export async function register(phone: string, pin: string, displayName: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, pin, displayName }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(phone: string, pin: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, pin }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

// ==================== TASKS API ====================

export async function getAvailableTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks');
}

export async function getTask(taskId: string): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`);
}

export async function claimTask(taskId: string): Promise<TaskClaim> {
  return request<TaskClaim>(`/tasks/${taskId}/claim`, { method: 'POST' });
}

export async function submitTask(claimId: string, evidence?: string): Promise<TaskClaim> {
  return request<TaskClaim>(`/tasks/${claimId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ evidence }),
  });
}

// ==================== MY (EARNER) API ====================

export async function getMyClaims(page = 1, limit = 20): Promise<PaginatedResponse<TaskClaim>> {
  return request<PaginatedResponse<TaskClaim>>(`/my/claims?page=${page}&limit=${limit}`);
}

export async function getMyPayouts(page = 1, limit = 20): Promise<PaginatedResponse<Payout>> {
  return request<PaginatedResponse<Payout>>(`/my/payouts?page=${page}&limit=${limit}`);
}

export async function getMyPayout(payoutId: string): Promise<Payout> {
  return request<Payout>(`/my/payouts/${payoutId}`);
}

export async function updateLightningAddress(lightningAddress: string): Promise<User> {
  return request<User>('/my/lightning-address', {
    method: 'PUT',
    body: JSON.stringify({ lightningAddress }),
  });
}

// ==================== VERIFICATION API ====================

export async function getPendingVerifications(): Promise<TaskClaim[]> {
  return request<TaskClaim[]>('/verifications/pending');
}

export async function getVerificationHistory(page = 1, limit = 20): Promise<PaginatedResponse<Verification>> {
  return request<PaginatedResponse<Verification>>(`/verifications/history?page=${page}&limit=${limit}`);
}

export async function getClaimForVerification(claimId: string): Promise<{ claim: TaskClaim; verification?: Verification }> {
  return request<{ claim: TaskClaim; verification?: Verification }>(`/verifications/${claimId}`);
}

export async function approveVerification(claimId: string): Promise<Verification> {
  return request<Verification>(`/verifications/${claimId}/approve`, { method: 'POST' });
}

export async function rejectVerification(claimId: string, reason: string): Promise<Verification> {
  return request<Verification>(`/verifications/${claimId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ==================== ADMIN API ====================

export async function createTask(data: {
  title: string;
  description: string;
  rewardSats: number;
  maxClaims?: number;
  expiresAt?: string;
}): Promise<Task> {
  return request<Task>('/admin/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAllTasks(page = 1, limit = 20, status?: TaskStatus): Promise<PaginatedResponse<Task>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return request<PaginatedResponse<Task>>(`/admin/tasks?${params}`);
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
  return request<Task>(`/admin/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId: string): Promise<Task> {
  return request<Task>(`/admin/tasks/${taskId}`, { method: 'DELETE' });
}

export async function getAllUsers(page = 1, limit = 20, role?: UserRole): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (role) params.set('role', role);
  return request<PaginatedResponse<User>>(`/admin/users?${params}`);
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<User> {
  return request<User>(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  return request<User>(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function getTreasury(): Promise<TreasuryStats> {
  return request<TreasuryStats>('/admin/treasury');
}

export async function getAllPayouts(page = 1, limit = 20, status?: PayoutStatus): Promise<PaginatedResponse<Payout>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return request<PaginatedResponse<Payout>>(`/admin/payouts?${params}`);
}

export async function retryPayout(payoutId: string): Promise<Payout> {
  return request<Payout>(`/admin/payouts/${payoutId}/retry`, { method: 'POST' });
}

// ==================== SYSTEM API ====================

export async function getExchangeRate(): Promise<ExchangeRateInfo> {
  return request<ExchangeRateInfo>('/exchange-rate');
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return request<{ status: string; timestamp: string }>('/health');
}

