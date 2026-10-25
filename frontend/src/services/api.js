import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spendsense_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fixed 10 Categories Taxonomy (UI design tokens, icons and colors)
export const FIXED_CATEGORIES = [
  { id: 1, name: 'Food & Dining', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icon: 'Utensils' },
  { id: 2, name: 'Groceries', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: 'ShoppingBag' },
  { id: 3, name: 'Transport', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', icon: 'Car' },
  { id: 4, name: 'Shopping', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', icon: 'ShoppingBag' },
  { id: 5, name: 'Bills & Utilities', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: 'Zap' },
  { id: 6, name: 'Entertainment', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', icon: 'Film' },
  { id: 7, name: 'Healthcare', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', icon: 'HeartPulse' },
  { id: 8, name: 'Education', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: 'GraduationCap' },
  { id: 9, name: 'Travel', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', icon: 'Plane' },
  { id: 10, name: 'Other', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', icon: 'MoreHorizontal' },
];

export const getCategoryById = (id) => FIXED_CATEGORIES.find(c => c.id === Number(id)) || FIXED_CATEGORIES[9];
export const getCategoryByName = (name) => FIXED_CATEGORIES.find(c => c.name.toLowerCase() === (name || '').toLowerCase()) || FIXED_CATEGORIES[9];

// Client Service API Handlers - 100% Real PostgreSQL & Express Backend
export const spendsenseApi = {
  // Auth
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },

  async getCurrentUser() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async updateProfile(payload) {
    const res = await api.patch('/auth/profile', payload);
    return res.data;
  },

  async changePassword(payload) {
    const res = await api.post('/auth/change-password', payload);
    return res.data;
  },

  // Suggest Category via ML Microservice
  async suggestCategory(query) {
    const res = await api.get(`/categories/suggest?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // Categories list
  async getCategories() {
    const res = await api.get('/categories');
    return res.data;
  },

  // Transactions
  async getTransactions(params = {}) {
    const res = await api.get('/transactions', { params });
    // Normalize category object on transactions if needed for UI tags
    if (res.data?.data?.transactions) {
      res.data.data.transactions = res.data.data.transactions.map((t) => ({
        ...t,
        category: t.category || getCategoryById(t.categoryId),
      }));
    }
    return res.data;
  },

  async addTransaction(payload) {
    const res = await api.post('/transactions', payload);
    return res.data;
  },

  async updateTransaction(id, payload) {
    const res = await api.patch(`/transactions/${id}`, payload);
    return res.data;
  },

  async deleteTransaction(id) {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
  },

  async importCsv(rows) {
    const res = await api.post('/transactions/import', { rows });
    return res.data;
  },

  // Analytics & Summary
  async getSummary(month = '2026-03') {
    const res = await api.get(`/analytics/summary?month=${month}`);
    return res.data;
  },

  // Budgets
  async getBudgets(month = '2026-03') {
    const res = await api.get(`/budgets?month=${month}`);
    return res.data;
  },

  async setBudget(categoryId, limitAmount, month = '2026-03') {
    const res = await api.post('/budgets', { categoryId: Number(categoryId), limitAmount: Number(limitAmount), month });
    return res.data;
  },

  // Insights & ML Patterns
  async getSpendingPatterns(month = '2026-03') {
    const res = await api.get(`/insights/spending-patterns?month=${month}`);
    return res.data;
  },

  // Anomaly / Unusual Expenses via IQR
  async getUnusualExpenses(month = '2026-03') {
    const res = await api.get(`/insights/unusual-expenses?month=${month}`);
    return res.data;
  },

  // What-If Spending Habit Simulator (K-Means Inference)
  async simulateProfile(payload) {
    const res = await api.post('/insights/simulate-profile', payload);
    return res.data;
  },

  // DWM Model Performance & Active Learning Metrics
  async getModelMetrics() {
    const res = await api.get('/insights/model-metrics');
    return res.data;
  },
};

export default api;
