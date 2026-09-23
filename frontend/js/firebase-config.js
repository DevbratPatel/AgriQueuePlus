// ===== AgriQueue+ | Firebase Authentication Configuration & Service =====

/**
 * FIREBASE CONFIGURATION
 * Replace the values below with your Firebase Project credentials from Firebase Console:
 * https://console.firebase.google.com/ -> Project Settings -> General -> Your apps -> Web app
 */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// State flag
let isFirebaseInitialized = false;
let fbAuth = null;
let fbConfirmationResult = null; // For phone auth

// Check if valid Firebase keys are configured (not default placeholder)
function isFirebaseReady() {
  return isFirebaseInitialized && 
         firebaseConfig.apiKey && 
         !firebaseConfig.apiKey.includes('YOUR_FIREBASE_API_KEY');
}

// Initialize Firebase App & Auth
try {
  if (typeof firebase !== 'undefined' && firebase.apps) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    fbAuth = firebase.auth();
    isFirebaseInitialized = true;
    console.log('🌾 [Firebase] Auth Service loaded successfully.');
    if (!isFirebaseReady()) {
      console.info('💡 [Firebase] Demo Mode: Replace placeholder keys in js/firebase-config.js with your Firebase project keys.');
    }
  }
} catch (err) {
  console.warn('⚠️ [Firebase] Initialization notice:', err.message);
  isFirebaseInitialized = false;
}

/**
 * Register a new user with Email & Password in Firebase
 */
async function firebaseRegisterWithEmail(email, password, displayName, role = 'farmer', extraData = {}) {
  if (!isFirebaseReady()) {
    // If Firebase keys aren't configured yet, perform clean direct registration via backend
    return {
      success: true,
      mode: 'local',
      user: {
        id: 'USR-' + Date.now(),
        name: displayName,
        email: email,
        phone: extraData.phone || '',
        role: role,
        avatar: (displayName || 'U').charAt(0).toUpperCase(),
        aadhaar: extraData.aadhaar || '',
        state: extraData.state || 'Punjab'
      }
    };
  }

  try {
    const userCredential = await fbAuth.createUserWithEmailAndPassword(email, password);
    const fbUser = userCredential.user;

    // Update display name
    await fbUser.updateProfile({ displayName: displayName });

    return {
      success: true,
      mode: 'firebase',
      firebaseUid: fbUser.uid,
      email: fbUser.email,
      user: {
        id: 'FB-' + fbUser.uid.slice(0, 8),
        name: displayName || fbUser.displayName || email.split('@')[0],
        email: fbUser.email,
        phone: extraData.phone || '',
        role: role,
        avatar: (displayName || email).charAt(0).toUpperCase(),
        aadhaar: extraData.aadhaar || '',
        state: extraData.state || 'Punjab'
      }
    };
  } catch (error) {
    console.error('Firebase Register Error:', error);
    return {
      success: false,
      code: error.code,
      message: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Sign in existing user with Email & Password in Firebase
 */
async function firebaseLoginWithEmail(email, password) {
  if (!isFirebaseReady()) {
    return {
      success: false,
      isUnconfigured: true,
      message: 'Firebase keys not configured yet. Please configure js/firebase-config.js or use standard Phone OTP verification.'
    };
  }

  try {
    const userCredential = await fbAuth.signInWithEmailAndPassword(email, password);
    const fbUser = userCredential.user;
    const token = await fbUser.getIdToken();

    return {
      success: true,
      mode: 'firebase',
      firebaseUid: fbUser.uid,
      token,
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email.split('@')[0]
    };
  } catch (error) {
    console.error('Firebase Login Error:', error);
    return {
      success: false,
      code: error.code,
      message: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Sign in with Google Popup
 */
async function firebaseLoginWithGoogle(role = 'farmer') {
  if (!isFirebaseReady()) {
    return {
      success: false,
      message: 'Google Sign-In requires your Firebase project keys to be configured in js/firebase-config.js.'
    };
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await fbAuth.signInWithPopup(provider);
    const fbUser = result.user;
    const token = await fbUser.getIdToken();

    return {
      success: true,
      mode: 'firebase',
      firebaseUid: fbUser.uid,
      token,
      email: fbUser.email,
      name: fbUser.displayName || 'Google User',
      avatar: (fbUser.displayName || 'G').charAt(0).toUpperCase(),
      role: role
    };
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error);
    return {
      success: false,
      code: error.code,
      message: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Sign out from Firebase
 */
async function firebaseLogout() {
  if (isFirebaseReady() && fbAuth) {
    try {
      await fbAuth.signOut();
    } catch (e) {
      console.warn('Firebase logout warning:', e);
    }
  }
}

/**
 * Friendly Error Messages for Firebase Codes
 */
function getFirebaseErrorMessage(error) {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'Account not found! This email is not registered. Please switch to the Register tab to create your account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered! Please switch to the Login tab.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. Try again later.';
    default:
      return error.message || 'Authentication error. Please try again.';
  }
}

window.firebaseConfig = firebaseConfig;
window.isFirebaseReady = isFirebaseReady;
window.firebaseRegisterWithEmail = firebaseRegisterWithEmail;
window.firebaseLoginWithEmail = firebaseLoginWithEmail;
window.firebaseLoginWithGoogle = firebaseLoginWithGoogle;
window.firebaseLogout = firebaseLogout;
