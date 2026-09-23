/*
================================================================================
BARCH AERO-CANYON RACING - SERVICE WORKER
Offline Cache API orchestrator for instant 0ms startup and offline playability
================================================================================
*/

const CACHE_NAME = 'barch-aero-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/game.css',
    './js/coordinator.js',
    './js/config.js',
    './js/audio/sound_engine.js',
    './js/input/input_manager.js',
    './js/input/touch_controls.js',
    './js/input/desktop_controls.js',
    './js/engine/drone.js',
    './js/engine/stunt_fsm.js',
    './js/engine/track_builder.js',
    './js/engine/ai_racer.js',
    './js/engine/extraction_engine.js',
    './js/engine/camera_rig.js',
    './js/engine/particle_system.js',
    './js/ui/hangar_settings.js',
    './js/ui/hud.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Pre-cache warning (some remote assets will be cached on first fetch):', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Cache-First strategy with network fallback
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Return offline fallback if network fails
                return caches.match('./index.html');
            });
        })
    );
});
