import axios from 'axios';
import { Email, EmailStats, PaginatedEmailsResponse, ScheduleEmailPayload, User } from '../types/index.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('reachinbox_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getGoogleAuthUrl: async (): Promise<string> => {
    const res = await api.get<{ url: string }>('/auth/google');
    return res.data.url;
  },
  demoLogin: async (email?: string, name?: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/demo-login', { email, name });
    return res.data;
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('reachinbox_token');
  },
};

export const emailApi = {
  scheduleEmails: async (payload: ScheduleEmailPayload): Promise<{ message: string; count: number }> => {
    const res = await api.post('/emails/schedule', payload);
    return res.data;
  },
  getScheduledEmails: async (page = 1, limit = 50, search = ''): Promise<PaginatedEmailsResponse> => {
    const res = await api.get<PaginatedEmailsResponse>('/emails/scheduled', {
      params: { page, limit, search },
    });
    return res.data;
  },
  getSentEmails: async (page = 1, limit = 50, search = ''): Promise<PaginatedEmailsResponse> => {
    const res = await api.get<PaginatedEmailsResponse>('/emails/sent', {
      params: { page, limit, search },
    });
    return res.data;
  },
  getEmailStats: async (): Promise<EmailStats> => {
    const res = await api.get<EmailStats>('/emails/stats');
    return res.data;
  },
  getEmailById: async (id: string): Promise<{ email: Email }> => {
    const res = await api.get<{ email: Email }>(`/emails/${id}`);
    return res.data;
  },
};

export default api;
