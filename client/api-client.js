import axios from 'axios';
import { createAuthResponseInterceptor } from './interceptor.js';
import { getAccessToken, getIsRefreshing, getRefreshPromise } from './token.service.js';

const API_BASE_URL = 'http://localhost:3333';

export const ssoClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

// Simulando MEGASAC API
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

apiClient.interceptors.request.use(
  async config => {
    if (getIsRefreshing()) {
      try {
        console.log(`[RequestInterceptor] Aguardando refresh em andamento...`);

        await getRefreshPromise();
        
        config.headers['Authorization'] = `Bearer ${getAccessToken()}`;
      } catch (error) {
        return Promise.reject(new axios.Cancel('Token refresh failed'));
      }
    } else {
      config.headers['Authorization'] = `Bearer ${getAccessToken()}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const authInterceptor = createAuthResponseInterceptor(apiClient);

apiClient.interceptors.response.use(
  authInterceptor.onFulfilled,
  authInterceptor.onRejected
);

