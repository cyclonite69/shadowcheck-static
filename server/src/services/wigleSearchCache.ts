export {};

type SearchCacheEntry = {
  expiresAt: number;
  data: any;
};

const cache = new Map<string, SearchCacheEntry>();

function getPositiveTtlMs() {
  const value = Number(process.env.WIGLE_SEARCH_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : 60 * 60 * 1000;
}

function getNegativeTtlMs() {
  const value = Number(process.env.WIGLE_SEARCH_NEGATIVE_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : 15 * 60 * 1000;
}

function getCachedSearchResponse(hash: string) {
  const entry = cache.get(hash);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(hash);
    return null;
  }

  return entry.data;
}

function setCachedSearchResponse(hash: string, data: any) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const ttlMs = results.length === 0 ? getNegativeTtlMs() : getPositiveTtlMs();

  cache.set(hash, {
    expiresAt: Date.now() + ttlMs,
    data,
  });
}

function resetSearchCache() {
  cache.clear();
}

export { getCachedSearchResponse, resetSearchCache, setCachedSearchResponse };
