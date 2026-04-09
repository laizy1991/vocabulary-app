import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  
  login: (user, token) => {
    // 保存到安全存储
    SecureStore.setItemAsync('user', JSON.stringify(user));
    SecureStore.setItemAsync('token', token);
    set({ user, token, isLoggedIn: true });
  },
  
  logout: () => {
    SecureStore.deleteItemAsync('user');
    SecureStore.deleteItemAsync('token');
    set({ user: null, token: null, isLoggedIn: false });
  },
  
  updateUser: (userData) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...userData };
      SecureStore.setItemAsync('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  },
  
  loadFromStorage: async () => {
    try {
      const userStr = await SecureStore.getItemAsync('user');
      const token = await SecureStore.getItemAsync('token');
      
      if (userStr && token) {
        set({ 
          user: JSON.parse(userStr), 
          token, 
          isLoggedIn: true 
        });
      }
    } catch (e) {
      console.error('Failed to load auth from storage:', e);
    }
  },
}));