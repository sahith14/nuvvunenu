// ====================================================
// storyViewer.js — VisionOS Story Viewer
// ====================================================

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";

// MAIN FUNCTION
export function renderStories(uid) {
  loadUserStories(uid);

  document.getElementById("pvContent").innerHTML = `
    <div class="stories-view glass-card">
      <h2 class="section-title">Stories</h2>
      <div id="storyStrip" class="story-strip"></div>
    </div>
  `;
}


// LOAD USER STORIES
async function loadUserStories(uid) {
  const ref = collection(db, "users", uid, "stories");
  const snap = await getDocs(ref);

  let html = "";

  if (snap.empty) {
    document.getElementById("storyStrip").innerHTML = `
      <p style="opacity:0.6;text-align:center;">No stories yet.</p>
    `;
    return;
  }

  snap.forEach(doc => {
    const s = doc.data();
    html += `
      <div class="story-item" onclick="openFullStory('${s.image}')">
         <img src="${s.image}">
      </div>
    `;
  });

  document.getElementById("storyStrip").innerHTML = html;
}


// FULLSCREEN VIEWER
window.openFullStory = function (img) {
  const modal = document.getElementById("postModal");
  const image = document.getElementById("modalImage");

  image.src = img;
  modal.classList.remove("hidden");
};
