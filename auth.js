(function() {
    'use strict';

    const firebaseConfig = {
    apiKey: "AIzaSyCMMYNLrbzZKqYH_JOIhVPOLEwyJXXSwGg",
    authDomain: "upgrade-dashboard-dc693.firebaseapp.com",
    databaseURL: "https://upgrade-dashboard-dc693-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "upgrade-dashboard-dc693",
    storageBucket: "upgrade-dashboard-dc693.firebasestorage.app",
    messagingSenderId: "35769189924",
    appId: "1:35769189924:web:ac0f99415a93860c58fab1",
    measurementId: "G-S6YVBY3QHW"
};

    const LOGIN_PAGE = 'login.html';
    const DASHBOARD_PAGE = 'index.html';

    if (!window.firebase || !window.firebase.auth) {
        console.error('Firebase Auth SDK is not loaded.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const currentPage = (window.location.pathname.split('/').pop() || DASHBOARD_PAGE).toLowerCase();
    const isLoginPage = currentPage === LOGIN_PAGE;

    function setAuthLoading(isLoading) {
        document.documentElement.classList.toggle('auth-checking', !!isLoading);
        document.documentElement.classList.toggle('auth-ready', !isLoading);
    }

    setAuthLoading(!isLoginPage);

    function normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    async function login(email, password, rememberSession) {
        const persistence = rememberSession
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);
        await auth.signInWithEmailAndPassword(normalizeEmail(email), password);
        return true;
    }

    async function logout() {
        await auth.signOut();
        window.location.replace(LOGIN_PAGE);
    }

    function isAuthenticated() {
        return !!auth.currentUser;
    }

    const authReady = new Promise(resolve => {
        auth.onAuthStateChanged(user => {
            if (!isLoginPage && !user) {
                window.location.replace(LOGIN_PAGE);
                resolve(null);
                return;
            }

            if (isLoginPage && user) {
                window.location.replace(DASHBOARD_PAGE);
                resolve(user);
                return;
            }

            setAuthLoading(false);
            resolve(user);
        });
    });

    function getCurrentUser() {
        return auth.currentUser;
    }

    window.UpgradeAuth = {
        auth,
        authReady,
        isAuthenticated,
        getCurrentUser,
        login,
        logout,
        defaultEmail: 'upgrade@upgrade.com'
    };
})();
