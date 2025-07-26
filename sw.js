// Digital Logic Simulator - Service Worker for PWA
const CACHE_NAME = 'digital-logic-simulator-v1.0.0';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './js/theme.js',
    './js/verilog-editor.js',
    './js/ui-enhancements.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                // Cache files individually to handle failures gracefully
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn(`Service Worker: Failed to cache ${url}:`, error);
                            return Promise.resolve(); // Continue even if one file fails
                        });
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Install complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Install failed', error);
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    console.log('Service Worker: Serving from cache', request.url);
                    return response;
                }

                console.log('Service Worker: Fetching from network', request.url);
                return fetch(request).then(response => {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Only cache same-origin requests and specific external resources
                    if (url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com') {
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            })
                            .catch(error => {
                                console.warn('Service Worker: Failed to cache resource', request.url, error);
                            });
                    }

                    return response;
                });
            })
            .catch(error => {
                console.error('Service Worker: Fetch failed', request.url, error);
                // Return offline fallback for HTML pages
                if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
                // For other resources, just let it fail
                throw error;
            })
    );
});

// Background sync for saving circuits offline
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync-circuit') {
        console.log('Service Worker: Background sync triggered');
        event.waitUntil(syncCircuitData());
    }
});

// Handle messages from main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Function to sync circuit data when back online
async function syncCircuitData() {
    try {
        // Get pending circuit saves from IndexedDB
        const db = await openDB();
        const tx = db.transaction(['pendingCircuits'], 'readonly');
        const store = tx.objectStore('pendingCircuits');
        const pendingCircuits = await store.getAll();

        for (const circuit of pendingCircuits) {
            try {
                // Attempt to sync with server (if implemented)
                console.log('Syncing circuit:', circuit.name);
                // await fetch('/api/circuits', { method: 'POST', body: JSON.stringify(circuit) });

                // Remove from pending after successful sync
                const deleteTx = db.transaction(['pendingCircuits'], 'readwrite');
                const deleteStore = deleteTx.objectStore('pendingCircuits');
                await deleteStore.delete(circuit.id);
            } catch (error) {
                console.error('Failed to sync circuit:', circuit.name, error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// IndexedDB helper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('DigitalLogicSimulator', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pendingCircuits')) {
                db.createObjectStore('pendingCircuits', { keyPath: 'id' });
            }
        };
    });
}

// Push notification handler (for future features)
self.addEventListener('push', event => {
    if (event.data) {
        const options = {
            body: event.data.text(),
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            vibrate: [200, 100, 200],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Open Simulator',
                    icon: '/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: 'Close',
                    icon: '/icon-192x192.png'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification('Digital Logic Simulator', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
