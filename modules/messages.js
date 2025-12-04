// messages.js — Instagram-style DMs with themes, search & Firestore chatrooms
import {
  getFirestore, collection, query, where, getDocs,
  addDoc, orderBy, onSnapshot, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db, auth } from "../firebase.js";

export function render() {
  loadDMList();

  return `
    <div class="messages-container">

      <!-- SEARCH BAR -->
      <input id="dmSearchInput" class="dm-search" 
             placeholder="Search in messages..."
             oninput="filterDMs()">

      <!-- DM LIST -->
      <div id="dmList" class="dm-list"></div>

      <!-- CHAT WINDOW -->
      <div id="chatWindow" class="chat-window hidden">
        <div id="chatHeader" class="chat-header glass"></div>

        <div id="chatMessages" class="chat-messages"></div>

        <div class="chat-input-box">
          <input id="msgInput" placeholder="Message..." onkeydown="sendMessageOnEnter(event)">
          <button onclick="sendMessage()">➤</button>
        </div>
      </div>

    </div>
  `;
}

// --------------------------------------------------------
// LOAD DM LIST
// --------------------------------------------------------


async function loadDMList() {
  let uid = auth.currentUser.uid;

  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  const snap = await getDocs(q);

  let dmListBox = document.getElementById("dmList");
  if (!dmListBox) return;

  let html = "";

  // FIX: Use for...of instead of forEach to allow await
  for (let chatDoc of snap.docs) {
    let chat = chatDoc.data();

    // Find the other user in the chat
    let otherUser = chat.members.find(m => m !== uid);

    // FIX: Correct Firestore doc() usage
    const userRef = doc(db, "users", otherUser);
    const otherSnap = await getDoc(userRef);
    const other = otherSnap.data();

    html += `
      <div class="dm-item glass" onclick="openChat('${chatDoc.id}', '${otherUser}')">
        <img class="dm-avatar" src="${other.avatar}">
        <div>
          <p class="dm-user">${other.name} (@${other.username})</p>
          <p class="dm-last">${chat.lastMessage || ""}</p>
        </div>
      </div>
    `;
  }

  dmListBox.innerHTML = html || `<p class='empty'>No messages yet</p>`;
}

// --------------------------------------------------------
// OPEN CHAT WINDOW
// --------------------------------------------------------

window.openChat = async function(chatId, otherUID) {
  document.getElementById("chatWindow").classList.remove("hidden");

  const otherRef = doc(db, "users", otherUID);
  const otherSnap = await getDoc(otherRef);
  const other = otherSnap.data();

  // HEADER
  document.getElementById("chatHeader").innerHTML = `
    <img class="dm-avatar" src="${other.avatar || 'https://i.pravatar.cc/100?u='+otherUID}">
    <p>@${other.username}</p>
  `;

  loadMessages(chatId);
  window.currentChat = chatId;
  window.currentOther = otherUID;
};

// --------------------------------------------------------
// LOAD MESSAGES REALTIME
// --------------------------------------------------------

function loadMessages(chatId) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("time"));

  onSnapshot(q, (snap) => {
    let box = document.getElementById("chatMessages");
    let html = "";

    snap.forEach(doc => {
      let msg = doc.data();

      html += `
        <div class="msg ${msg.sender === auth.currentUser.uid ? 'me' : 'them'}">
          <p>${msg.text}</p>
        </div>
      `;
    });

    box.innerHTML = html;

    // scroll bottom
    setTimeout(() => {
      box.scrollTop = box.scrollHeight;
    }, 50);
  });
}

// --------------------------------------------------------
// SEND MESSAGE
// --------------------------------------------------------

window.sendMessageOnEnter = (e) => {
  if (e.key === "Enter") sendMessage();
};

window.sendMessage = async function() {
  let input = document.getElementById("msgInput");

  if (!input.value.trim()) return;

  let chatId = window.currentChat;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    text: input.value,
    sender: auth.currentUser.uid,
    time: Date.now()
  });

  // update last message
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    lastMessage: input.value
  });

  input.value = "";
};
