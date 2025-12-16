import {
  getIsRefreshing,
  handleTokenRefresh,
  getRefreshPromise,
  getAccessToken,
} from './token.service.js';

const HTTP_UNAUTHORIZED = 401;

const refreshAndRetryRequest = async (originalRequest, axiosInstance, requestId) => {
  try {
    await handleTokenRefresh();

    originalRequest.headers['Authorization'] = `Bearer ${getAccessToken}`;
    originalRequest._retry = true;

    console.log(`[Interceptor] Request ${requestId}: Retentando com novo token: ${getAccessToken()}`);
    return axiosInstance(originalRequest);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const createAuthResponseInterceptor = (axiosInstance) => ({
  onFulfilled: response => response,

  onRejected: async error => {
    const originalRequest = error.config;
    const requestId = error.response.data.requestId;
    const endpoint = error.response.data.endpoint;
    const status = error.response.status;
    const message = error.response.data.message;

    if (error.response?.status !== HTTP_UNAUTHORIZED || originalRequest._retry) {
      return Promise.reject(error);
    }

    console.log(`[Interceptor] Response Request ${requestId} -> ${endpoint} -> Status ${status} -> Message Payload: ${message}`);

    if (getIsRefreshing()) {
      console.log(`[Interceptor] Request ${requestId}: Aguardando refresh em andamento`);
      try {
        await getRefreshPromise();

        originalRequest.headers['Authorization'] = `Bearer ${getAccessToken()}`;
        originalRequest._retry = true;

        console.log(`[Interceptor] Request ${requestId}: Retentando após aguardar refresh`);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return refreshAndRetryRequest(originalRequest, axiosInstance, requestId);
  },
});
