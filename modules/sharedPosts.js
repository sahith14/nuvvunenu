// ==========================================================
// sharedPosts.js — VisionOS Mutual Shared Posts
// ==========================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";

export function renderSharedPosts(uid) {
  document.getElementById("pvContent").innerHTML = `
    <h2 class="section-title">Shared Posts</h2>
    <div id="sharedGrid" class="pv-post-grid"></div>
  `;

  loadShared(uid);
}

async function loadShared(uid) {
  const ref = collection(db, "users", uid, "sharedPosts");
  const snap = await getDocs(ref);

  if (snap.empty) {
    document.getElementById("sharedGrid").innerHTML =
      `<p style="opacity:0.6;text-align:center;">Nothing shared yet.</p>`;
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const s = doc.data();
    html += `
      <div class="pv-post-item">
        <img src="${s.img}" onclick="openPostModal('${s.img}')">
        <p class="shared-tag">Shared with you</p>
      </div>
    `;
  });

  document.getElementById("sharedGrid").innerHTML = html;
}
