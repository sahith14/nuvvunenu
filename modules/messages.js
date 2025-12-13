// messages.js — fully fixed module

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

import { auth, db } from "../firebase.js";

let currentChat = null;
let currentPartner = null;
let typingTimeout;
let longPressTimer = null;
let selectedMsgId = null;

// ---------------------------------------------------------
// GET OR CREATE CHAT (Instagram behavior)
// ---------------------------------------------------------
window.getOrCreateChat = async function (uid1, uid2) {
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid1)
  );

  const snap = await getDocs(q);

  for (let d of snap.docs) {
    const data = d.data();
    if (data.members.includes(uid2)) {
      return d.id; // existing chat
    }
  }

  // create new chat
  const ref = await addDoc(collection(db, "chats"), {
    members: [uid1, uid2],
    createdAt: Date.now(),
    lastMessage: ""
  });

  return ref.id;
};


// ---------------------------------------------------------
// PAGE RENDER
// ---------------------------------------------------------
export function render() {
  return `
    <div class="messages-container">

      <h2 style="text-align:center; margin-top:10px;">Messages</h2>

      <div id="dmList"></div>

      <div id="chatBox" style="display:none">

        <div class="chat-header">
          <img id="chatHeaderImg">
          <div>
            <p id="chatHeaderName"></p>
            <span id="onlineDot"></span>
          </div>
        </div>

        <div id="typingIndicator" class="typing-dots" style="display:none;">
          <span></span><span></span><span></span>
        </div>

        <div id="messages"></div>
        
        <div class="back-btn" onclick="closeChat()">←</div>
        <div class="chat-input">
          <input id="dmInput" placeholder="Message...">
          <button onclick="sendMessage()">➤</button>
          <button onclick="openImagePicker()">📷</button>
          <button onclick="startRecording()">🎤</button>

          <input type="file" id="imgPicker"
            accept="image/*"
            capture="camera"
            onchange="sendImage(event)"
            hidden>
        </div>

      </div>

      <div id="reactionMenu" class="reaction-menu" style="display:none;">
        <span onclick="sendReaction('❤️')">❤️</span>
        <span onclick="sendReaction('😂')">😂</span>
        <span onclick="sendReaction('👍')">👍</span>
        <span onclick="sendReaction('😮')">😮</span>
        <span onclick="sendReaction('😢')">😢</span>
        <span onclick="sendReaction('😡')">😡</span>
      </div>

    </div>
  `;
}

// ---------------------------------------------------------
// LOAD DM LIST
// ---------------------------------------------------------
export async function init(chatPayload = null) {
  if (chatPayload?.chatId && chatPayload?.partnerId) {
    document.getElementById("dmList").style.display = "none";
    document.getElementById("chatBox").style.display = "block";
    openChat(chatPayload.chatId, chatPayload.partnerId);
  } else {
    loadDMList();
  }
}

// must be global for onclicks
window.openChat = openChat;
window.sendMessage = sendMessage;
window.openImagePicker = openImagePicker;
window.sendImage = sendImage;
window.startRecording = startRecording;
window.sendReaction = sendReaction;
window.showReactionMenu = showReactionMenu;
window.hideReactionMenu = hideReactionMenu;
window.swipeToReply = swipeToReply;

// ---------------------------------------------------------
async function loadDMList() {
  const uid = auth.currentUser.uid;
  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  const snap = await getDocs(q);

  let html = "";

  for (let chatDoc of snap.docs) {
    const chat = chatDoc.data();
    const otherId = chat.members.find(u => u !== uid);

    const userSnap = await getDoc(doc(db, "users", otherId));
    const u = userSnap.data();

    html += `
      <div class="dm-item glass" onclick="openChat('${chatDoc.id}', '${otherId}')">
        <img class="dm-avatar" src="${u.avatar}">
        <div>
          <p class="dm-user">${u.name} (@${u.username})</p>
          <p class="dm-last">${chat.lastMessage || ""}</p>
        </div>
      </div>
    `;
  }

  document.getElementById("dmList").innerHTML = html;
}

// ---------------------------------------------------------
async function openChat(chatId, partnerId) {
  currentChat = chatId;
  currentPartner = partnerId;

  document.getElementById("dmList").style.display = "none";
  document.getElementById("chatBox").style.display = "block";

  const snap = await getDoc(doc(db, "users", partnerId));
  const u = snap.data();

  document.getElementById("chatHeaderName").innerText =
    `${u.name} (@${u.username})`;
  document.getElementById("chatHeaderImg").src = u.avatar;
  document.getElementById("onlineDot").style.background =
    u.online ? "#0f0" : "#777";

  await setDoc(doc(db, "chats", chatId), {
    seenBy: auth.currentUser.uid,
    lastSeenTime: Date.now()
  }, { merge: true });

  loadMessages(chatId);
}

// ---------------------------------------------------------
function loadMessages(chatId) {
  const msgsRef = collection(db, "chats", chatId, "messages");

  onSnapshot(msgsRef, async (snap) => {
    let html = "";
    const uid = auth.currentUser.uid;
    const messages = snap.docs;

    for (let m of messages) {
      let data = m.data();
      const mine = data.from === uid;

      let start = `
        <div class="msg ${mine ? "me" : "them"}"
          onmousedown="longPressTimer=setTimeout(()=>showReactionMenu(event,'${m.id}'),500)"
          onmouseup="clearTimeout(longPressTimer)"
          ontouchstart="
            longPressTimer=setTimeout(()=>showReactionMenu(event,'${m.id}'),500);
            startSwipe(event);
          "
          ontouchend="
            clearTimeout(longPressTimer);
            endSwipe(event,'${data.text || ""}');
          "
        >
      `;

      if (data.type === "image") {
        html += `${start}<img class="chat-img" src="${data.imageURL}"></div>`;
        continue;
      }

      if (data.type === "audio") {
        html += `${start}<audio controls src="${data.audioURL}" class="chat-audio"></audio></div>`;
        continue;
      }

      let bubble = `${start}${data.text}`;

      // add reaction bubble (Instagram style)
      if (data.reaction) {
        bubble += `<div class="reaction-bubble">${data.reaction}</div>`;
      }

      bubble += `</div>`; // close msg div
      html += bubble;
    }

    document.getElementById("messages").innerHTML = html;
    document.getElementById("messages").scrollTop =
      document.getElementById("messages").scrollHeight;

    const chatSnap = await getDoc(doc(db, "chats", currentChat));
    const chat = chatSnap.data();

    if (chat && chat.seenBy === currentPartner) {
      const t = new Date(chat.lastSeenTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

      document.getElementById("messages").innerHTML +=
        `<p class="read-receipt">Read ${t}</p>`;
    }
  });

  // typing indicator
  onSnapshot(doc(db, "chats", chatId), (s) => {
    let d = s.data();
    document.getElementById("typingIndicator").style.display =
      d.typing && d.typing !== auth.currentUser.uid ? "flex" : "none";
  });
}

// ---------------------------------------------------------
async function sendMessage() {
  const input = document.getElementById("dmInput");
  const text = input.value.trim();
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

document.getElementById("dmInput")?.addEventListener("input", () => {
  setDoc(doc(db, "chats", currentChat), { typing: auth.currentUser.uid }, { merge: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    setDoc(doc(db, "chats", currentChat), { typing: "" }, { merge: true });
  }, 1200);
});

// ---------------------------------------------------------
function openImagePicker() {
  document.getElementById("imgPicker").click();
}

async function sendImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  await addDoc(collection(db, "chats", currentChat, "messages"), {
    type: "image",
    imageURL: url,
    from: auth.currentUser.uid,
    time: Date.now()
  });
}

// ---------------------------------------------------------
let recorder;
let chunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);

  chunks = [];
  recorder.start();

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);

    await addDoc(collection(db, "chats", currentChat, "messages"), {
      type: "audio",
      audioURL: url,
      from: auth.currentUser.uid,
      time: Date.now()
    });
  };

  setTimeout(() => recorder.stop(), 4000);
}

// ---------------------------------------------------------
function showReactionMenu(e, id) {
  selectedMsgId = id;

  const menu = document.getElementById("reactionMenu");

  // anchor to the message bubble
  const bubble = e.currentTarget;
  const rect = bubble.getBoundingClientRect();

  menu.style.left = rect.left + rect.width / 2 + "px";
  menu.style.top = rect.top - 50 + "px";

  menu.style.transform = "translateX(-50%)";
  menu.style.display = "flex";
}


function hideReactionMenu() {
  document.getElementById("reactionMenu").style.display = "none";
}

async function sendReaction(emoji) {
  if (!selectedMsgId) return;

  await setDoc(
    doc(db, "chats", currentChat, "messages", selectedMsgId),
    { reaction: emoji },
    { merge: true }
  );

  hideReactionMenu();
}

// ---------------------------------------------------------
function swipeToReply(text) {
  const input = document.getElementById("dmInput");
  input.value = `↩️ ${text}\n`;
  input.focus();
}

async function getOrCreateChat(uid1, uid2) {
  const chatId = [uid1, uid2].sort().join("_");
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      members: [uid1, uid2],
      lastMessage: "",
      createdAt: Date.now()
    });
  }

  return chatId;
}

let startX = 0;

window.startSwipe = e => {
  startX = e.touches[0].clientX;
};

window.endSwipe = (e, text) => {
  const endX = e.changedTouches[0].clientX;
  if (startX - endX > 40) {
    document.getElementById("dmInput").value = `Replying to: ${text}`;
  }
};

window.sendReactionQuick = async function (msgId) {
  await setDoc(
    doc(db, "chats", currentChat, "messages", msgId),
    { reaction: "❤️" },
    { merge: true }
  );
};


window.getOrCreateChat = getOrCreateChat;
