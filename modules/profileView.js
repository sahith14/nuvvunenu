// =======================================================
// profileView.js — Instagram Style Tabs + Vision Header
// =======================================================

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

import { renderStories } from "./storyViewer.js";
import { renderTimeline } from "./timeline.js";
import { renderBadges } from "./badges.js";
import { renderSharedPosts } from "./sharedPosts.js";


// MAIN PAGE RENDER
// -------------------------------------------------------
export function render(uid) {

  // CHECK UID FIRST — prevents Firebase crash
  if (!uid) {
    console.error("❌ profileView ERROR — UID missing");
    return `<p style="color:red;text-align:center;">Profile not found</p>`;
  }

  // Save UID for tab switching
  window.lastPVUID = uid;

  // Load profile after HTML is rendered
  setTimeout(() => loadProfile(uid), 25);

  // RETURN PAGE LAYOUT
  return `
    <div class="vision-profile-main">

      <div id="pvHeader" class="vision-header glass-card"></div>

      <div id="pvTabs" class="pv-tabs-instagram"></div>

      <div id="pvContent" class="vision-content-area">Loading…</div>

      <div id="postModal" class="vision-post-modal hidden">
        <span class="modal-close" onclick="closePostModal()">×</span>
        <img id="modalImage">
      </div>

    </div>
  `;
}



// LOAD PROFILE DATA
// -------------------------------------------------------
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();
  const me = auth.currentUser.uid;

  const followsYou = u.following?.includes(me);
  const isFollowing = u.followers?.includes(me);

  // Render profile header
  document.getElementById("pvHeader").innerHTML = `
    <div class="profile-header-box">
      <img src="${u.avatar}" class="pv-avatar">

      <div class="pv-info">
        <h2>${u.name}</h2>
          <p class="pv-username">@${u.username}</p>

        <div class="pv-stats">
          <span><b>${u.postsCount || 0}</b> Posts</span>
          <span><b>${u.followers?.length || 0}</b> Followers</span>
          <span><b>${u.following?.length || 0}</b> Following</span>
        </div>
        
        ${
          followsYou && isFollowing 
            ? `<p class="pv-follow-status both">You follow each other</p>`
            : followsYou
              ? `<p class="pv-follow-status">Follows you</p>`
              : ""
        }

        <div class="pv-btn-row">
          <button class="pv-btn message" onclick="openDM('${uid}')">Message</button>
          <button class="pv-btn follow" id="followBtnPV" onclick="toggleFollow('${uid}')">
            ${isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>
    </div>
  `;

  // Render Instagram-style tabs
  renderTabs();

  // Default tab
  loadPosts(uid);
}



// RENDER INSTAGRAM STYLE TABS
// -------------------------------------------------------
function renderTabs() {
  document.getElementById("pvTabs").innerHTML = `
    <div class="tl-nav">

      <div class="tl-tab active" onclick="switchPVTab('posts')">Posts</div>
      <div class="tl-tab" onclick="switchPVTab('music')">Music</div>
      <div class="tl-tab" onclick="switchPVTab('quotes')">Quotes</div>

      <div id="tl-main-underline"></div>
    </div>
  `;
}

// SWITCH TABS (Instagram style)
window.switchPVTab = function (tab) {
  const uid = window.lastPVUID;

  const order = ["posts", "timeline", "stories", "shared", "badges"];
  const index = order.indexOf(tab);

  // Move underline smoothly
  document.getElementById("tl-main-underline").style.left = (index * 20) + "%";

  // Update active tab
  document.querySelectorAll(".tl-tab").forEach(t => t.classList.remove("active"));
  document
    .querySelector(`[onclick="switchPVTab('${tab}')"]`)
    .classList.add("active");

  // Load sections
  if (tab === "stories") renderStories(uid);
  if (tab === "timeline") renderTimeline(uid);
  if (tab === "posts") loadPosts(uid);
  if (tab === "shared") renderSharedPosts(uid);
  if (tab === "badges") renderBadges(uid);
};

// LOAD POSTS GRID
// -------------------------------------------------------
async function loadPosts(uid) {
  window.lastPVUID = uid;

  const postsRef = collection(db, "users", uid, "posts");
  const snap = await getDocs(postsRef);

  if (snap.empty) {
    document.getElementById("pvContent").innerHTML =
      `<p class="no-posts">No posts yet.</p>`;
    return;
  }

  let html = `<div class="pv-post-grid">`;

  snap.forEach(doc => {
    const p = doc.data();
    html += `
      <div class="pv-post-item" onclick="openPostModal('${p.img}')">
        <img src="${p.img}">
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById("pvContent").innerHTML = html;
}



// FOLLOW SYSTEM
// -------------------------------------------------------
window.toggleFollow = async function (uid) {
  const me = auth.currentUser.uid;

  const meRef = doc(db, "users", me);
  const targetRef = doc(db, "users", uid);

  const snap = await getDoc(meRef);
  const meData = snap.data();

  const isFollowing = meData.following?.includes(uid);
  const btn = document.getElementById("followBtnPV");

  if (isFollowing) {
    btn.textContent = "Follow";
    await updateDoc(meRef, { following: arrayRemove(uid) });
    await updateDoc(targetRef, { followers: arrayRemove(me) });
  } else {
    btn.textContent = "Following";
    await updateDoc(meRef, { following: arrayUnion(uid) });
    await updateDoc(targetRef, { followers: arrayUnion(me) });
  }
};



// OPEN DM
window.openDM = function (uid) {
  loadPage("messages", uid);
};



// POST MODAL
window.openPostModal = function (img) {
  const modal = document.getElementById("postModal");
  const image = document.getElementById("modalImage");

  image.src = img;
  modal.classList.remove("hidden");
};

window.closePostModal = function () {
  document.getElementById("postModal").classList.add("hidden");
};
