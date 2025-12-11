# Teste de Concorrência - Refresh Token

Teste para validar se múltiplas requisições simultâneas aguardam corretamente um único refresh token antes de serem retentadas.

## O que é testado

Quando várias requisições recebem 401 (token expirado) ao mesmo tempo:

1. Apenas **1 chamada de refresh** deve ser feita
2. As demais requisições devem **aguardar** esse refresh
3. Todas devem ser **retentadas** com o novo token

## Como executar

```bash
# Instalar dependências
npm install

# Terminal 1 - Iniciar o servidor mock
npm run start:api

# Terminal 2 - Executar os testes
npm test
```

## Cenários testados

| Requisições simultâneas | Refresh esperado | Resultado esperado |
|------------------------|------------------|-------------------|
| 1                      | 1                | 1 sucesso         |
| 3                      | 1                | 3 sucessos        |
| 10                     | 1                | 10 sucessos       |


## Output esperado

```
[TEST] Disparando 3 requisições simultaneamente

[Interceptor] Request 1: Recebeu 401
[TokenService] Iniciando novo refresh
[Interceptor] Request 2: Recebeu 401
[Interceptor] Request 2: Aguardando refresh em andamento
[Interceptor] Request 3: Recebeu 401
[Interceptor] Request 3: Aguardando refresh em andamento
[TokenService] Refresh concluído com sucesso
...

ESTATÍSTICAS:
Chamadas de refresh: 1
Requisições bem-sucedidas: 3/3

TESTE PASSOU!
```

