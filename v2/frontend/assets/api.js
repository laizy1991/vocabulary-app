// API 客户端
const API_BASE = window.API_BASE_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  
  return data;
}

// 词汇操作
export const vocabularyAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params);
    return request(`/vocabulary?${query}`);
  },
  
  async getById(id) {
    return request(`/vocabulary/${id}`);
  },
  
  async create(data) {
    return request('/vocabulary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id, data) {
    return request(`/vocabulary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id) {
    return request(`/vocabulary/${id}`, {
      method: 'DELETE',
    });
  },
  
  async batchImport(items) {
    return request('/vocabulary/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
  
  // AI 生成词汇信息
  async generate(word) {
    return request('/vocabulary/generate', {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
  },
  
  async clear() {
    const all = await this.getAll();
    const promises = all.data.map(vocab => this.delete(vocab.id));
    return Promise.all(promises);
  },
};

// 练习题操作
export const exerciseAPI = {
  async generate(type, count, vocabularyIds) {
    return request('/exercises/generate', {
      method: 'POST',
      body: JSON.stringify({ type, count, vocabularyIds }),
    });
  },
  
  async getById(id) {
    return request(`/exercises/${id}`);
  },
  
  async submit(id, answers) {
    return request(`/exercises/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },
};

// 统计信息
export const statsAPI = {
  async get() {
    return request('/stats');
  },
};

// 健康检查
export const healthAPI = {
  async check() {
    return request('/health');
  },
};
