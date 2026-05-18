// ══════════════════════════════════════════════════════
// TWM DataLink — Service Worker
// Muda CACHE_VERSION a cada deploy para forçar atualização
// ══════════════════════════════════════════════════════

const CACHE_VERSION = 'twm-v2026.05.18';

const ARQUIVOS_CACHE = [
  '/',
  '/index.html',
  '/lavagem.html',
  '/abastecimento.html',
  '/pneus.html',
  '/estoque.html',
  '/manutencao.html',
  '/relatorios.html',
  '/check_list_twm_oficial.html',
  '/checklist_lvt.html',
  '/checklist_seguranca_mensal.html',
];

// Instala: faz cache dos arquivos
self.addEventListener('install', event => {
  self.skipWaiting(); // Ativa imediatamente sem esperar fechar abas
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ARQUIVOS_CACHE)).catch(() => {})
  );
});

// Ativa: remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // Assume controle imediato de todas as abas
  );
});

// Fetch: Network First — tenta buscar versão nova, fallback para cache
self.addEventListener('fetch', event => {
  // Só intercepta arquivos HTML e recursos do próprio domínio
  const url = new URL(event.request.url);
  if (!ARQUIVOS_CACHE.some(f => url.pathname.endsWith(f.replace('/',''))) && 
      !url.pathname.endsWith('.html')) {
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        // Salva versão nova no cache
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)) // Offline: usa cache
  );
});
