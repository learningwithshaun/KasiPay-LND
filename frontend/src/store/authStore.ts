import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import * as api from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (phone: string, pin: string) => Promise<void>;
  register: (phone: string, pin: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateLightningAddress: (address: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone, pin) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(phone, pin);
          set({
            user: {
              id: response.user.id,
              phone: response.user.phone,
              displayName: response.user.displayName,
              role: response.user.role,
              lightningAddress: response.user.lightningAddress,
            } as User,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (phone, pin, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.register(phone, pin, displayName);
          set({
            user: {
              id: response.user.id,
              phone: response.user.phone,
              displayName: response.user.displayName,
              role: response.user.role,
              lightningAddress: response.user.lightningAddress,
            } as User,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        api.loadTokens();
        const token = api.getAccessToken();
        
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const user = await api.getMe();
          set({ user, isAuthenticated: true });
        } catch {
          api.clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      updateLightningAddress: async (address) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.updateLightningAddress(address);
          set({
            user: { ...get().user!, lightningAddress: user.lightningAddress },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Update failed',
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Helper to check user role
export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  return user !== null && roles.includes(user.role);
}

