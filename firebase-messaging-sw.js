importScripts('https://www.gstatic.com/firebasejs/4.2.0/firebase-app.js')
importScripts('https://www.gstatic.com/firebasejs/4.2.0/firebase-messaging.js')

const firebaseConfig = {
    apiKey: "AIzaSyCwQAkUO7gIGop8ykEL9oyGuY5376iTSBw",
    authDomain: "anonynoteclone.firebaseapp.com",
    projectId: "anonynoteclone",
    storageBucket: "anonynoteclone.appspot.com",
    messagingSenderId: "285797775898",
    appId: "1:285797775898:web:b7fb75ca0a0eed7441afa3",
    measurementId: "G-R57G8TM40B"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler((payload) => {
    const title = "Anonynote";
    const options = {
        body: payload.data.status
    }
    return self.registration.showNotification(title, options)
})

const staticAssets = [
    './',
    './index.html',
    './src/styles/styles.css',
    './src/scripts/functionality.js'
];

const cacheName = 'notesCache';
const API_URL = "https://backend-pwa.onrender.com";

// const firebaseConfig = {
//     apiKey: "AIzaSyCwQAkUO7gIGop8ykEL9oyGuY5376iTSBw",
//     authDomain: "anonynoteclone.firebaseapp.com",
//     projectId: "anonynoteclone",
//     storageBucket: "anonynoteclone.appspot.com",
//     messagingSenderId: "285797775898",
//     appId: "1:285797775898:web:b7fb75ca0a0eed7441afa3",
//     measurementId: "G-R57G8TM40B"
// };

// firebase.initializeApp(firebaseConfig);

// const messaging = firebase.messaging();

// messaging.onMessage((msg) => console.log(msg));

self.addEventListener('install', async event => {
    const cache = await caches.open(cacheName);
    cache.addAll(staticAssets);
});

const networkFirstThenCache = async (request) => {
    const cache = await caches.open(cacheName);
    if(request.method == "GET"){
        try {
            // Fetch request
            const response = await fetch(request);
            // Save into cache
            cache.put(request, response.clone())
            console.log('Used network')
            return response
        } 
        catch (error) {
            console.log('Falling back to cache...')
            const res = await cache.match(request)
            console.log(request.url.startsWith(API_URL));
            if(res == undefined) return new Response('{}', {"status": 404, "statusText": "cache-network miss"});
            // if(res == undefined || request.url.startsWith(API_URL) ) return new Response('{}', {"status": 404, "statusText": "cache-network miss"});
            return res
        }
    }
    else{
        try {
            // Fetch request
            const response = await fetch(request);
            return response
        } 
        catch (error) {
            return new Response("", {"status": 404, "statusText": "network miss"});
        }
    }
}

self.addEventListener('fetch', event => {
    const {request} = event;
    // const url = new URL(request.url);
    console.log("Logging from serviceWorker fetch event")
    console.log("Using networkFirst Strategy...")

    event.respondWith(networkFirstThenCache(request));
});
