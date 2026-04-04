const CACHE_NAME = "hapa-study-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./src/review-data.js",
  "./src/review-filters.js",
  "./src/review-session.js",
  "./src/review-render.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png"
];

// Install: cache all static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isNetworkFirstRequest(requestUrl) {
  const url = new URL(requestUrl);
  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname;
  return (
    pathname === "/" ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith("/styles.css") ||
    pathname.endsWith("/manifest.json")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

// Fetch: keep offline support, but refresh app/data files from the network first.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    isNetworkFirstRequest(event.request.url)
      ? networkFirst(event.request)
      : cacheFirst(event.request)
  );
});
