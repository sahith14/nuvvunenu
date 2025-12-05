// ====================================================
// badges.js — VisionOS Achievements / Badges
// ====================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";


// MAIN RENDER
export function renderBadges(uid) {
  document.getElementById("pvContent").innerHTML = `
    <div class="badges-view glass-card">
      <h2 class="section-title">Badges</h2>
      <div id="badgesGrid" class="badges-grid"></div>
    </div>
  `;

  loadBadges(uid);
}


// LOAD BADGES
async function loadBadges(uid) {
  const ref = collection(db, "users", uid, "badges");
  const snap = await getDocs(ref);

  if (snap.empty) {
    document.getElementById("badgesGrid").innerHTML =
      `<p style="text-align:center;opacity:0.6;">No badges earned yet.</p>`;
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const b = doc.data();
    html += `
      <div class="badge-item">
        <img src="${b.icon}" class="badge-icon">
        <p>${b.name}</p>
      </div>
    `;
  });

  document.getElementById("badgesGrid").innerHTML = html;
}
