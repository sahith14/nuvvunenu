import { 
  doc, 
  getDoc, 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "../firebase.js";

// ===========================================================
// MAIN PROFILE RENDER
// ===========================================================
export function render() {
  const uid = auth.currentUser.uid;

  setTimeout(() => loadProfile(uid), 15);

  return `
    <div class="profile-page">

      <!-- Floating Glass Header -->
      <div class="profile-header-glass" id="profileHeader">
      </div>

      <!-- Tabs -->
      <div class="profile-tabs">
        <div class="p-tab active" onclick="switchProfileTab('posts')">Posts</div>
        <div class="p-tab" onclick="switchProfileTab('music')">Music</div>
        <div class="p-tab" onclick="switchProfileTab('quotes')">Quotes</div>
        <div id="profile-underline"></div>
      </div>

      <!-- Content -->
      <div id="profileContent" class="profile-content">Loading…</div>
    </div>
  `;
}

// ===========================================================
// LOAD PROFILE DATA
// ===========================================================
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();

  const postsSnap = await getDocs(collection(db, "users", uid, "posts"));
  const postCount = postsSnap.size || 0;

  const followers = u.followers?.length || 0;
  const following = u.following?.length || 0;

  document.getElementById("profileHeader").innerHTML = `
    <div class="ph-wrapper">
      <img src="${u.avatar}" class="ph-avatar">

      <div class="ph-info">
        <h2 class="ph-name">${u.name || ""}</h2>
        <p class="ph-username">@${u.username}</p>

        <p class="ph-stats">
          ${postCount} Posts • ${followers} Followers • ${following} Following
        </p>

        <p class="ph-bio">${u.bio || ""}</p>

        ${
          u.song
            ? `
          <audio controls class="ph-song">
            <source src="${u.song}">
          </audio>
        `
            : ""
        }

        <button class="ph-edit-btn" onclick="openEditProfile()">
          Edit Profile
        </button>
      </div>
    </div>
  `;

  loadPosts(uid);
}

// ===========================================================
// POSTS TAB
// ===========================================================
async function loadPosts(uid) {
  const snap = await getDocs(collection(db, "users", uid, "posts"));

  if (snap.empty) {
    document.getElementById("profileContent").innerHTML =
      `<p class="nocontent">No posts yet.</p>`;
    return;
  }

  let html = `<div class="profile-post-grid">`;

  snap.forEach(doc => {
    const p = doc.data();
    html += `
      <div class="profile-post-item" onclick="openPostModal('${p.img}')">
        <img src="${p.img}">
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById("profileContent").innerHTML = html;
}

// ===========================================================
// MUSIC TAB
// ===========================================================
function loadMusic(uid) {
  document.getElementById("profileContent").innerHTML = `
    <p class="nocontent">No music added yet.</p>
  `;
}

// ===========================================================
// QUOTES TAB
// ===========================================================
function loadQuotes(uid) {
  document.getElementById("profileContent").innerHTML = `
    <p class="nocontent">No quotes added yet.</p>
  `;
}

// ===========================================================
// TAB SWITCHING
// ===========================================================
window.switchProfileTab = function (tab) {
  const order = ["posts", "music", "quotes"];
  const index = order.indexOf(tab);

  document.getElementById("profile-underline").style.left =
    (index * 33.33) + "%";

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
};

// ===========================================================
// POST MODAL
// ===========================================================
window.openPostModal = function (img) {
  const modal = document.getElementById("postModal");
  const imgEl = document.getElementById("modalImage");

  imgEl.src = img;
  modal.classList.remove("hidden");
};

window.closePostModal = function () {
  document.getElementById("postModal").classList.add("hidden");
};

// Dummy function placeholder for edit profile
window.openEditProfile = function () {
  alert("Edit Profile coming soon!");
};
