self.addEventListener("install", () => {
    console.log("StockPilot PWA installed");
});

self.addEventListener("fetch", event => {
    event.respondWith(fetch(event.request));
});
