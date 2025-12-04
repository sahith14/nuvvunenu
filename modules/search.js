// =========================================================
// search.js — Real-time user search + profile view + follow
// =========================================================

import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

// ----------------------------------------------
// SEARCH PAGE UI
// ----------------------------------------------
export function render() {
  return `
    <div class="search-container">

      <input id="searchInput"
             placeholder="Search users..."
             oninput="searchUsers()">

      <div id="searchResults" class="search-results"></div>

    </div>
  `;
}


// ----------------------------------------------
// REAL-TIME SEARCH
// ----------------------------------------------
window.searchUsers = async function () {
  let text = document.getElementById("searchInput").value.toLowerCase();
  let resultsBox = document.getElementById("searchResults");

  if (text.length === 0) {
    resultsBox.innerHTML = "";
    return;
  }

  // Firestore search using generated keywords
  const q = query(
    collection(db, "users"),
    where("searchKeywords", "array-contains", text)
  );

  const snap = await getDocs(q);

  let html = "";

  snap.forEach(d => {
    const u = d.data();
    if (u.uid === auth.currentUser.uid) return; // don't show yourself

    html += userCardHTML(d.id, u);
  });

  resultsBox.innerHTML = html || `<p class="no-results">No users found</p>`;
};


// ----------------------------------------------
// USER CARD HTML (beautiful glass like your design)
// ----------------------------------------------
function userCardHTML(uid, u) {
  return `
    <div class="user-item glass" onclick="openProfile('${uid}')">

      <img class="user-avatar" 
           src="${u.avatar || `https://i.pravatar.cc/150?u=${uid}`}" />

      <div class="user-info">
        <p class="username">${u.username}</p>
        <p class="name">${u.name || ""}</p>
      </div>

      <button class="follow-btn"
              onclick="toggleFollow(event, '${uid}')"
              id="follow-${uid}">
        ${getFollowState(uid)}
      </button>

    </div>
  `;
}


// ----------------------------------------------
// GET FOLLOW BUTTON TEXT
// ----------------------------------------------
function getFollowState(targetUID) {
  const me = auth.currentUser;
  if (!me || !me.following) return "Follow";

  return me.following.includes(targetUID) ? "Following" : "Follow";
}


// ----------------------------------------------
// OPEN PROFILE PAGE
// ----------------------------------------------
window.openProfile = async function (uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  // Load external profile UI
  import("./profile.js").then(module => {
    document.getElementById("page").innerHTML =
      module.renderExternalProfile(data, uid);
  });
};


// ----------------------------------------------
// FOLLOW / UNFOLLOW HANDLER
// ----------------------------------------------
window.toggleFollow = async function (e, targetUID) {
  e.stopPropagation();

  const currentUID = auth.currentUser.uid;
  const meRef = doc(db, "users", currentUID);

  const meSnap = await getDoc(meRef);
  let me = meSnap.data();

  let following = me.following || [];

  let btn = document.getElementById(`follow-${targetUID}`);

  if (following.includes(targetUID)) {
    // UNFOLLOW
    btn.textContent = "Follow";

    await updateDoc(meRef, { following: arrayRemove(targetUID) });
    await updateDoc(doc(db, "users", targetUID), { followers: arrayRemove(currentUID) });

  } else {
    // FOLLOW
    btn.textContent = "Following";

    await updateDoc(meRef, { following: arrayUnion(targetUID) });
    await updateDoc(doc(db, "users", targetUID), { followers: arrayUnion(currentUID) });
  }
};
