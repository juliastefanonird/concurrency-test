import axios from 'axios';
import { apiClient } from './client/api-client.js';
import { setAccessToken, resetState } from './client/token.service.js';

const API_BASE_URL = 'http://localhost:3333';

async function resetServerState() {
  await axios.post(`${API_BASE_URL}/api/reset`);
}

async function getServerStats() {
  const response = await axios.get(`${API_BASE_URL}/api/stats`);

  return response.data;
}

async function runConcurrencyTest(concurrentRequests) {
  console.log('='.repeat(60), '\n');

  await resetServerState();
  resetState();
  setAccessToken('expired-token');

  console.log(`[TEST] Disparando ${concurrentRequests} requisições simultaneamente\n`);

  const startTime = Date.now();

  // Dispara todas as requisições ao mesmo tempo (paralelo)
  const promises = Array(concurrentRequests)
    .fill(null)
    .map((_, i) => 
      apiClient.get('/api/protected')
        .then(response => ({ index: i + 1, success: true, data: response.data }))
        .catch(error => ({ index: i + 1, success: false, error: error.message }))
    );

  // Aguarda todas terminarem
  const results = await Promise.all(promises);
    
  const endTime = Date.now();
  const duration = endTime - startTime;

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach(r => {
    if (r.success) {
      console.log(`Request ${r.index}: Sucesso`);
    } else {
      console.log(`Request ${r.index}: Falhou - ${r.error}`);
    }
  });

  const stats = await getServerStats();

  console.log(`\nESTATÍSTICAS:`);
  console.log(`Chamadas de refresh: ${stats.refreshCallCount}`);
  console.log(`Requisições bem-sucedidas: ${successCount}/${concurrentRequests}`);
  console.log(`Requisições mal-sucedidas: ${failCount}/${concurrentRequests}`);

  console.log(`Tempo total: ${duration}ms \n`);

  const passed = stats.refreshCallCount === 1 && successCount === concurrentRequests;
  
  if (passed) {
    console.log('TESTE PASSOU!');
  } else {
    console.log('TESTE FALHOU!');

    if (stats.refreshCallCount !== 1) {
      console.log(`Esperado 1 refresh, mas foram feitos ${stats.refreshCallCount}`);
    }
    if (successCount !== concurrentRequests) {
      console.log(`Esperado ${concurrentRequests} sucessos, mas obteve ${successCount}`);
    }
  }

  console.log('\n');

  return passed;
}

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTES DE CONCORRÊNCIA - REFRESH TOKEN                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const testCases = [1, 3, 10];
  const results = [];

  for (const n of testCases) {
    const passed = await runConcurrencyTest(n);
    results.push({ n, passed });
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO FINAL                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  results.forEach(({ n, passed }) => {
    const status = passed ? `✓ PASSOU` : `✗ FALHOU`;
    console.log(`${n} requisição(ões) simultânea(s): ${status}`);
  });

  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('TODOS OS TESTES PASSARAM!');
  } else {
    console.log('ALGUNS TESTES FALHARAM');
  }
}

runAllTests()
