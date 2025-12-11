import { ssoClient } from './api-client.js';

let isRefreshing = false;
let refreshPromise = null;
let accessToken = null;

export const getIsRefreshing = () => isRefreshing;

export const getRefreshPromise = () => refreshPromise;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const resetState = () => {
  isRefreshing = false;
  refreshPromise = null;
  accessToken = null;
};

export const refreshAccessToken = () => {
  return ssoClient.post('/auth/token/refresh', {
    grant_type: 'refresh_token',
  }).then(response => {
    const newToken = response.data.accessToken;
    setAccessToken(newToken);
    return newToken;
  });
};

export const handleTokenRefresh = () => {  
  if (isRefreshing) {
    console.log(`[TokenService] Refresh já em andamento, retornando promise existente`);
    return refreshPromise;
  }

  console.log(`[TokenService] Iniciando novo refresh`);

  isRefreshing = true;

  refreshPromise = refreshAccessToken()
    .then(token => {
      console.log(`[TokenService] Refresh concluído com sucesso`);
      return token;
    })
    .catch(async error => {
      console.log(`[TokenService] Erro no refresh:`, error.message);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
      isRefreshing = false;
    });

  return refreshPromise;
};
