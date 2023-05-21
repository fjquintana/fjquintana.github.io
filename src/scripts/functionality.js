const url = "https://backend-pwa.onrender.com";

let requests = [];
let notificationPermission = false;
let notificationToken = undefined;

const executeRequestQueue = async () => {
    const requestQueue = requests;
    if(requestQueue.length == 0) return;
    while(requestQueue.length > 0){
        const [request, id] = requestQueue.shift();
        
        let url = request.url;
        if(request.type == "deleteNote"){
            url = request.url + idAssociations[id];
        }

        if(request.type == "editNote"){
            url = request.url + idAssociations[id];
        }

        const requestData = {
            method: request["method"],
            headers: request["headers"],
        }
        if (request.body) {
            const body = JSON.parse(request.body)
            body.token = notificationToken;
            requestData.body = JSON.stringify(body);
        }

        console.log(requestData.body)

        const req = new Request(url, requestData);
        const res = await fetch(req);


        if(res.statusText == "network miss"){
            requestQueue.unshift([request, id]);
            break;
        }
        else{
            console.log("Executed:", request)
        }

        const resBody = await res.json();

        if(request.type == "createNote"){
            const noteID = resBody["noteID"];
            idAssociations[id] = noteID;
            for (let note of notepad.notes) {
                if (note.localId == id) {
                    note.serverId = noteID;
                    break;
                }
            }
        }
    }
    console.log(idAssociations)
}

const executeRequest = async (request, id) => {
    requests.push([request, id]);

    executeRequestQueue();
}

const createNote = async() =>{

    const noteText = document.getElementById("short-note").value;

    const note = newNote(noteText, nextID);
    
    notepad.notes.push({
        localId: nextID,
        content: noteText,
        serverId: undefined
    })

    nextID++;

    const noteListElement = document.getElementById("notes");

    noteListElement.appendChild(note);

    const request = {
        "url": `${url}/notepad/${notepad["notepadName"]}`,
        "method": "POST",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        "type": "createNote",
        "body": JSON.stringify({
            "noteText": noteText
        })
    };

    executeRequest(request, nextID - 1);
    console.log(notepad.notes)
}

let notepad = {}
let idAssociations = {}
let nextID = 0;

function colorNote(index) {
    classList = document.getElementsByClassName("note")[index]
        .classList

    if (classList.contains("colored-note")){
        classList.remove("colored-note")
    } else {
        classList.add("colored-note")
    }
}

function deleteNote(index) {
    const parent = document.getElementById("notes");
    const children = parent.children;
    const newChildren = [];

    let deleteIdx = undefined;
    for (let idx = 0; idx < notepad.notes.length; idx++) {
        if (notepad.notes[idx].localId == index) {
            deleteIdx = idx
        }
        else {
            newChildren.push(children[idx])
        }
    }

    notepad.notes.splice(deleteIdx, 1);

    const request = {
        "url": `${url}/notepad/${notepad["notepadName"]}/`,
        "method": "DELETE",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        "type": "deleteNote"
    };

    parent.replaceChildren(...newChildren);

    executeRequest(request, index);
    console.log(notepad)
}

function deleteNotes() {
    const parent = document.getElementById("notes");
    const newChildren = [];

    for(const note of notepad.notes){
        const request = {
            "url": `${url}/notepad/${notepad["notepadName"]}/`,
            "method": "DELETE",
            "headers": {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            "type": "deleteNote"
        };

        executeRequest(request, note.localId);
    }

    parent.replaceChildren(...newChildren);
}

const getNotificationToken = () => {
    console.log("getNotificationToken", notificationPermission)
    if(!notificationPermission) return;
    // if(notificationToken != undefined) return;
    messaging.getToken()
             .then((token) =>{
                notificationToken = token;
                console.log("set notification token", token)
                saveNotificationToken();
            })
             .catch((e) => console.log(e))
}

const saveNotificationToken = () => {
    const request = {
        "url": `${url}/token`,
        "method": "POST",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        "type": "saveToken",
        "body": JSON.stringify({
            "token": notificationToken,
            "notepadName": notepad["notepadName"]
        })
    }

    executeRequest(request, undefined);
}

const sync = async () => {
    getNotificationToken();
    await executeRequestQueue();
    await updateState();
}

const loadNotepadData = () => {
    const notepadData = localStorage.getItem("notepadData");
    const boardRequest = JSON.parse(localStorage.getItem("queuedRequests"));

    if(boardRequest.length != 0){
        const request = boardRequest[0];
        executeRequest(request, undefined)
    }

    notepad = JSON.parse(notepadData);
}

const setNotepadName = () => {
    const notepadNameElement = document.getElementById("note-name");
    notepadNameElement.value = notepad["notepadName"]; 
}

const setNotepadDescription = () => {
    const descriptionElement = document.getElementById("note-description");
    descriptionElement.value = notepad["description"];
}

const drawNotes = () => {

    const noteTable = document.getElementById("notes");

    const newChildren = [];

    const notes = notepad.notes;
    console.log(notepad)
    for(let note of notes){
        // console.log(note)
        const noteObject = newNote(note.content, note.localId);
        newChildren.push(noteObject);
    }
    // console.log(newChildren);
    noteTable.replaceChildren(...newChildren);
}

// const setNotes = (notepad) => {
//     const notes = notepad["notes"];
//     nextID = 0;
//     idAssociations = {};
//     for(key in notes){
//         idAssociations[nextID] = key;
//         nextID++;
//     }
// }

const parseNotepadNotes = (notepadData) => {
    const rawNotes = notepadData.notes;
    const notesArray = []
    nextID = 0;
    for (serverId of Object.keys(rawNotes)) {
        notesArray.push({
            serverId,
            content: rawNotes[serverId],
            localId: nextID
        })
        idAssociations[nextID] = serverId;
        nextID += 1;
    }
    return notesArray;
}

const updateState = async () => {
    const res = await fetch(`${url}/notepad/${notepad["notepadName"]}`, {method: "GET"});

    if(res.statusText == "cache-network miss"){
        console.log("No connection couldnt update ");
    }
    else{
        notepad = await res.json();
        setNotepadDescription();
        setNotepadName();
        notepad.notes = parseNotepadNotes(notepad)
        drawNotes();
    }
}


const sendEditRequest = (localId, newText) => {
    console.log(localId, newText)

    for (let note of notepad.notes) {
        if (note.localId == localId) {
            note.content = newText;
            break;
        }
    }

    const request = {
        "url": `${url}/notepad/${notepad["notepadName"]}/`,
        "method": "PUT",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        "type": "editNote",
        "body": JSON.stringify({
            "noteText": newText
        })
    };

    executeRequest(request, localId);
    console.log(notepad.notes)
}

const newNote = (noteText, id) => {
    const note = document.createElement("div");
    note.setAttribute("class", "note");
    note.id = id;
        
    // list of icons
    const iconList = document.createElement("div");
    note.appendChild(iconList);
    // iconList.appendChild(document.createElement("i"))
    //     .setAttribute("class", "fas fa-arrows-alt");

    const trash = document.createElement("i");
    trash.setAttribute("class", "far fa-trash-alt");
    trash.setAttribute("onclick", `deleteNote(${id})`);
    iconList.appendChild(trash);

    iconList.appendChild(document.createElement("i"))
        .setAttribute("class", "fas fa-pencil-alt");
    // iconList.appendChild(document.createElement("i"))
        // .setAttribute("class", "fas fa-palette");

    // checkbox
    checkbox = note.appendChild(document.createElement("input"));
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("onclick", `colorNote(${id})`);

    // p
    // const p = document.createElement("p");
    // p.innerHTML = noteText;
    // note.appendChild(p);
    const noteTextInput = document.createElement("input");
    noteTextInput.setAttribute("type", "text");
    noteTextInput.value = String(noteText);
    noteTextInput.addEventListener("change", (e) => sendEditRequest(id, noteTextInput.value));
    note.appendChild(noteTextInput);

    return note;
}

const handleDescriptionChange = () => {
    const descriptionElement = document.getElementById("note-description");
    const descriptionText = descriptionElement.value;

    const notepadName = notepad["notepadName"];

    const request = {
        "url": `${url}/notepad`,
        "method": "PUT",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        "type": "editNotepad",
        "body": JSON.stringify({
            "notepadName": notepadName,
            "newNotepadName": notepadName,
            "newDescription": descriptionText
        })
    };

    executeRequest(request, undefined)
}

const sortNotes = () => {
    let notes = notepad.notes;
    notes.sort((a, b) => {
        if (a.content < b.content) {
            return -1
        }
        else if (a.content > b.content) {
            return 1
        }
        return 0});
    notepad.notes = notes;
    drawNotes();
}

const download = (filename, text) => {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

const notesToJson = () => {
    const notepadString = JSON.stringify(notepad)
    download('notes.json', notepadString)
}

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

const requestPermission = async () => {
    messaging.requestPermission()
            .then(() => {
                notificationPermission = true;
            })
            .then(getNotificationToken);
    
}

requestPermission();

loadNotepadData();
sync()

// // function requestPermission() {
// messaging.requestPermission()
//          .then(() => {
//             console.log("Permission Granted");
//             return messaging.getToken();
//          })
//          .then((token) => {
//             console.log(token)
//          })
//          .catch((e) =>{
//             console.log("Error", e)
//          })
messaging.onMessage((payload) => {
    alert('Hay informacion nueva, haz Refresh!')
})
