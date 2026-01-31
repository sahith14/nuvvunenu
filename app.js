// ================================
// FIXED IMPORTS
// ================================

import { auth, db, googleLogin, loginEmail, signupEmail } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import * as feed from "./modules/feed.js";
import * as search from "./modules/search.js";
import * as messages from "./modules/messages.js";
import * as partner from "./modules/partner.js";
import * as space from "./modules/space.js";
import * as profile from "./modules/profile.js";


// TEMP AUTH PAGE
const authPage = {
  render() {
    return `
      <div class="auth-body">
        <div class="glass auth-card">

          <h2>Welcome</h2>

          <input id="login-email" placeholder="Email">
          <input id="login-password" placeholder="Password" type="password">

          <button onclick="loginUser()">Login</button>
          <button class="google-btn" onclick="googleLogin()">Login with Google</button>

          <hr>

          <input id="signup-email" placeholder="New Email">
          <input id="signup-password" placeholder="New Password" type="password">
          <button onclick="signUp()">Create Account</button>

        </div>
      </div>
    `;
  }
};


// ONLY ONE PAGES OBJECT
const pages = { 
  feed, search, messages, partner, space, profile, auth: authPage 
};


// ================================
// AUTH STATE LISTENER
// ================================
onAuthStateChanged(auth, async (user) => {
  console.log("Auth changed:", user);

  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // NEW USER
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        username: user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL || "",
        createdAt: Date.now(),
        status: {
          online: true,
          lastSeen: serverTimestamp()
        }
      });
    } else {
      // EXISTING USER → UPDATE STATUS
      await updateDoc(ref, {
        "status.online": true,
        "status.lastSeen": serverTimestamp()
      });
    }

    // MARK OFFLINE ON TAB CLOSE
    window.addEventListener("beforeunload", () => {
      updateDoc(ref, {
        "status.online": false,
        "status.lastSeen": serverTimestamp()
      });
    });

    loadPage("feed");
  } else {
    loadPage("auth");
  }
});

// ================================
// GOOGLE LOGIN — FIXED
// ================================
window.googleLogin = async function () {
  try {
    await googleLogin();
    loadPage("feed");
  } catch (err) {
    alert(err.message);
  }
};


// ================================
// EMAIL LOGIN — FIXED
// ================================
window.loginUser = async function () {
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;

  try {
    await loginEmail(email, pass);
    loadPage("feed");
  } catch (e) {
    alert(e.message);
  }
};


// ================================
// EMAIL SIGNUP — FIXED
// ================================
window.signUp = async function () {
  const email = document.getElementById("signup-email").value;
  const pass = document.getElementById("signup-password").value;

  try {
    const user = await signupEmail(email, pass);

    await setDoc(doc(db, "users", user.user.uid), {
      uid: user.user.uid,
      email,
      username: email.split("@")[0],
      photoURL: "",
      createdAt: Date.now()
    });

    loadPage("feed");

  } catch (e) {
    alert(e.message);
  }
};


// ================================
// PAGE LOADER — FIXED CLEAN VERSION
// ================================
window.loadPage = (p) => {
  const page = document.getElementById("page");

  // remove animation classes
  page.classList.remove("page-enter", "page-enter-active");
  void page.offsetWidth;

  // render page
  page.innerHTML = pages[p].render();

  // re-enable feed events
  if (p === "feed" && window.enableDoubleTap) {
    setTimeout(() => window.enableDoubleTap(), 50);
  }

  // Animate page
  page.classList.add("page-enter");
  requestAnimationFrame(() => {
    page.classList.add("page-enter-active");
  });

  // Highlight nav
  // RESET all navigation active states (desktop + bottom)
  document.querySelectorAll(
    ".bottom-nav button, .desktop-nav button, .vision-nav button"
  ).forEach(btn => btn.classList.remove("active"));

  // ACTIVATE correct nav button
  document.getElementById(`nav-${p}`)?.classList.add("active");
  document.getElementById(`nav-${p}-desktop`)?.classList.add("active");
  document.getElementById(`nav-${p}-mobile`)?.classList.add("active");

  // APPLY active to the selected button
  document.getElementById(`nav-${p}`)?.classList.add("active");
  document.getElementById(`nav-${p}-desktop`)?.classList.add("active");
  document.getElementById(`nav-${p}-mobile`)?.classList.add("active");

  document.getElementById(`nav-${p}`)?.classList.add("active");
  document.getElementById(`nav-${p}-desktop`)?.classList.add("active");
};


// ================================
// THEME SWITCHER
// ================================
window.applyTheme = function (name) {
  document.body.classList.remove("theme-white", "theme-dark", "theme-love");
  document.body.classList.add("theme-" + (name || "white"));
};

applyTheme("white");

// ================================
// LIQUID PHYSICS — unchanged
// ================================
function addLiquidPhysicsOnce() {
  addLiquidPhysics(".post-card, .glass, .dm-item, .vision-nav button, .desktop-nav button");
}

function addLiquidPhysics(selector) {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.classList.contains("liquid-init")) return;
    el.classList.add("liquid-init");

    el.addEventListener("mousedown", () => {
      el.classList.add("liquid-press");
      el.classList.remove("liquid-release", "liquid-end");
    });

    el.addEventListener("mouseup", () => {
      el.classList.remove("liquid-press");
      el.classList.add("liquid-release");

      setTimeout(() => {
        el.classList.remove("liquid-release");
        el.classList.add("liquid-end");
      }, 250);
    });
  });
}

setTimeout(addLiquidPhysicsOnce, 1500);

