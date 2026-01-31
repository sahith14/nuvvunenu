// messages.js — Instagram-style DMs with themes, search & Firestore chatrooms
import { arrayUnion } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFirestore, collection, query, where, getDocs,
  addDoc, orderBy, onSnapshot, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db, auth } from "../firebase.js";

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export function render() {
  loadDMList();

  return `
    <div class="ig-dm">

      <div class="ig-dm-list">
        <input id="dmSearchInput"
               class="dm-search"
               placeholder="Search"
               oninput="filterDMs()">

        <div id="dmList" class="dm-list"></div>
      </div>

      <div id="chatWindow" class="ig-chat hidden">

        <!-- EMPTY STATE -->
        <div id="chatEmptyState" class="ig-chat-empty">
          <div class="empty-icon">💬</div>
          <h3>Your messages</h3>
          <p>Select a chat to start a conversation</p>
        </div>

        <!-- CHAT HEADER -->
        <div id="chatHeader" class="ig-chat-header"></div>

        <div id="typingIndicator" class="typing-indicator hidden"></div>

        <!-- MESSAGES -->
        <div id="chatMessages" class="ig-chat-messages"></div>

        <!-- INPUT -->
        <div class="ig-chat-input">
          <input id="msgInput"
                 placeholder="Message..."
                 oninput="handleTyping()"
                 onkeydown="sendMessageOnEnter(event)">
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

  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid),
    orderBy("lastMessageTime", "desc")
  );


  const snap = await getDocs(q);

  let dmListBox = document.getElementById("dmList");
  if (!dmListBox) return;

  let html = "";

  snap.forEach(doc => {
    let chat = doc.data();
    let otherUser = chat.members.filter(m => m !== uid)[0];

    html += `
      <div class="dm-item glass" onclick="openChat('${doc.id}', '${otherUser}')">
        <img class="dm-avatar" src="https://i.pravatar.cc/100?u=${otherUser}">
        <div>
          <p class="dm-user">${chat.usernames?.[otherUser] || "User"}</p>
          <p class="dm-last">${chat.lastMessage || ""}</p>
        </div>
      </div>
    `;
  });

  dmListBox.innerHTML = html || `<p class='empty'>No messages yet</p>`;
}

window.filterDMs = function () {
  const input = document.getElementById("dmSearchInput");
  if (!input) return;

  const text = input.value.toLowerCase().trim();
  const items = document.querySelectorAll(".dm-item");

  items.forEach(item => {
    const userEl = item.querySelector(".dm-user");
    if (!userEl) return;

    const name = userEl.textContent.toLowerCase();
    item.style.display = name.includes(text) ? "flex" : "none";
  });
};

function renderSeen(msg) {
  // only show ticks for messages I sent
  if (msg.sender !== auth.currentUser.uid) return "";

  const otherUID = window.currentOther;

  if (msg.seenBy?.includes(otherUID)) {
    return `<span class="tick seen">✔✔</span>`;
  }

  if (msg.deliveredTo?.includes(otherUID)) {
    return `<span class="tick delivered">✔✔</span>`;
  }

  return `<span class="tick sent">✔</span>`;
}

// --------------------------------------------------------
// OPEN CHAT WINDOW
// --------------------------------------------------------

window.openChat = async function(chatId, otherUID) {
  const root = document.querySelector(".ig-dm");
  const chatWindow = document.getElementById("chatWindow");
  const emptyState = document.getElementById("chatEmptyState");

  if (!chatWindow || !root) return;

  // 🔑 THIS IS THE MISSING LINE (SLIDE IN)
  root.classList.add("chat-open");

  // show chat panel
  chatWindow.classList.remove("hidden");

  // hide empty state
  if (emptyState) emptyState.style.display = "none";

  const otherRef = doc(db, "users", otherUID);
  const otherSnap = await getDoc(otherRef);
  const other = otherSnap.data();

  document.getElementById("chatHeader").innerHTML = `
    <button class="dm-back" onclick="closeChat()">←</button>
    <img class="dm-avatar" src="${other.avatar || 'https://i.pravatar.cc/100?u=' + otherUID}">
    <div class="dm-user-info">
      <p class="dm-username">${other.username}</p>
      <p id="userStatus" class="dm-status">Loading...</p>
    </div>
  `;

  loadMessages(chatId);
  listenForTyping(chatId);
  listenUserStatus(otherUID);

  window.currentChat = chatId;
  window.currentOther = otherUID;
};

// --------------------------------------------------------
// LOAD MESSAGES REALTIME
// --------------------------------------------------------

let unsubscribeMessages;

function loadMessages(chatId) {
  unsubscribeMessages?.();

  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("time")
  );

  unsubscribeMessages = onSnapshot(q, (snap) => {
    let box = document.getElementById("chatMessages");
    let html = "";

    snap.forEach(docu => {
      const msg = docu.data();
        
      // MARK AS DELIVERED
      if (
        msg.sender !== auth.currentUser.uid &&
        !msg.deliveredTo?.includes(auth.currentUser.uid)
      ) {
        updateDoc(docu.ref, {
          deliveredTo: arrayUnion(auth.currentUser.uid)
        });
      }
      
      // MARK AS SEEN
      if (
        msg.sender !== auth.currentUser.uid &&
        !msg.seenBy?.includes(auth.currentUser.uid)
      ) {
        updateDoc(docu.ref, {
          seenBy: arrayUnion(auth.currentUser.uid)
        });
      }

      html += `
        <div class="msg ${msg.sender === auth.currentUser.uid ? 'me' : 'them'}">
          <p>${msg.text}</p>
          <span class="msg-time">
            ${msg.time?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          ${renderSeen(msg)}
        </div>
      `;
    });

    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  });
}

function renderReactions(reactions = {}) {
  return Object.values(reactions)
    .map(e => `<span class="reaction">${e}</span>`)
    .join("");
}

let longPressTimer;

window.handleLongPress = function (e, msgId) {
  longPressTimer = setTimeout(() => {
    openReactionPicker(e, msgId);
  }, 500);
};

window.openReactionPicker = function (e, msgId) {
  e.preventDefault();
  showReactionPopup(e.clientX, e.clientY, msgId);
};

function showReactionPopup(x, y, msgId) {
  removeReactionPopup();

  const popup = document.createElement("div");
  popup.id = "reactionPopup";
  popup.innerHTML = `
    <span onclick="react('${msgId}','❤️')">❤️</span>
    <span onclick="react('${msgId}','🔥')">🔥</span>
    <span onclick="react('${msgId}','😂')">😂</span>
    <span onclick="react('${msgId}','😮')">😮</span>
  `;

  popup.style.left = x + "px";
  popup.style.top = y + "px";

  document.body.appendChild(popup);
}

function removeReactionPopup() {
  document.getElementById("reactionPopup")?.remove();
}

document.addEventListener("click", removeReactionPopup);

window.react = async function (msgId, emoji) {
  const uid = auth.currentUser.uid;
  const ref = doc(db, "chats", window.currentChat, "messages", msgId);
  const snap = await getDoc(ref);

  const reactions = snap.data().reactions || {};

  if (reactions[uid] === emoji) {
    delete reactions[uid]; // toggle off
  } else {
    reactions[uid] = emoji;
  }

  await updateDoc(ref, { reactions });
};

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
    text: input.value.trim(),
    sender: auth.currentUser.uid,  
    time: serverTimestamp(),

    // delivery states  
    deliveredTo: [auth.currentUser.uid],
    seenBy: [auth.currentUser.uid]  
  });

  // update last message
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    lastMessage: input.value,
    lastMessageTime: serverTimestamp(),
    lastMessageSender: auth.currentUser.uid
  });
  
  input.value = "";
};

let typingTimeout;

window.handleTyping = function () {
  if (!window.currentChat) return;

  const chatRef = doc(db, "chats", window.currentChat);
  const uid = auth.currentUser.uid;

  // mark typing true
  updateDoc(chatRef, {
    [`typing.${uid}`]: true
  });

  clearTimeout(typingTimeout);

  // auto stop typing after 1.5s of inactivity
  typingTimeout = setTimeout(() => {
    updateDoc(chatRef, {
      [`typing.${uid}`]: false
    });
  }, 1500);
};


function listenForTyping(chatId) {
  const chatRef = doc(db, "chats", chatId);
  const indicator = document.getElementById("typingIndicator");
  if (!indicator) return;

  onSnapshot(chatRef, snap => {
    const data = snap.data();
    if (!data?.typing) return;

    const otherUID = window.currentOther;

    if (data.typing[otherUID]) {
      indicator.classList.remove("hidden");
    } else {
      indicator.classList.add("hidden");
    }
  });
}

window.closeChat = function () {
  const root = document.querySelector(".ig-dm");
  const chat = document.getElementById("chatWindow");
  const emptyState = document.getElementById("chatEmptyState");

  if (!root || !chat) return;

  root.classList.remove("chat-open");
  chat.classList.add("hidden");

  if (emptyState) emptyState.style.display = "flex";
};

function listenUserStatus(otherUID) {
  const statusEl = document.getElementById("userStatus");
  if (!statusEl) return;

  const ref = doc(db, "users", otherUID);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      statusEl.textContent = "";
      return;
    }

    const data = snap.data();

    // 🔑 HANDLE MISSING STATUS
    if (!data.status) {
      statusEl.textContent = "Offline";
      return;
    }

    if (data.status.online) {
      statusEl.textContent = "Online";
    } else if (data.status.lastSeen) {
      statusEl.textContent = "Last seen " + formatTimeAgo(data.status.lastSeen.toDate());
    } else {
      statusEl.textContent = "Offline";
    }
  });
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
