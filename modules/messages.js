// ---------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

// ---------------------------------------------------------
// GLOBALS
// ---------------------------------------------------------
let currentChat = null;
let currentPartner = null;
let typingTimeout;

// ---------------------------------------------------------
// LOAD DM LIST
// ---------------------------------------------------------
async function loadDMList() {
  let uid = auth.currentUser.uid;
  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  const snap = await getDocs(q);

  let dmListBox = document.getElementById("dmList");
  if (!dmListBox) return;

  let html = "";

  for (let chatDoc of snap.docs) {
    let chat = chatDoc.data();
    let otherId = chat.members.find(m => m !== uid);

    let otherSnap = await getDoc(doc(db, "users", otherId));
    let other = otherSnap.data();

    html += `
      <div class="dm-item glass" onclick="openChat('${chatDoc.id}', '${otherId}')">
        <img class="dm-avatar" src="${other.avatar}">
        <div>
          <p class="dm-user">${other.name} (@${other.username})</p>
          <p class="dm-last">${chat.lastMessage || ""}</p>
        </div>
      </div>
    `;
  }

  dmListBox.innerHTML = html || `<p class="empty">No messages yet</p>`;
}

window.loadDMList = loadDMList;

// ---------------------------------------------------------
// OPEN CHAT WINDOW
// ---------------------------------------------------------
async function openChat(chatId, partnerId) {
  currentChat = chatId;
  currentPartner = partnerId;

  document.getElementById("dmList").style.display = "none";
  document.getElementById("chatBox").style.display = "block";

  // Load partner info
  let snap = await getDoc(doc(db, "users", partnerId));
  let user = snap.data();

  document.getElementById("chatHeaderName").innerText =
    `${user.name} (@${user.username})`;

  document.getElementById("chatHeaderImg").src = user.avatar;

  // ONLINE/OFFLINE DOT
  let dot = document.getElementById("onlineDot");
  dot.style.background = user.online ? "#0f0" : "#777";

  // Mark as seen
  await setDoc(doc(db, "chats", chatId), {
    seenBy: auth.currentUser.uid
  }, { merge: true });

  loadMessages(chatId);
}

window.openChat = openChat;

// ---------------------------------------------------------
// REAL-TIME MESSAGES
// ---------------------------------------------------------
function loadMessages(chatId) {
  const msgsRef = collection(db, "chats", chatId, "messages");

  onSnapshot(msgsRef, (snap) => {
    let html = "";

    snap.forEach((m) => {
      let data = m.data();
      let mine = data.from === auth.currentUser.uid;

      // SEEN / READ INDICATOR (iMessage style)
      (async () => {
        let chatSnap = await getDoc(doc(db, "chats", currentChat));
        let chatData = chatSnap.data();

        if (!chatData || chatData.seenBy !== currentPartner) return;

        // Only show read receipt if last message belongs to me
        let lastMsg = snap.docs[snap.docs.length - 1];
        if (!lastMsg || lastMsg.data().from !== auth.currentUser.uid) return;

        let time = new Date(chatData.lastSeenTime || Date.now());
        let formatted = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        document.getElementById("messages").innerHTML += `
          <p class="read-receipt">Read ${formatted}</p>
        `;
      })();

      // IMAGE
      if (data.type === "image") {
        html += `
          <div class="msg ${mine ? "me" : "them"}">
            <img src="${data.imageURL}" class="chat-img">
          </div>
        `;
        return;
      }

      // AUDIO
      if (data.type === "audio") {
        html += `
          <div class="msg ${mine ? "me" : "them"}">
            <audio controls src="${data.audioURL}" class="chat-audio"></audio>
          </div>
        `;
        return;
      }

      // TEXT
      html += `
        <div class="msg ${mine ? "me" : "them"}">
          ${data.text}
        </div>
      `;
    });

    document.getElementById("messages").innerHTML = html;
  });

  // TYPING INDICATOR LISTENER
  onSnapshot(doc(db, "chats", chatId), (cSnap) => {
    let c = cSnap.data();
    if (c.typing && c.typing !== auth.currentUser.uid) {
      document.getElementById("typingIndicator").style.display = "block";
    } else {
      document.getElementById("typingIndicator").style.display = "none";
    }
  });
}

window.loadMessages = loadMessages;

// ---------------------------------------------------------
// SEND MESSAGE
// ---------------------------------------------------------
async function sendMessage() {
  let input = document.getElementById("dmInput");
  let text = input.value.trim();
  if (!text) return;

  // Add message
  await addDoc(collection(db, "chats", currentChat, "messages"), {
    text,
    from: auth.currentUser.uid,
    to: currentPartner,
    time: Date.now(),
    type: "text"
  });

  // Update last message
  await setDoc(doc(db, "chats", chatId), {
    seenBy: auth.currentUser.uid,
    lastSeenTime: Date.now()
  }, { merge: true });

  input.value = "";
}

window.sendMessage = sendMessage;

// ---------------------------------------------------------
// TYPING INDICATOR INPUT HANDLER
// ---------------------------------------------------------
document.getElementById("dmInput").addEventListener("input", () => {
  setDoc(doc(db, "chats", currentChat), {
    typing: auth.currentUser.uid
  }, { merge: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    setDoc(doc(db, "chats", currentChat), { typing: "" }, { merge: true });
  }, 1200);
});

// ---------------------------------------------------------
// IMAGE SENDING
// ---------------------------------------------------------
function openImagePicker() {
  document.getElementById("imgPicker").click();
}

window.openImagePicker = openImagePicker;

async function sendImage(e) {
  let file = e.target.files[0];
  if (!file) return;

  // Fake upload URL
  let url = URL.createObjectURL(file);

  await addDoc(collection(db, "chats", currentChat, "messages"), {
    from: auth.currentUser.uid,
    type: "image",
    imageURL: url,
    time: Date.now()
  });
}

window.sendImage = sendImage;

// ---------------------------------------------------------
// VOICE RECORDING
// ---------------------------------------------------------
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  audioChunks = [];
  mediaRecorder.start();

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    let blob = new Blob(audioChunks, { type: "audio/mp3" });
    let url = URL.createObjectURL(blob);

    await addDoc(collection(db, "chats", currentChat, "messages"), {
      from: auth.currentUser.uid,
      type: "audio",
      audioURL: url,
      time: Date.now()
    });
  };

  setTimeout(() => mediaRecorder.stop(), 4000);
}

window.startRecording = startRecording;

