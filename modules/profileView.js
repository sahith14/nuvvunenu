import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "../firebase.js";

let openedUid = null;

export function render(uid) {
  openedUid = uid;

  return `
    <div class="profile-page">

      <div id="pv-header"></div>

      <div id="pv-posts" class="pv-post-grid"></div>

    </div>
  `;
}

export async function init(uid) {
  openedUid = uid;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const u = snap.data();

  const me = auth.currentUser.uid;

  const following = snap.data().followers.includes(me);
  const followText = following ? "Following" : "Follow";

  document.getElementById("pv-header").innerHTML = `
    <div class="pv-top">
      <img src="${u.avatar}" class="pv-avatar">

      <div class="pv-info">
        <h2>${u.name}</h2>
        <p>@${u.username}</p>

        <div class="pv-buttons">
          <button onclick="toggleFollow('${u.uid}')">${followText}</button>
          <button onclick="openChatWith('${u.uid}')">Message</button>
        </div>
      </div>
    </div>
  `;

  // Load posts
  const q = query(collection(db, "posts"), where("uid", "==", uid));
  const snaps = await getDocs(q);

  let html = "";
  snaps.forEach((p) => {
    const post = p.data();
    html += `
      <div class="pv-post">
        <img src="${post.img}">
      </div>
    `;
  });

  document.getElementById("pv-posts").innerHTML = html;
}

window.toggleFollow = async function(targetUid) {
  const me = auth.currentUser.uid;
  const myRef = doc(db, "users", me);
  const targetRef = doc(db, "users", targetUid);

  const meSnap = await getDoc(myRef);
  const iFollow = meSnap.data().following.includes(targetUid);

  if (iFollow) {
    await updateDoc(myRef, { following: arrayRemove(targetUid) });
    await updateDoc(targetRef, { followers: arrayRemove(me) });
  } else {
    await updateDoc(myRef, { following: arrayUnion(targetUid) });
    await updateDoc(targetRef, { followers: arrayUnion(me) });
  }

  loadPage("profileView", targetUid);
};

window.openChatWith = function(uid) {
  loadPage("messages");
  setTimeout(() => {
    window.startChatWith(uid);
  }, 400);
};
