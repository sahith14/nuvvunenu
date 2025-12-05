// ===============================================
// profileView.js — VisionOS Premium Profile Page
// ===============================================

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

// MAIN RENDER
// ----------------------------------------------------
export function render(uid) {
  setTimeout(() => loadProfile(uid), 20);

  return `
    <div class="profileView vision-profile-page">
      <div id="pvContent" class="fade-slow">Loading profile…</div>

      <!-- POST VIEWER MODAL -->
      <div id="postModal" class="vision-post-modal hidden">
        <span class="modal-close" onclick="closePostModal()">×</span>
        <img id="modalImage">
      </div>
    </div>
  `;
}

// LOAD PROFILE DATA
// ----------------------------------------------------
async function loadProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    document.getElementById("pvContent").innerHTML = "<p>User not found.</p>";
    return;
  }

  const u = snap.data();
  const me = auth.currentUser.uid;

  const isFollowing = u.followers?.includes(me);
  const followsYou = u.following?.includes(me);

  const mutuals = (u.followers || []).filter(f => f !== me);

  // BUILD PROFILE HTML (VisionOS Style)
  document.getElementById("pvContent").innerHTML = `
    <div class="vision-profile-card glass-card">

      <!-- Avatar Section -->
      <div class="vision-avatar-box">
        <div class="vision-avatar-ring"></div>
        <img src="${u.avatar}" class="vision-avatar">
      </div>

      <!-- Name, Username -->
      <h2 class="vision-name">${u.name}</h2>
      <p class="vision-username">@${u.username}</p>

      ${
        followsYou && isFollowing 
          ? `<p class="follow-status both">You follow each other</p>`
          : followsYou 
            ? `<p class="follow-status">Follows you</p>` 
            : ``
      }

      <!-- Stats Row -->
      <div class="vision-stats-row">
        <div><strong>${u.followers?.length || 0}</strong><span>Followers</span></div>
        <div><strong>${u.following?.length || 0}</strong><span>Following</span></div>
        <div><strong id="postCount">0</strong><span>Posts</span></div>
      </div>

      <!-- Buttons -->
      <div class="vision-btn-row">
        <button id="followBtnPV" class="vision-btn follow" onclick="toggleFollow('${uid}')">
          ${isFollowing ? "Following" : "Follow"}
        </button>
        <button class="vision-btn message" onclick="openDM('${uid}')">
          Message
        </button>
      </div>

      <!-- Mutual Followers -->
      ${
        mutuals.length > 0
          ? `<p class="mutuals">Mutuals: ${mutuals.length}</p>`
          : ""
      }

      <!-- Bio -->
      ${
        u.bio
          ? `<p class="vision-bio">${u.bio}</p>`
          : `<p class="vision-bio" style="opacity:0.5;">No bio added</p>`
      }

      <!-- Link -->
      ${
        u.link
          ? `<a href="${u.link}" target="_blank" class="vision-link">${u.link}</a>`
          : ""
      }
    </div>

    <!-- Posts Grid -->
    <div id="pvPosts" class="vision-post-grid"></div>
  `;

  loadUserPosts(uid);
}

// LOAD USER POSTS
// ----------------------------------------------------
async function loadUserPosts(uid) {
  const postsRef = collection(db, "users", uid, "posts");
  const snap = await getDocs(postsRef);

  const grid = document.getElementById("pvPosts");
  const count = snap.size;
  document.getElementById("postCount").textContent = count;

  if (count === 0) {
    grid.innerHTML = `<p style="opacity:0.6; text-align:center;">No posts yet.</p>`;
    return;
  }

  let html = "";

  snap.forEach((pDoc) => {
    const p = pDoc.data();
    html += `
      <div class="vision-post" onclick="openPostModal('${p.img}')">
        <img src="${p.img}" class="vision-post-thumb">
      </div>
    `;
  });

  grid.innerHTML = html;
}

// OPEN DM
// ----------------------------------------------------
window.openDM = function (uid) {
  loadPage("messages", uid);
};

// FOLLOW SYSTEM LINKED WITH search.js
// ----------------------------------------------------
window.toggleFollow = async function (targetUID) {
  const myUID = auth.currentUser.uid;

  const meRef = doc(db, "users", myUID);
  const targetRef = doc(db, "users", targetUID);

  const meSnap = await getDoc(meRef);
  const me = meSnap.data();

  const isFollowing = me.following?.includes(targetUID);

  const btn = document.getElementById("followBtnPV");

  if (isFollowing) {
    btn.textContent = "Follow";
    await updateDoc(meRef, { following: arrayRemove(targetUID) });
    await updateDoc(targetRef, { followers: arrayRemove(myUID) });
  } else {
    btn.textContent = "Following";
    await updateDoc(meRef, { following: arrayUnion(targetUID) });
    await updateDoc(targetRef, { followers: arrayUnion(myUID) });
  }
};

// POST MODAL VIEWER
// ----------------------------------------------------
window.openPostModal = function (img) {
  const modal = document.getElementById("postModal");
  const image = document.getElementById("modalImage");

  image.src = img;
  modal.classList.remove("hidden");
};

window.closePostModal = function () {
  document.getElementById("postModal").classList.add("hidden");
};
