// ==========================================================
// storyViewer.js — VisionOS Floating Glass Story Viewer
// ==========================================================

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../firebase.js";

// GLOBAL STATE
let currentIndex = 0;
let stories = [];
let timer = null;
let isPaused = false;


// MAIN ENTRY — Called from profileView.js
export function renderStories(uid) {
  loadStories(uid);

  document.getElementById("pvContent").innerHTML = `
    <div class="vision-stories-section">
      <h2 class="section-title">Stories</h2>
      <div id="storyStrip" class="story-strip"></div>
    </div>
  `;
}


// LOAD STORY THUMBNAILS
async function loadStories(uid) {
  const ref = collection(db, "users", uid, "stories");
  const snap = await getDocs(ref);

  if (snap.empty) {
    document.getElementById("storyStrip").innerHTML =
      `<p style="opacity:0.6;text-align:center;">No stories yet.</p>`;
    return;
  }

  stories = [];
  let html = "";

  snap.forEach(doc => {
    const s = doc.data();
    stories.push(s.image);

    html += `
      <div class="story-item" onclick="openVisionStory(${stories.length - 1})">
        <img src="${s.image}">
      </div>
    `;
  });

  document.getElementById("storyStrip").innerHTML = html;
}


// ==========================================================
// OPEN STORY VIEWER
// ==========================================================
window.openVisionStory = function (index) {
  currentIndex = index;

  // Inject modal HTML
  document.body.insertAdjacentHTML("beforeend", `
    <div id="visionStoryModal" class="vision-story-modal">
      
      <!-- Glass Story Panel -->
      <div class="vision-story-glass" id="storyGlass">

        <div class="story-progress-bar">
          <div id="storyProgressFill"></div>
        </div>

        <img id="storyMainImage">

      </div>

    </div>
  `);

  loadStory();
  startProgress();
  attachGestures();
};


// LOAD CURRENT STORY IMAGE
function loadStory() {
  const img = document.getElementById("storyMainImage");
  img.src = stories[currentIndex];

  resetProgress();
}


// ==========================================================
// PROGRESS SYSTEM
// ==========================================================
function startProgress() {
  const fill = document.getElementById("storyProgressFill");
  fill.style.transition = "none";
  fill.style.width = "0%";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.transition = "width 4s linear";
      fill.style.width = "100%";
    });
  });

  timer = setTimeout(() => nextStory(), 4000);
}


function resetProgress() {
  clearTimeout(timer);
  const fill = document.getElementById("storyProgressFill");
  fill.style.transition = "none";
  fill.style.width = "0%";
}


// ==========================================================
// GESTURES (TAP, HOLD, SWIPE)
// ==========================================================
function attachGestures() {
  const glass = document.getElementById("storyGlass");

  glass.addEventListener("click", (e) => {
    const x = e.clientX;
    const half = window.innerWidth / 2;

    if (x < half) prevStory();
    else nextStory();
  });

  // Hold to pause
  glass.addEventListener("mousedown", () => pauseStory());
  glass.addEventListener("mouseup", () => resumeStory());

  // Mobile hold
  glass.addEventListener("touchstart", () => pauseStory());
  glass.addEventListener("touchend", () => resumeStory());

  // Swipe down to close
  let startY = 0;

  glass.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
  });

  glass.addEventListener("touchmove", (e) => {
    const diff = e.touches[0].clientY - startY;
    if (diff > 80) closeStoryViewer();
  });
}



// ==========================================================
// PAUSE / RESUME
// ==========================================================
function pauseStory() {
  isPaused = true;
  clearTimeout(timer);

  const fill = document.getElementById("storyProgressFill");
  const computed = window.getComputedStyle(fill).width;
  const total = window.innerWidth;

  const percent = (parseFloat(computed) / total) * 100;
  fill.style.transition = "none";
  fill.style.width = percent + "%";
}


function resumeStory() {
  if (!isPaused) return;
  isPaused = false;
  startProgress();
}



// ==========================================================
// NAVIGATION
// ==========================================================
function nextStory() {
  if (currentIndex < stories.length - 1) {
    currentIndex++;
    loadStory();
    startProgress();
  } else {
    closeStoryViewer();
  }
}

function prevStory() {
  if (currentIndex > 0) {
    currentIndex--;
    loadStory();
    startProgress();
  }
}


// ==========================================================
// CLOSE VIEWER
// ==========================================================
window.closeStoryViewer = function () {
  const modal = document.getElementById("visionStoryModal");
  if (!modal) return;

  modal.classList.add("fade-out");

  setTimeout(() => modal.remove(), 200);
};
