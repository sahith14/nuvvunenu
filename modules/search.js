// =========================================================
// search.js — REAL-TIME user search + follow + profile view
// =========================================================

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

// ------------------------------------------------------
// RENDER SEARCH PAGE
// ------------------------------------------------------
export function render() {
  return `
    <div class="search-container">

      <input id="searchInput" 
             placeholder="Search users..." 
             oninput="liveUserSearch()">

      <div id="searchResults" class="search-results"></div>

    </div>
  `;
}

export function init() {
  // nothing needed here
}

// ------------------------------------------------------
// REAL-TIME SEARCH
// ------------------------------------------------------
window.liveUserSearch = function () {
  const text = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultsBox = document.getElementById("searchResults");

  if (!text) {
    resultsBox.innerHTML = "";
    return;
  }

  const q = query(
    collection(db, "users"),
    where("searchKeywords", "array-contains", text)
  );

  onSnapshot(q, (snap) => {
    let html = "";

    snap.forEach((d) => {
      const u = d.data();
      if (u.uid === auth.currentUser.uid) return; // hide yourself
      html += userResultCard(u.uid, u);
    });

    resultsBox.innerHTML = html || `<p class="no-results">No users found</p>`;
  });
};

// ------------------------------------------------------
// USER RESULT CARD HTML
// ------------------------------------------------------
function userResultCard(uid, u) {
  return `
    <div class="user-card glass" onclick="openUserProfile('${uid}')">

      <img src="${u.avatar}" class="user-avatar">

      <div class="user-info">
        <p class="username">@${u.username}</p>
        <p class="name">${u.name}</p>
      </div>

      <button class="followBtn"
              id="follow-${uid}"
              onclick="event.stopPropagation(); toggleFollow('${uid}')">
        ${auth.currentUser.uid && u.followers?.includes(auth.currentUser.uid) ? "Following" : "Follow"}
      </button>

    </div>
  `;
}

// ------------------------------------------------------
// FOLLOW / UNFOLLOW SYSTEM
// ------------------------------------------------------
window.toggleFollow = async function (targetUID) {
  const myUID = auth.currentUser.uid;

  const meRef = doc(db, "users", myUID);
  const targetRef = doc(db, "users", targetUID);

  const meSnap = await getDoc(meRef);
  const me = meSnap.data();

  const isFollowing = me.following?.includes(targetUID);
  const btn = document.getElementById(`follow-${targetUID}`);

  if (isFollowing) {
    btn.textContent = "Follow";
    await updateDoc(meRef, { following: arrayRemove(targetUID) });
    await updateDoc(targetRef, { followers: arrayRemove(myUID) });
  } else {
    btn.textContent = "Following";
    await updateDoc(meRef, { following: arrayUnion(targetUID) });
    await updateDoc(targetRef, { followers: arrayUnion(myUID) });
  }
};

// ------------------------------------------------------
// OPEN INSTAGRAM-STYLE PROFILE PAGE
// ------------------------------------------------------
window.openUserProfile = function (uid) {
  loadPage("profileView", uid);
};
