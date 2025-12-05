// ====================================================
// sharedPosts.js — VisionOS Shared Posts (Mutual only)
// ====================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";


// MAIN RENDER
export function renderSharedPosts(uid) {
  document.getElementById("pvContent").innerHTML = `
    <div class="shared-view">
      <h2 class="section-title">Shared Posts</h2>
      <div id="sharedGrid" class="pv-post-grid"></div>
    </div>
  `;

  loadShared(uid);
}


// LOAD SHARED POSTS
async function loadShared(uid) {
  const ref = collection(db, "users", uid, "sharedPosts");
  const snap = await getDocs(ref);

  if (snap.empty) {
    document.getElementById("sharedGrid").innerHTML =
      `<p style="text-align:center;opacity:0.6;">No shared posts yet.</p>`;
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const p = doc.data();

    html += `
      <div class="pv-post-item" onclick="openPostModal('${p.img}')">
        <img src="${p.img}">
      </div>
    `;
  });

  document.getElementById("sharedGrid").innerHTML = html;
}
