const url = "https://backend-pwa.onrender.com";

const createNotepad = async () => {
    notepadName = document.getElementById("notepad-name").value;

    const res = await fetch(`${url}/notepad/${notepadName}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    let notepadData = {}
    if(res.statusText == "cache-network miss"){
        notepadData = {
            "description": "",
            "notes": [],
            "notepadName": notepadName,
            "local": true
        };

        const createNotepadRequest = {
            "url": `${url}/notepad/${notepadName}`,
            "method": "GET",
            "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            "type": "createBoard"
        };

        const queuedRequests = [];
        localStorage.setItem("queuedRequests", JSON.stringify([createNotepadRequest]));
    }

    else{
        localStorage.setItem("queuedRequests", JSON.stringify([]));
        notepadData = await res.json();
        notepadData["local"] = false;
    };

    localStorage.setItem("notepadData", JSON.stringify(notepadData));
    window.location.replace("./src/views/board.html");
}

const registerSW = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('../../firebase-messaging-sw.js', {scope: './'});
            if (registration.installing) {
            console.log('Service worker installing');
            } else if (registration.waiting) {
            console.log('Service worker installed');
            } else if (registration.active) {
            console.log('Service worker active');
            }

        } catch (error) {
            console.log('SW failed');

        }
    }
};

registerSW();