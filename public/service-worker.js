// public/service-worker.js

// Push esemény kezelése
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Default Title', message: 'Default Message' };
    const options = {
      body: data.message,
      icon: '/icon.png',
      badge: '/badge.png',
      data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data.url || '/';
    event.waitUntil(clients.openWindow(url));
  });

  
  // Értesítésre kattintás kezelése
  self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Bezárja az értesítést
  
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url) // Megnyitja az URL-t egy új ablakban
    );
  });
  
  // Opcionális: telepítési log
  self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
  });
  
  // Opcionális: aktiválási log
  self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
  });