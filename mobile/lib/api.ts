import axios from 'axios';
import { getItem, setItem, deleteItem } from './storage';
import { API_BASE_URL } from './config';
import { router } from 'expo-router';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh
      const refreshToken = await getItem('refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          await setItem('access_token', res.data.access_token);
          if (res.data.refresh_token) {
            await setItem('refresh_token', res.data.refresh_token);
          }
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(error.config);
        } catch {
          await deleteItem('access_token');
          await deleteItem('refresh_token');
          router.replace('/login');
        }
      } else {
        await deleteItem('access_token');
        await deleteItem('refresh_token');
        router.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
