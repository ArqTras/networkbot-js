/**
 * Centralna konfiguracja stałych wartości
 * Wartości mogą być nadpisywane przez zmienne środowiskowe
 */

module.exports = {
  // Timeouty (w milisekundach)
  RPC_TIMEOUT: parseInt(process.env.RPC_TIMEOUT_MS) || 4000,
  HTTP_TIMEOUT: parseInt(process.env.HTTP_TIMEOUT_MS) || 8000,
  ZMQ_TIMEOUT: parseInt(process.env.ZMQ_TIMEOUT_MS) || 4000,
  FETCH_TIMEOUT: parseInt(process.env.FETCH_TIMEOUT_MS) || 5000,
  
  // Porty
  ZMQ_PORT: parseInt(process.env.ZMQ_PORT) || 19995,
  HTTP_PORT: parseInt(process.env.HTTP_PORT) || 19994,
  POOL_PORT: parseInt(process.env.POOL_PORT) || 19998,
  
  
  // Inne
  PROV_IP_STEP: parseInt(process.env.PROV_IP_STEP) || 100,
  STALE_CACHE_MS: parseInt(process.env.STALE_CACHE_MS) || 60 * 60 * 1000, // 1 godzina
};
