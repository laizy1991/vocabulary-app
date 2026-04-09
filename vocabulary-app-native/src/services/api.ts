import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// API 基础地址 (根据环境配置)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:10826/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加认证头
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除登录状态
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// 认证 API
export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (email: string, password: string, nickname?: string) =>
    api.post('/auth/register', { email, password, nickname }),
  
  getProfile: () => api.get('/auth/me'),
  
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
  
  logout: () => api.post('/auth/logout'),
};

// 词汇 API
export const vocabularyApi = {
  list: (params?: { category?: string; status?: string; search?: string }) =>
    api.get('/vocabulary', { params }),
  
  get: (id: string) => api.get(`/vocabulary/${id}`),
  
  create: (data: any) => api.post('/vocabulary', data),
  
  update: (id: string, data: any) => api.put(`/vocabulary/${id}`, data),
  
  delete: (id: string) => api.delete(`/vocabulary/${id}`),
  
  generateAI: (word: string, language?: string) =>
    api.post('/vocabulary/generate-ai', { word, language }),
  
  batchImport: (words: string[]) =>
    api.post('/vocabulary/batch-import', { words }),
};

// 分类 API
export const categoryApi = {
  list: () => api.get('/categories'),
  
  create: (name: string) => api.post('/categories', { name }),
  
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export default api;