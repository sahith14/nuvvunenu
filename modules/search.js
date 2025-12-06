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
      <div id="recentBox" class="recent-search-list"></div>
      <div id="searchResults" class="search-results"></div>
    </div>
  `;
}

export function init() {
  // nothing needed here
}

window.saveRecentSearch = function(uid, name, username, avatar) {
  let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  recent = recent.filter(r => r.uid !== uid);

  recent.unshift({ uid, name, username, avatar });

  if (recent.length > 8) recent = recent.slice(0, 8);

  localStorage.setItem("recentSearches", JSON.stringify(recent));
};

window.myFollowingList = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const snap = await getDoc(doc(db, "users", user.uid));
  window.myFollowingList = snap.data().following || [];
});

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
      const uid = d.id; // ⭐ correct Firestore UID

      if (uid === auth.currentUser.uid) return;

      html += userResultCard(uid, u);
    });

    resultsBox.innerHTML = html || `<p class="no-results">No users found</p>`;  
  });
};

// ------------------------------------------------------
// USER RESULT CARD HTML
// ------------------------------------------------------
function userResultCard(uid, u) {
  // ⭐ MUTUAL FOLLOWERS CALC
  let mutualLine = "";
  const myFollowing = window.myFollowingList || [];

  if (u.followers) {
    const mutual = u.followers.filter(x => myFollowing.includes(x));

    if (mutual.length === 1) {
      mutualLine = `Followed by ${mutual[0]}`;
    } else if (mutual.length === 2) {
      mutualLine = `Followed by ${mutual[0]}, ${mutual[1]}`;
    } else if (mutual.length > 2) {
      mutualLine = `Followed by ${mutual[0]}, ${mutual[1]} + ${mutual.length - 2} more`;
    }
  }

  return `
    <div class="user-card glass"
         onclick="saveRecentSearch('${uid}', \`${u.name}\`, \`${u.username}\`, \`${u.avatar || ''}\`); openUserProfile('${uid}')"

      <img src="${u.avatar || 'img/default-avatar.png'}" class="user-avatar">

      <div class="user-info">
        <p class="username">@${u.username}</p>
        <p class="name">${u.name}</p>

        ${
          mutualLine
            ? `<p class="mutual-line">${mutualLine}</p>`
            : (u.following?.includes(auth.currentUser.uid)
                ? `<p class="follows-you">Follows you</p>`
                : "")
        }
      </div>

      <button class="followBtn"
              id="follow-${uid}"
              onclick="event.stopPropagation(); toggleFollow('${uid}')">
        ${u.followers?.includes(auth.currentUser.uid) ? "Following" : "Follow"}
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

function loadRecentSearches() {
  const box = document.getElementById("recentBox");
  let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  if (recent.length === 0) {
    box.innerHTML = "<p class='no-recent'>No recent searches</p>";
    return;
  }

  let html = "";
  recent.forEach(r => {
    html += `
      <div class="recent-item" onclick="openUserProfile('${r.uid}')">
        <img src="${r.avatar || 'img/default-avatar.png'}" class="recent-avatar">
        <div>
          <p>${r.name}</p>
          <span>@${r.username}</span>
        </div>
      </div>
    `;
  });

  box.innerHTML = html;
}
