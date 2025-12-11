import express from 'express';

const app = express();
app.use(express.json());

const CONFIG = {
  PORT: 3333,
  API_DELAY_MS: 200,
  REFRESH_DELAY_MS: 800,
  TOKEN_EXPIRY_MS: 5000,
};

let reqCounter = 0;
let refreshCallCount = 0;

app.get('/api/protected', async (req, res) => {
  const reqId = ++reqCounter;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  console.log(`[Request ${reqId}] Token recebido: ${token}`);

  await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY_MS));

  if (token === 'expired-token') {
    console.log(`[Request ${reqId}] Token expirado - 401`);

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expirado',
      requestId: reqId
    });
  }

  console.log(`[Request ${reqId}] Sucesso!`);

  res.json({
    success: true,
    message: `Request ${reqId} processada com sucesso`,
    requestId: reqId,
    timestamp: new Date().toISOString()
  });
});

app.post('/auth/token/refresh', async (_, res) => {
  refreshCallCount++;

  console.log(`[Refresh ${refreshCallCount}] Iniciando refresh token`);
  
  await new Promise(resolve => setTimeout(resolve, CONFIG.REFRESH_DELAY_MS));
  
  console.log(`[Refresh ${refreshCallCount}] Refresh concluído`);

  res.json({
    accessToken: `new-token-${Date.now()}`,
    expiresIn: CONFIG.TOKEN_EXPIRY_MS,
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

  console.log('Estado resetado');

  res.json({ success: true });
});

app.listen(CONFIG.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${CONFIG.PORT}`);
});
