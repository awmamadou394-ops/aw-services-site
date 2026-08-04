self.addEventListener('push', function(event) {
  var data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'AW SERVICES', body: 'Nouvelle notification' };
  }
  var options = {
    body: data.body || 'Nouvelle notification',
    icon: 'Logoawservices.png',
    badge: 'Logoawservices.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || 'index.html' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'AW SERVICES', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : 'index.html';
  event.waitUntil(
    clients.openWindow(url)
  );
});
