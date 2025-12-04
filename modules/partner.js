// partner.js — Couples matching system + request + accept + love animation
import {
  getFirestore, collection, doc, getDoc, updateDoc,
  query, where, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db, auth } from "../firebase.js";

export function render() {
  loadPartnerStatus();

  return `
    <div class="partner-container">

      <!-- SEARCH BAR -->
      <input id="partnerSearch" 
             oninput="searchPartner()" 
             placeholder="Search partner...">

      <!-- RESULTS -->
      <div id="partnerResults" class="partner-results"></div>

      <!-- PARTNER STATUS -->
      <div id="partnerStatus"></div>

      <!-- ANIMATION HOLDER -->
      <div id="loveAnimation" class="love-animation hidden"></div>

    </div>
  `;
}

// -----------------------------------------------------------
// LOAD PARTNER STATUS
// -----------------------------------------------------------

async function loadPartnerStatus() {
  let uid = auth.currentUser.uid;

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const u = snap.data();

  let box = document.getElementById("partnerStatus");

  if (!box || !u) return;

  if (u.partnerID) {
    // Already matched
    const partnerRef = doc(db, "users", u.partnerID);
    const pSnap = await getDoc(partnerRef);
    const p = pSnap.data();

    box.innerHTML = `
      <div class="partner-box glass">
        <h3>Your Partner ❤️</h3>
        <img src="${p.avatar || 'https://i.pravatar.cc/100?u='+p.uid}" class="partner-avatar">
        <p>${p.username}</p>
      </div>
    `;
  } else if (u.partnerRequestFrom) {
    // Incoming request
    const pRef = doc(db, "users", u.partnerRequestFrom);
    const pSnap = await getDoc(pRef);
    const p = pSnap.data();

    box.innerHTML = `
      <div class="partner-box glass">
        <h3>You have a partner request 💌</h3>
        <p>${p.username} wants to be your partner</p>
        
        <button class="accept-btn" onclick="acceptPartner('${p.uid}')">Accept</button>
        <button class="reject-btn" onclick="rejectPartner()">Reject</button>
      </div>
    `;
  }
}


// -----------------------------------------------------------
// SEARCH USERS FOR PARTNER
// -----------------------------------------------------------

window.searchPartner = async function() {
  let text = document.getElementById("partnerSearch").value.toLowerCase();

  if (!text.length) {
    document.getElementById("partnerResults").innerHTML = "";
    return;
  }

  const q = query(collection(db, "users"), where("searchKeywords", "array-contains", text));
  const snap = await getDocs(q);

  let html = "";

  snap.forEach(docu => {
    let u = docu.data();

    // Cannot send request to yourself
    if (u.uid === auth.currentUser.uid) return;

    html += `
      <div class="partner-item glass">
        <img src="${u.avatar || 'https://i.pravatar.cc/100?u='+u.uid}" class="partner-avatar">
        <div>
          <p class="partner-name">${u.username}</p>
        </div>
        <button onclick="sendPartnerReq('${u.uid}')" class="request-btn">Request</button>
      </div>
    `;
  });

  document.getElementById("partnerResults").innerHTML = html;
};


// -----------------------------------------------------------
// SEND PARTNER REQUEST
// -----------------------------------------------------------

window.sendPartnerReq = async function(targetUID) {
  let uid = auth.currentUser.uid;

  const targetRef = doc(db, "users", targetUID);
  await updateDoc(targetRef, {
    partnerRequestFrom: uid
  });

  alert("Partner request sent 💌");
};


// -----------------------------------------------------------
// ACCEPT PARTNER REQUEST
// -----------------------------------------------------------

window.acceptPartner = async function(otherUID) {
  let uid = auth.currentUser.uid;

  // Update both users
  await updateDoc(doc(db, "users", uid), {
    partnerID: otherUID,
    partnerRequestFrom: null
  });

  await updateDoc(doc(db, "users", otherUID), {
    partnerID: uid
  });

  // Run animation
  showLoveAnimation();

  setTimeout(() => {
    loadPartnerStatus();
  }, 2000);
};


// -----------------------------------------------------------
// REJECT PARTNER REQUEST
// -----------------------------------------------------------

window.rejectPartner = async function() {
  let uid = auth.currentUser.uid;

  await updateDoc(doc(db, "users", uid), {
    partnerRequestFrom: null
  });

  // Play heartbreak song
  const audio = new Audio("YOUR_SONG_URL_HERE"); 
  audio.play();

  alert("You rejected the request.");
};


// -----------------------------------------------------------
// LOVE ANIMATION
// -----------------------------------------------------------

function showLoveAnimation() {
  let anim = document.getElementById("loveAnimation");
  anim.innerHTML = `
    <div class="heart-ring"></div>
    <div class="heart-burst">💖💘💝💞💓</div>
  `;

  anim.classList.remove("hidden");

  setTimeout(() => {
    anim.classList.add("hidden");
  }, 1800);
}
