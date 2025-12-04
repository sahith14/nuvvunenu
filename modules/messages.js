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
let longPressTimer = null;
let selectedMsgId = null;

// ---------------------------------------------------------
// LOAD DM LIST
// ---------------------------------------------------------
async function loadDMList() {
  let uid = auth.currentUser.uid;
  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  const snap = await getDocs(q);

  let list = document.getElementById("dmList");
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

  list.innerHTML = html || `<p class="empty">No messages yet</p>`;
}
window.loadDMList = loadDMList;

// ---------------------------------------------------------
// OPEN CHAT
// ---------------------------------------------------------
async function openChat(chatId, partnerId) {
  currentChat = chatId;
  currentPartner = partnerId;

  document.getElementById("dmList").style.display = "none";
  document.getElementById("chatBox").style.display = "block";

  let snap = await getDoc(doc(db, "users", partnerId));
  let user = snap.data();

  document.getElementById("chatHeaderName").innerText =
    `${user.name} (@${user.username})`;

  document.getElementById("chatHeaderImg").src = user.avatar;
  document.getElementById("onlineDot").style.background =
    user.online ? "#0f0" : "#777";

  // Mark as seen
  await setDoc(doc(db, "chats", chatId), {
    seenBy: auth.currentUser.uid,
    lastSeenTime: Date.now()
  }, { merge: true });

  loadMessages(chatId);
}
window.openChat = openChat;

// ---------------------------------------------------------
// LOAD MESSAGES (REAL-TIME)
// ---------------------------------------------------------
function loadMessages(chatId) {
  const msgsRef = collection(db, "chats", chatId, "messages");

  onSnapshot(msgsRef, async (snap) => {
    let html = "";
    let uid = auth.currentUser.uid;
    let messages = snap.docs;

    for (let m of messages) {
      let data = m.data();
      let mine = data.from === uid;

      // BUBBLE START (long-press + swipe)
      let start = `
        <div class="msg ${mine ? "me" : "them"}"
          onmousedown="longPressTimer=setTimeout(()=>showReactionMenu(event,'${m.id}'),500)"
          onmouseup="clearTimeout(longPressTimer)"
          ontouchstart="longPressTimer=setTimeout(()=>showReactionMenu(event,'${m.id}'),500)"
          ontouchend="clearTimeout(longPressTimer)"
          onmousemove="if(event.movementX > 18) swipeToReply('${data.text?.replace(/'/g, "\\'")}')"
        >
      `;

      // IMAGE MESSAGE
      if (data.type === "image") {
        html += `
          ${start}
            <img src="${data.imageURL}" class="chat-img">
          </div>
          ${data.reaction ? `<div class="reaction-bubble">${data.reaction}</div>` : ""}
        `;
        continue;
      }

      // AUDIO MESSAGE
      if (data.type === "audio") {
        html += `
          ${start}
            <audio controls src="${data.audioURL}" class="chat-audio"></audio>
          </div>
          ${data.reaction ? `<div class="reaction-bubble">${data.reaction}</div>` : ""}
        `;
        continue;
      }

      // TEXT MESSAGE
      html += `
        ${start}
          ${data.text}
        </div>
        ${data.reaction ? `<div class="reaction-bubble">${data.reaction}</div>` : ""}
      `;
    }

    document.getElementById("messages").innerHTML = html;

    // AUTO SCROLL
    let box = document.getElementById("messages");
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });

    // READ RECEIPT (iMessage style)
    let chatSnap = await getDoc(doc(db, "chats", currentChat));
    let chatData = chatSnap.data();

    if (chatData && chatData.seenBy === currentPartner) {
      let last = messages[messages.length - 1];
      if (last && last.data().from === uid) {
        let t = new Date(chatData.lastSeenTime);
        let formatted = t.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
        document.getElementById("messages").innerHTML +=
          `<p class="read-receipt">Read ${formatted}</p>`;
      }
    }
  });

  // TYPING LISTENER
  onSnapshot(doc(db, "chats", chatId), (s) => {
    let d = s.data();
    document.getElementById("typingIndicator").style.display =
      d.typing && d.typing !== auth.currentUser.uid ? "flex" : "none";
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

  await addDoc(collection(db, "chats", currentChat, "messages"), {
    text,
    from: auth.currentUser.uid,
    to: currentPartner,
    type: "text",
    time: Date.now()
  });

  await setDoc(doc(db, "chats", currentChat), {
    lastMessage: text
  }, { merge: true });

  input.value = "";
}
window.sendMessage = sendMessage;

// ---------------------------------------------------------
// TYPING INDICATOR (real-time)
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

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

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

// ---------------------------------------------------------
// REACTIONS
// ---------------------------------------------------------
window.sendReaction = async function (emoji) {
  if (!selectedMsgId) return;

  await setDoc(
    doc(db, "chats", currentChat, "messages", selectedMsgId),
    { reaction: emoji },
    { merge: true }
  );

  hideReactionMenu();
};

function showReactionMenu(e, msgId) {
  selectedMsgId = msgId;
  const menu = document.getElementById("reactionMenu");
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY - 40 + "px";
  menu.style.display = "flex";
}
window.showReactionMenu = showReactionMenu;

function hideReactionMenu() {
  document.getElementById("reactionMenu").style.display = "none";
}
window.hideReactionMenu = hideReactionMenu;

// ---------------------------------------------------------
// SWIPE TO REPLY
// ---------------------------------------------------------
window.swipeToReply = function (text) {
  let input = document.getElementById("dmInput");
  input.value = `↩️ ${text}\n`;
  input.focus();
};
