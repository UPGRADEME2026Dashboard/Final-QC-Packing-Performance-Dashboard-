(function() {
    'use strict';

    const USERNAME = 'UpGrade';
    const PASSWORD = 'UPGRADE2026';
    const SESSION_KEY = 'upgradeDashboardAuthenticated';
    const REMEMBER_KEY = 'upgradeDashboardRemembered';

    function isAuthenticated() {
        return sessionStorage.getItem(SESSION_KEY) === 'true' || localStorage.getItem(REMEMBER_KEY) === 'true';
    }

    function login(username, password, rememberSession) {
        const valid = username === USERNAME && password === PASSWORD;
        if (!valid) return false;

        sessionStorage.setItem(SESSION_KEY, 'true');
        if (rememberSession) localStorage.setItem(REMEMBER_KEY, 'true');
        else localStorage.removeItem(REMEMBER_KEY);
        return true;
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        window.location.replace('login.html');
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'login.html' && !isAuthenticated()) {
        window.location.replace('login.html');
    }

    window.UpgradeAuth = { isAuthenticated, login, logout };
})();
