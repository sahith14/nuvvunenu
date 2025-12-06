import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "../firebase.js";

// =========================================================
// MAIN RENDER
// =========================================================
export function render() {
  const uid = auth.currentUser.uid;

  setTimeout(() => loadProfile(uid), 10);

  return `
    <div class="profile-page">
      
      <!-- Floating Glass Header -->
      <div id="profileHeader" class="profile-header-glass"></div>

      <!-- Highlights Row -->
      <div id="profileHighlights" class="profile-highlights-row"></div>

      <!-- Tabs -->
      <div class="profile-tabs">
        <div class="p-tab active" onclick="switchProfileTab('posts')">Posts</div>
        <div class="p-tab" onclick="switchProfileTab('music')">Music</div>
        <div class="p-tab" onclick="switchProfileTab('quotes')">Quotes</div>
        <div class="p-tab" onclick="switchProfileTab('saved')">Saved</div>

        <div id="profile-underline"></div>
      </div>

      <!-- Content -->
      <div id="profileContent" class="profile-content">Loading…</div>
    </div>
  `;
}

// =========================================================
// LOAD PROFILE HEADER
// =========================================================
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();

  // Count posts
  const postsSnap = await getDocs(collection(db, "users", uid, "posts"));
  const postCount = postsSnap.size;

  // Stats
  const followers = u.followers?.length || 0;
  const following = u.following?.length || 0;

  let songRow = "";
  if (u.song) {
    songRow = `
      <audio controls class="ph-song">
        <source src="${u.song}">
      </audio>
    `;
  }

  document.getElementById("profileHeader").innerHTML = `
    <div class="ph-wrapper">

      <img src="${u.avatar}" class="ph-avatar" onclick="openAvatarEditor()">

      <div class="ph-info">
        <h2 class="ph-name">${u.name || ""}</h2>
        <p class="ph-username">@${u.username || ""}</p>

        <p class="ph-stats">
          ${postCount} Posts • ${followers} Followers • ${following} Following
        </p>

        <p class="ph-bio">${u.bio || ""}</p>

        ${songRow}

        <button class="ph-edit-btn" onclick="openEditProfileModal()">Edit Profile</button>
      </div>

    </div>
  `;

  loadHighlights(uid);
  loadPosts(uid);
}

// =========================================================
// HIGHLIGHTS LOADER
// =========================================================
async function loadHighlights(uid) {
  const row = document.getElementById("profileHighlights");

  const highlightsSnap = await getDocs(collection(db, "users", uid, "highlights"));

  let html = `
    <div class="highlight add-highlight" onclick="openCreateHighlight()">
      <div class="highlight-glass add">+</div>
      <p>Add</p>
    </div>
  `;

  highlightsSnap.forEach(docSnap => {
    const h = docSnap.data();
    html += `
      <div class="highlight" onclick="openHighlight('${docSnap.id}')">
        <div class="highlight-glass" style="background-image: url('${h.cover}')"></div>
        <p>${h.name}</p>
      </div>
    `;
  });

  row.innerHTML = html;
}

// =========================================================
// TAB SWITCH
// =========================================================
window.switchProfileTab = function (tab) {
  const order = ["posts", "music", "quotes", "saved"];
  const index = order.indexOf(tab);

  document.getElementById("profile-underline").style.left =
    (index * 25) + "%";

  document.querySelectorAll(".p-tab").forEach(t =>
    t.classList.remove("active")
  );
  document
    .querySelector(`[onclick="switchProfileTab('${tab}')"]`)
    .classList.add("active");

  const uid = auth.currentUser.uid;

  if (tab === "posts") loadPosts(uid);
  if (tab === "music") loadMusic(uid);
  if (tab === "quotes") loadQuotes(uid);
  if (tab === "saved") loadSaved(uid);
};

// =========================================================
// POSTS LOADER (ANIMATED GRID)
// =========================================================
async function loadPosts(uid) {
  const snap = await getDocs(collection(db, "users", uid, "posts"));

  if (snap.empty) {
    document.getElementById("profileContent").innerHTML =
      `<p class="nocontent">No posts yet.</p>`;
    return;
  }

  let html = `<div class="profile-post-grid">`;

  snap.forEach(docSnap => {
    const p = docSnap.data();
    html += `
      <div class="post-item"
           onclick="openPostModal('${p.img}','${docSnap.id}')"
           style="animation: fadeIn .4s ease;">
        <img src="${p.img}">
        <span class="save-icon" onclick="toggleSave(event, '${docSnap.id}', '${uid}', '${p.img}')">🔖</span>
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById("profileContent").innerHTML = html;
}

// =========================================================
// MUSIC TAB
// =========================================================
function loadMusic(uid) {
  document.getElementById("profileContent").innerHTML = `
    <p class="nocontent">No music uploaded yet.</p>
  `;
}

// =========================================================
// QUOTES TAB
// =========================================================
function loadQuotes(uid) {
  document.getElementById("profileContent").innerHTML = `
    <p class="nocontent">No quotes added yet.</p>
  `;
}

// =========================================================
// SAVED POSTS LOADER
// =========================================================
async function loadSaved(uid) {
  const snap = await getDocs(collection(db, "users", uid, "saved"));

  if (snap.empty) {
    document.getElementById("profileContent").innerHTML =
      `<p class="nocontent">No saved posts.</p>`;
    return;
  }

  let html = `<div class="profile-post-grid">`;

  snap.forEach(docSnap => {
    const p = docSnap.data();
    html += `
      <div class="post-item" 
           onclick="openPostModal('${p.img}','${docSnap.id}')">
        <img src="${p.img}">
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById("profileContent").innerHTML = html;
}

// =========================================================
// SAVE ICON HANDLER
// =========================================================
import {
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.toggleSave = async function (e, postId, ownerId, img) {
  e.stopPropagation();
  const uid = auth.currentUser.uid;

  await setDoc(doc(db, "users", uid, "saved", postId), {
    img: img,
    owner: ownerId,
    savedAt: Date.now()
  });

  e.target.style.opacity = 1;
};

// =========================================================
// OPEN HIGHLIGHT CREATION SHEET
// =========================================================
window.openCreateHighlight = function () {
  const modal = document.getElementById("highlightCreateSheet");
  modal.classList.add("sheet-open");
};

window.closeHighlightCreate = function () {
  const modal = document.getElementById("highlightCreateSheet");
  modal.classList.remove("sheet-open");
};

window.createHighlight = async function () {
  const uid = auth.currentUser.uid;

  const name = document.getElementById("newHighlightName").value;
  const file = document.getElementById("newHighlightCover").files[0];

  if (!name || !file) {
    alert("Add name & cover");
    return;
  }

  const coverURL = await uploadImage(file);

  const id = Date.now().toString();

  await setDoc(doc(db, "users", uid, "highlights", id), {
    name: name,
    cover: coverURL,
    createdAt: Date.now()
  });

  closeHighlightCreate();
  loadHighlights(uid);
};

import { getStorage, ref, uploadBytes, getDownloadURL } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

async function uploadImage(file) {
  const storage = getStorage();
  const path = "highlights/" + auth.currentUser.uid + "/" + Date.now();

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);
}

window.openHighlight = async function (highlightId) {
  const uid = auth.currentUser.uid;

  const storySnap = await getDocs(
    collection(db, "users", uid, "highlights", highlightId, "stories")
  );

  if (storySnap.empty) {
    openStoryViewer(["/empty.jpg"]);
    return;
  }

  let stories = [];

  storySnap.forEach(s => {
    stories.push(s.data().img);
  });

  openStoryViewer(stories);
};

// =========================================================
// VISIONOS HIGHLIGHT STORY VIEWER
// =========================================================
window.openStoryViewer = function (imgs) {
  const viewer = document.getElementById("storyViewer");
  const imgEl = document.getElementById("storyImg");

  let index = 0;
  imgEl.src = imgs[index];

  viewer.classList.add("sv-show");

  function next() {
    index++;
    if (index >= imgs.length) return closeStoryViewer();
    imgEl.src = imgs[index];
  }

  viewer.onclick = next;
};

window.closeStoryViewer = function () {
  const viewer = document.getElementById("storyViewer");
  viewer.classList.remove("sv-show");
};

window.addStoryToHighlight = async function (highlightId, file) {
  const uid = auth.currentUser.uid;
  const imgURL = await uploadImage(file);

  const storyId = Date.now().toString();

  await setDoc(
    doc(db, "users", uid, "highlights", highlightId, "stories", storyId),
    {
      img: imgURL,
      timestamp: Date.now()
    }
  );

  loadHighlights(uid);
};

