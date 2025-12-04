// space.js — Couple Space Rooms + Join + Activities
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db, auth } from "../firebase.js";

export function render() {
  loadSpaceRoom();

  return `
    <div class="space-container">

      <h2 class="space-title">Couple Space 💞</h2>

      <!-- CREATE BUTTON -->
      <button onclick="createSpace()" class="space-btn">Create Space</button>

      <div id="spaceStatus" class="space-status"></div>

      <!-- ROOM -->
      <div id="spaceRoom" class="space-room hidden"></div>

    </div>
  `;
}


// -----------------------------------------------------------
// LOAD USER'S SPACE ROOM
// -----------------------------------------------------------

async function loadSpaceRoom() {
  let uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  let u = snap.data();

  if (u.spaceRoomID) {
    showSpaceRoom(u.spaceRoomID);
  }
}


// -----------------------------------------------------------
// CREATE SPACE ROOM
// -----------------------------------------------------------

window.createSpace = async function() {
  let uid = auth.currentUser.uid;

  let password = prompt("Set a password for your space room:");
  if (!password) return;

  // create room in firestore
  const roomRef = await addDoc(collection(db, "spaces"), {
    owner: uid,
    password: password,
    members: [uid],
    theme: "default",
    createdAt: Date.now()
  });

  // update user
  await updateDoc(doc(db, "users", uid), {
    spaceRoomID: roomRef.id
  });

  alert("Space created successfully 💞");

  showSpaceRoom(roomRef.id);
};


// -----------------------------------------------------------
// SHOW ROOM UI
// -----------------------------------------------------------

async function showSpaceRoom(roomID) {
  document.getElementById("spaceRoom").classList.remove("hidden");

  const roomRef = doc(db, "spaces", roomID);
  const snap = await getDoc(roomRef);
  const room = snap.data();

  document.getElementById("spaceRoom").innerHTML = `
    <div class="room-header glass">
      <h3>Your Space Room</h3>
      <p>Room ID: ${roomID}</p>
      <p>Password: ${room.password}</p>
    </div>

    <div class="room-activities">

      <!-- JOIN PARTNER -->
      <h4>Partner Join</h4>
      <input id="joinPassword" placeholder="Enter room password">
      <button onclick="joinSpaceRoom('${roomID}')">Join Room</button>

      <!-- ACTIVITIES -->
      <h4>Activities 🎮</h4>
      <div class="activity-grid">
        <button onclick="startGame()">Game</button>
        <button onclick="startScreenShare()">Screen Share</button>
        <button onclick="startMusic()">Sync Music</button>
        <button onclick="openRoomChat('${roomID}')">Room Chat</button>
      </div>

      <!-- ROOM CHAT -->
      <div id="roomChatBox" class="room-chat hidden">
        <div id="roomMessages" class="room-messages"></div>

        <div class="room-input">
          <input id="roomMsgInput" placeholder="Message...">
          <button onclick="sendRoomMessage('${roomID}')">➤</button>
        </div>
      </div>
    </div>
  `;
}


// -----------------------------------------------------------
// JOIN ROOM
// -----------------------------------------------------------

window.joinSpaceRoom = async function(roomID) {
  let uid = auth.currentUser.uid;
  let pass = document.getElementById("joinPassword").value;

  const roomRef = doc(db, "spaces", roomID);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) return alert("Room does not exist.");

  const room = snap.data();

  if (room.password !== pass) {
    alert("Incorrect password ❌");
    return;
  }

  await updateDoc(roomRef, {
    members: [...room.members, uid]
  });

  await updateDoc(doc(db, "users", uid), {
    spaceRoomID: roomID
  });

  alert("Joined space successfully 💞");
  showSpaceRoom(roomID);
};


// -----------------------------------------------------------
// ACTIVITIES
// -----------------------------------------------------------

window.startGame = function() {
  alert("Mini-games coming soon 🎮🔥");
};

window.startScreenShare = function() {
  alert("Mock screen-share mode activated 📺");
};

window.startMusic = function() {
  alert("Sync music player coming soon 🎵");
};


// -----------------------------------------------------------
// ROOM CHAT (REALTIME)
// -----------------------------------------------------------

window.openRoomChat = function(roomID) {
  document.getElementById("roomChatBox").classList.remove("hidden");
  loadRoomMessages(roomID);
};

function loadRoomMessages(roomID) {
  const q = query(
    collection(db, "spaces", roomID, "messages"),
    orderBy("time")
  );

  onSnapshot(q, (snap) => {
    let html = "";
    snap.forEach(docu => {
      let msg = docu.data();
      html += `
        <div class="room-msg ${msg.sender === auth.currentUser.uid ? 'me' : 'them'}">
          ${msg.text}
        </div>
      `;
    });

    document.getElementById("roomMessages").innerHTML = html;
    setTimeout(() => {
      let box = document.getElementById("roomMessages");
      box.scrollTop = box.scrollHeight;
    }, 50);
  });
}

window.sendRoomMessage = async function(roomID) {
  let input = document.getElementById("roomMsgInput");

  if (!input.value.trim()) return;

  await addDoc(collection(db, "spaces", roomID, "messages"), {
    text: input.value.trim(),
    sender: auth.currentUser.uid,
    time: Date.now()
  });

  input.value = "";
};
