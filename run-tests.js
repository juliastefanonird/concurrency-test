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

async function setRefreshFailure(shouldFail) {
  await axios.post(`${API_BASE_URL}/api/set-refresh-failure`, { shouldFail });
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
    .map((_, i) => {
      const endpoint = `/api/resource/${i + 1}`;
      return apiClient.get(endpoint)
        .then(response => ({ 
          endpoint,
          success: true, 
          status: response.status,
          message: response.data.message,
        }))
        .catch(error => ({ 
          endpoint,
          success: false, 
          status: error.response?.status,
          message: error.response?.data?.message,
        }));
    });

  // Aguarda todas terminarem
  const results = await Promise.all(promises);
    
  const endTime = Date.now();
  const duration = endTime - startTime;

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach((r, index) => {
    if (r.success) {
      console.log(`[TEST] Request ${index + 1} -> ${r.endpoint} -> Status ${r.status} -> Message Payload: ${r.message}`);
    } else {
      console.log(`[TEST] Request ${index + 1} -> ${r.endpoint} -> Status ${r.status} -> Message Payload: ${r.message}`);
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

async function runRefreshErrorTest(concurrentRequests) {
  console.log('='.repeat(60), '\n');

  await resetServerState();
  resetState();
  setAccessToken('expired-token');
  await setRefreshFailure(true);

  console.log(`[TEST] Testando erro no refresh com ${concurrentRequests} requisições simultâneas\n`);

  const startTime = Date.now();

  const promises = Array(concurrentRequests)
    .fill(null)
    .map((_, i) => {
      const endpoint = `/api/resource/${i + 1}`;
      return apiClient.get(endpoint)
        .then(response => ({ 
          endpoint,
          success: true, 
          status: response.status,
          message: response.data.message,
        }))
        .catch(error => ({ 
          endpoint,
          success: false, 
          status: error.response?.status,
          message: error.response?.data?.message,
        }));
    });

  const results = await Promise.all(promises);
    
  const endTime = Date.now();
  const duration = endTime - startTime;

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach((r, index) => {
    if (r.success) {
      console.log(`[TEST] Request ${index + 1} -> ${r.endpoint} -> Status ${r.status} -> Message Payload: ${r.message} (inesperado!)`);
    } else {
      console.log(`[TEST] Request ${index + 1} -> ${r.endpoint} -> Status ${r.status} -> Message Payload: ${r.message}`);
    }
  });

  const stats = await getServerStats();

  console.log(`\nESTATÍSTICAS:`);
  console.log(`Chamadas de refresh: ${stats.refreshCallCount}`);
  console.log(`Requisições bem-sucedidas: ${successCount}/${concurrentRequests}`);
  console.log(`Requisições mal-sucedidas: ${failCount}/${concurrentRequests}`);
  console.log(`Tempo total: ${duration}ms \n`);

  const passed = stats.refreshCallCount === 1 && failCount === concurrentRequests;
  
  if (passed) {
    console.log('TESTE PASSOU!');
  } else {
    console.log('TESTE FALHOU!');

    if (stats.refreshCallCount !== 1) {
      console.log(`Esperado 1 refresh, mas foram feitos ${stats.refreshCallCount}`);
    }
    if (failCount !== concurrentRequests) {
      console.log(`Esperado ${concurrentRequests} falhas, mas obteve ${failCount}`);
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
    results.push({ name: `${n} requisição(ões) simultânea(s)`, passed });
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTES DE ERRO NO REFRESH TOKEN                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const errorTestCases = [1, 3, 10];

  for (const n of errorTestCases) {
    const passed = await runRefreshErrorTest(n);
    results.push({ name: `Erro no refresh - ${n} requisição(ões)`, passed });
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO FINAL                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  results.forEach(({ name, passed }) => {
    const status = passed ? `✓ PASSOU` : `✗ FALHOU`;
    console.log(`${name}: ${status}`);
  });

  const allPassed = results.every(r => r.passed);

  console.log('\n');

  if (allPassed) {
    console.log('TODOS OS TESTES PASSARAM!');
  } else {
    console.log('ALGUNS TESTES FALHARAM');
  }
}

runAllTests()
