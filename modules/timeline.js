// ====================================================
// timeline.js — VisionOS Activity Timeline
// ====================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";


// MAIN RENDER
export function renderTimeline(uid) {
  document.getElementById("pvContent").innerHTML = `
    <div class="timeline-view">
      <h2 class="section-title">Timeline</h2>
      <div id="timelineList"></div>
    </div>
  `;

  loadTimeline(uid);
}


// LOAD TIMELINE EVENTS
async function loadTimeline(uid) {
  const ref = collection(db, "users", uid, "timeline");
  const snap = await getDocs(ref);

  let html = "";

  if (snap.empty) {
    document.getElementById("timelineList").innerHTML =
      `<p style="text-align:center;opacity:0.6;">No activity yet.</p>`;
    return;
  }

  snap.forEach(doc => {
    const t = doc.data();

    html += `
      <div class="timeline-card glass-card">
        <h3>${t.title}</h3>
        <p>${t.description}</p>
        <span class="time">${new Date(t.time).toLocaleString()}</span>
      </div>
    `;
  });

  document.getElementById("timelineList").innerHTML = html;
}
