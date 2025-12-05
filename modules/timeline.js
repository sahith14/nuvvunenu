// ==========================================================
// timeline.js — VisionOS Advanced Activity Timeline
// ==========================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";


// MAIN RENDER
export function renderTimeline(uid) {
  document.getElementById("pvContent").innerHTML = `
    <div class="timeline-container">

      <div class="timeline-filters glass-bar">
        <button onclick="setTimelineFilter('all')" class="tl-btn active">All</button>
        <button onclick="setTimelineFilter('post')" class="tl-btn">Posts</button>
        <button onclick="setTimelineFilter('follow')" class="tl-btn">Follows</button>
        <button onclick="setTimelineFilter('badge')" class="tl-btn">Badges</button>
        <button onclick="setTimelineFilter('share')" class="tl-btn">Shared</button>
      </div>

      <div id="timelineList" class="timeline-list"></div>
    </div>
  `;

  loadTimeline(uid);
}



// GLOBAL FILTER STATE
let timelineData = [];
let currentFilter = "all";

window.setTimelineFilter = function (type) {
  currentFilter = type;

  document.querySelectorAll(".tl-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[onclick="setTimelineFilter('${type}')"]`).classList.add("active");

  renderTimelineItems();
};


// LOAD TIMELINE DATA
async function loadTimeline(uid) {
  const ref = collection(db, "users", uid, "timeline");
  const snap = await getDocs(ref);

  timelineData = [];

  snap.forEach(doc => {
    const t = doc.data();
    timelineData.push({
      ...t,
      id: doc.id
    });
  });

  // Sort newest first
  timelineData.sort((a, b) => b.time - a.time);

  renderTimelineItems();
}



// RENDER WITH FILTER + GROUP BY YEAR
function renderTimelineItems() {
  const list = document.getElementById("timelineList");

  if (timelineData.length === 0) {
    list.innerHTML = `<p style="opacity:0.6;text-align:center;">No activity yet.</p>`;
    return;
  }

  let html = "";
  let lastYear = null;

  timelineData.forEach(item => {
    if (currentFilter !== "all" && item.type !== currentFilter) return;

    const date = new Date(item.time);
    const year = date.getFullYear();

    if (year !== lastYear) {
      html += `<h3 class="timeline-year">${year}</h3>`;
      lastYear = year;
    }

    html += `
      <div class="timeline-card glass-card fadeIn">
        <div class="tl-icon">${getIcon(item.type)}</div>

        <div class="tl-info">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
          <span class="tl-date">${date.toLocaleString()}</span>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

function getIcon(type) {
  switch (type) {
    case "post": return `<i class="fa-solid fa-image"></i>`;
    case "follow": return `<i class="fa-solid fa-user-plus"></i>`;
    case "badge": return `<i class="fa-solid fa-trophy"></i>`;
    case "share": return `<i class="fa-solid fa-share-nodes"></i>`;
    default: return `<i class="fa-regular fa-circle-dot"></i>`;
  }
}
