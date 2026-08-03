self.addEventListener('push', function(event) {
  var data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'AW SERVICES', body: 'Nouvelle commande disponible' };
  }
  var options = {
    body: data.body || 'Nouvelle commande disponible',
    icon: 'Logoawservices.png',
    badge: 'Logoawservices.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'AW SERVICES', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('livreur-espace.html')
  );
});
