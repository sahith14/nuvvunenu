// ===========================
// Instagram-Style Search System
// Fully Optimized for Sahith ❤️🔥
// ===========================
import {
  startAt,
  endAt,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Firestore / Firebase
import { db, auth } from "../firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------------------
// GLOBALS
// ---------------------------
window.myFollowingList = [];
let touchStartX = 0;

// ---------------------------
// LOAD USER FOLLOWING LIST
// ---------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const s = await getDoc(doc(db, "users", user.uid));
  window.myFollowingList = s.data()?.following || [];
});

// ---------------------------
// SAVE RECENT SEARCH
// ---------------------------
window.saveRecentSearch = function (uid, name, username, avatar) {
  let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  // remove duplicates
  recent = recent.filter((r) => r.uid !== uid);

  // add new
  recent.unshift({ uid, name, username, avatar });

  // limit 8
  if (recent.length > 8) recent = recent.slice(0, 8);

  localStorage.setItem("recentSearches", JSON.stringify(recent));
};

// ---------------------------
// DELETE RECENT SEARCH
// ---------------------------
window.deleteRecent = function (uid) {
  let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
  recent = recent.filter((r) => r.uid !== uid);
  localStorage.setItem("recentSearches", JSON.stringify(recent));
  loadRecentSearches();
};

// ---------------------------
// SWIPE GESTURES
// ---------------------------
window.touchStart = function (e) {
  touchStartX = e.touches[0].clientX;
};

window.touchMove = function (e) {
  const diff = e.touches[0].clientX - touchStartX;
  const el = e.currentTarget;

  if (diff < -25) el.style.transform = "translateX(-70px)";
};

window.touchEnd = function (e) {
  const el = e.currentTarget;

  if (parseInt(el.style.transform) < -30) return;
  el.style.transform = "translateX(0)";
};

// ---------------------------
// LOAD RECENT SEARCHES INTO UI
// ---------------------------
function loadRecentSearches() {
  const box = document.getElementById("recentBox");
  if (!box) return;
  box.innerHTML = `<p class="recent-title">Recent</p>` + html;
  let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  if (recent.length === 0) {
    box.innerHTML = `<p class="no-recent">No recent searches</p>`;
    return;
  }

  let html = "";

  recent.forEach((r) => {
    html += `
      <div class="recent-item"
          ontouchstart="touchStart(event)"
          ontouchmove="touchMove(event)"
          ontouchend="touchEnd(event)">

        <img src="${r.avatar || 'img/default/default-avatar.png'}" class="recent-avatar">

        <div class="recent-info" onclick="openUserProfile('${r.uid}')">
          <p>${r.name}</p>
          <span>@${r.username}</span>
        </div>

        <button class="delete-recent" onclick="deleteRecent('${r.uid}')">✕</button>
      </div>
    `;
  });

  box.innerHTML = html;
}

// ---------------------------
// LIVE USER SEARCH
// ---------------------------
window.liveUserSearch = async function () {
  const input = document.getElementById("searchInput");
  const text = input.value.trim().toLowerCase();
  const recentBox = document.getElementById("recentBox");
  const resultsBox = document.getElementById("searchResults");

  // Collapse recent when typing
  if (!text) {
    recentBox.style.display = "block";
    resultsBox.innerHTML = "";
    return;
  }

  recentBox.style.display = "none";

  // Query users
  const q = query(
    collection(db, "users"),
    orderBy("username"),
    startAt(text),
    endAt(text + "\uf8ff")
  );

  onSnapshot(q, (snap) => {
    let html = "";

    snap.forEach((d) => {
      const u = d.data();
      const uid = d.id;

      if (!u.username?.toLowerCase().includes(text)) return;

      html += userResultCard(uid, u);
    });

    resultsBox.innerHTML = html || `<p class='no-results'>No users found</p>`;
  });
};

// ---------------------------
// BUILD USER RESULT CARD
// ---------------------------
function userResultCard(uid, u) {
  // ⭐ MUTUAL FOLLOWERS
  let mutualLine = "";
  const myFollowing = window.myFollowingList || [];

  if (u.followers) {
    const mutual = u.followers.filter((x) => myFollowing.includes(x));

    if (mutual.length === 1) mutualLine = `Followed by ${mutual[0]}`;
    else if (mutual.length === 2)
      mutualLine = `Followed by ${mutual[0]}, ${mutual[1]}`;
    else if (mutual.length > 2)
      mutualLine = `Followed by ${mutual[0]}, ${mutual[1]} + ${mutual.length - 2} more`;
  }

  return `
    <div class="user-card glass"
         onclick="saveRecentSearch('${uid}', \`${u.name}\`, \`${u.username}\`, \`${u.avatar || ''}\`); openUserProfile('${uid}')">

      <img src="${u.avatar || 'img/default/default-avatar.png'}" class="user-avatar">

      <div class="user-info">
        <p class="username">@${u.username}</p>
        <p class="name">${u.name}</p>

        ${mutualLine
          ? `<p class='mutual-line'>${mutualLine}</p>`
          : u.following?.includes(auth.currentUser?.uid)
          ? `<p class='follows-you'>Follows you</p>`
          : ""}
      </div>

      <button class="followBtn"
              id="follow-${uid}"
              onclick="event.stopPropagation(); toggleFollow('${uid}')">
        ${u.followers?.includes(auth.currentUser?.uid) ? "Following" : "Follow"}
      </button>

    </div>
  `;
}

// ---------------------------
// OPEN PROFILE FROM SEARCH
// ---------------------------
window.openUserProfile = function (uid) {
  loadPage("profileView", uid);
};

// ---------------------------
// INIT SEARCH PAGE
// ---------------------------
export function init() {
  loadRecentSearches();
}

// ---------------------------
// RENDER SEARCH PAGE
// ---------------------------
export function render() {
  return `
    <div class="search-container">
      <input id="searchInput" class="search-input" placeholder="Search..." oninput="liveUserSearch()" />

      <div id="recentBox" class="recent-search-list"></div>

      <div id="searchResults" class="search-results"></div>
    </div>
  `;
}
