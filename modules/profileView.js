// ===============================
// profileView.js — View Other Users' Profiles
// ===============================

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

// MAIN RENDER FUNCTION
// -------------------------------
export function render(uid) {
  if (!uid) {
    return `<p style="padding:20px;">Error: No user selected.</p>`;
  }

  // Load profile data AFTER render
  setTimeout(() => loadProfile(uid), 50);

  return `
    <div class="profile-page">
      <div id="pvContent">Loading profile...</div>
    </div>
  `;
}

// LOAD USER PROFILE
// -------------------------------
async function loadProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    document.getElementById("pvContent").innerHTML =
      "<p>User not found.</p>";
    return;
  }

  const u = snap.data();

  // FOLLOW BUTTON TEXT
  const myUID = auth.currentUser.uid;
  const isFollowing = u.followers?.includes(myUID);

  // RENDER PROFILE INFO
  document.getElementById("pvContent").innerHTML = `
    <div class="pv-top">
      <img class="pv-avatar" src="${u.avatar || 'https://i.pravatar.cc/200'}">

      <div>
        <h2>${u.name || "Unnamed"}</h2>
        <p>@${u.username}</p>

        <div class="pv-buttons">
          <button onclick="openDM('${uid}')">Message</button>

          <button id="followBtnPV" onclick="toggleFollow('${uid}')">
            ${isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>
    </div>

    <div class="pv-stats">
      <p><strong>${u.followers?.length || 0}</strong> Followers</p>
      <p><strong>${u.following?.length || 0}</strong> Following</p>
    </div>

    <h3 style="margin-top:20px;">Posts</h3>
    <div class="pv-post-grid" id="pvPosts"></div>
  `;

  loadUserPosts(uid);
}

// LOAD USER POSTS (GRID)
// -------------------------------
async function loadUserPosts(uid) {
  const postsRef = collection(db, "users", uid, "posts");
  const snap = await getDocs(postsRef);

  if (snap.empty) {
    document.getElementById("pvPosts").innerHTML =
      "<p style='opacity:0.6;'>No posts yet.</p>";
    return;
  }

  let html = "";
  snap.forEach((doc) => {
    const p = doc.data();
    html += `
      <div class="pv-post">
        <img src="${p.img}" onclick="openPost('${doc.id}', '${uid}')">
      </div>
    `;
  });

  document.getElementById("pvPosts").innerHTML = html;
}

// OPEN DM WITH THIS USER
// -------------------------------
window.openDM = function (uid) {
  loadPage("messages", uid);
};

// FOLLOW / UNFOLLOW BUTTON UPDATE
// -------------------------------
window.updateFollowButtonPV = function (isFollowing) {
  const btn = document.getElementById("followBtnPV");
  if (!btn) return;

  btn.textContent = isFollowing ? "Following" : "Follow";
};

// OPTIONAL: OPEN SINGLE POST VIEW
window.openPost = function (postId, uid) {
  alert(`Post view coming soon!\nPost: ${postId}\nUser: ${uid}`);
};
