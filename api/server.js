import express from 'express';

const app = express();
app.use(express.json());

const CONFIG = {
  PORT: 3333,
  API_DELAY_MS: 200,
  REFRESH_DELAY_MS: 800,
};

let reqCounter = 0;
let refreshCallCount = 0;
let shouldFailRefresh = false;

const protectedHandler = async (req, res) => {
  const reqId = ++reqCounter;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const endpoint = req.originalUrl;

  console.log(`[Request ${reqId}] Endpoint: ${endpoint} | Token recebido: ${token}`);

  await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY_MS));

  if (token === 'expired-token') {
    console.log(`[Request ${reqId}] Token expirado - 401`);

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expirado',
      endpoint,
      requestId: reqId
    });
  }

  console.log(`[Request ${reqId}] Sucesso!`);

  res.json({
    success: true,
    message: `Request processada com sucesso`,
    endpoint,
    requestId: reqId,
  });
};

for (let i = 1; i <= 20; i++) {
  app.get(`/api/resource/${i}`, protectedHandler);
}

app.post('/auth/token/refresh', async (_, res) => {
  refreshCallCount++;

  console.log(`[Refresh ${refreshCallCount}] Iniciando refresh token`);
  
  await new Promise(resolve => setTimeout(resolve, CONFIG.REFRESH_DELAY_MS));

  if (shouldFailRefresh) {
    console.log(`[Refresh ${refreshCallCount}] Refresh falhou (simulado)`);

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Refresh token inválido ou expirado',
    });
  }
  
  console.log(`[Refresh ${refreshCallCount}] Refresh concluído`);

  res.json({
    accessToken: `new-token-${Date.now()}`,
  });
});

app.get('/api/stats', (_, res) => {
  res.json({
    refreshCallCount,
    totalRequests: reqCounter,
  });
});

app.post('/api/reset', (_, res) => {
  refreshCallCount = 0;
  reqCounter = 0;
  shouldFailRefresh = false;

  console.log('Estado resetado');

  res.json({ success: true });
});

app.post('/api/set-refresh-failure', (req, res) => {
  shouldFailRefresh = req.body.shouldFail ?? true;

  console.log(`Refresh configurado para ${shouldFailRefresh ? 'FALHAR' : 'SUCESSO'}`);

  res.json({ success: true, shouldFailRefresh });
});

app.listen(CONFIG.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${CONFIG.PORT}`);
});
