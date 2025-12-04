// ===============================
//   NUVVU NENU – PROFILE MODULE
// ===============================

import { db, auth } from "../firebase.js";
import {
  doc, getDoc, updateDoc, collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// MAIN ENTRY POINT
export function render() {
  // Load logged-in user's profile
  loadProfile(auth.currentUser.uid);

  return `
    <div id="profilePage" class="profile-container"></div>
  `;
}


// -----------------------------------------------------------
// LOAD PROFILE DATA
// -----------------------------------------------------------
export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    document.getElementById("profilePage").innerHTML = `
      <p style="text-align:center;">User not found</p>
    `;
    return;
  }

  const u = snap.data();

  // Load posts
  const posts = await loadUserPosts(uid);

  document.getElementById("profilePage").innerHTML = `
    <div class="profile-header glass">
      <img src="${u.avatar || "https://i.pravatar.cc/150?u="+uid}" class="profile-avatar">
      <h2>${u.username}</h2>
      <p class="profile-name">${u.name || ""}</p>

      <div class="stats-row">
        <div onclick="openFollowers('${uid}')">${(u.followers?.length || 0)}<br>Followers</div>
        <div onclick="openFollowing('${uid}')">${(u.following?.length || 0)}<br>Following</div>
        <div>${posts.length}<br>Posts</div>
      </div>

      <button class="edit-btn" onclick="openSettings()">Settings</button>
    </div>

    <div class="posts-grid">
      ${posts.map(p => `
        <img src="${p.img}" class="post-grid-img">
      `).join("")}
    </div>

    <!-- SETTINGS SHEET -->
    <div id="settingsSheet" class="settings-sheet hidden">
      <h3>Settings ⚙️</h3>

      <h4>Theme</h4>
      <button onclick="applyTheme('light')">Light</button>
      <button onclick="applyTheme('dark')">Dark</button>
      <button onclick="applyTheme('love')">Love Pink</button>
      <button onclick="applyTheme('rose')">Rose Red</button>
      <button onclick="applyTheme('animated')">Animated Roses</button>

      <h4>Account</h4>
      <button onclick="logoutUser()" class="logout-btn">Logout</button>

      <button class="close-settings" onclick="closeSettings()">Close</button>
    </div>
  `;
}


// -----------------------------------------------------------
// LOAD USER POSTS
// -----------------------------------------------------------
async function loadUserPosts(uid) {
  const q = query(collection(db, "posts"), where("owner", "==", uid));
  const snap = await getDocs(q);

  const posts = [];
  snap.forEach(doc => posts.push(doc.data()));

  return posts;
}


// -----------------------------------------------------------
// FOLLOWERS / FOLLOWING POPUP
// -----------------------------------------------------------
window.openFollowers = async function(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const u = snap.data();

  alert("Followers:\n" + (u.followers || []).join("\n"));
};

window.openFollowing = async function(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const u = snap.data();

  alert("Following:\n" + (u.following || []).join("\n"));
};


// -----------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------
window.openSettings = function() {
  document.getElementById("settingsSheet").classList.remove("hidden");
};

window.closeSettings = function() {
  document.getElementById("settingsSheet").classList.add("hidden");
};


// -----------------------------------------------------------
// THEMES
// -----------------------------------------------------------
window.applyTheme = function(name) {
  const body = document.body;

  body.classList.remove(
    "theme-light",
    "theme-dark",
    "theme-love",
    "theme-rose",
    "theme-animated"
  );

  body.classList.add("theme-" + name);
};


// -----------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------
window.logoutUser = function() {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};


// -----------------------------------------------------------
// PUBLIC PROFILE (FROM SEARCH PAGE)
// -----------------------------------------------------------
export function renderExternalProfile(u, uid) {
  return `
    <div class="profile-container">

      <div class="profile-header glass">
        <img src="${u.avatar || "https://i.pravatar.cc/150?u="+uid}" class="profile-avatar">
        <h2>${u.username}</h2>
        <p class="profile-name">${u.name || ""}</p>

        <div class="stats-row">
          <div>${(u.followers?.length || 0)}<br>Followers</div>
          <div>${(u.following?.length || 0)}<br>Following</div>
        </div>

        <button class="edit-btn" onclick="toggleFollow(event, '${uid}')">Follow</button>
        <button class="edit-btn" onclick="openChatFromProfile('${uid}')">Message</button>
      </div>

      <div class="posts-grid">
        <p style="text-align:center;opacity:0.6;margin-top:20px;">Posts loading...</p>
      </div>

    </div>
  `;
}

window.openChatFromProfile = function(uid) {
  alert("DM system will open here ❤️");
};
