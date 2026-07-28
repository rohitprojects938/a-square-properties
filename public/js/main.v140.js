(async function() {
  console.log('🔄 Old cache detected. Clearing caches and forcing reload...');
  if ('caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map(k => window.caches.delete(k)));
    } catch(e) {}
  }
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let r of regs) { await r.unregister(); }
    } catch(e) {}
  }
  window.location.reload();
})();
