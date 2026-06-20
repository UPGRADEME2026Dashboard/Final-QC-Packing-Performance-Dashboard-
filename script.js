document.addEventListener('DOMContentLoaded', function() {
    Chart.register(ChartDataLabels);
    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = '#8fa0dd';

    let charts = {};
    let allRawData = [];

    const defaultYears = ['2024', '2025', '2026'];
    const defaultMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const peopleSections = [
        { key: 'inspection', title: 'Inspection & Packing', field: 'Inspection_By' },
        { key: 'qc', title: 'Quality Control (QC)', field: 'QC_Name' }
    ];

    let currentFilters = {
        years: [...defaultYears],
        months: [...defaultMonths],
        people: [],
        products: []
    };

    const ADMIN_EMAIL = 'upgrade@upgrade.com';
    let onlineUsersHeartbeatId = null;
    let onlineUsersRef = null;

    function bootDashboard() {
        initCharts();
        initThemeToggle();
        initFilterButtons();
        initLogoutButton();
        lockDashboardReadOnly();
        loadData();
    }

    if (window.UpgradeAuth && window.UpgradeAuth.authReady) {
        window.UpgradeAuth.authReady.then(user => {
            if (user) {
                bootDashboard();
                initOnlineUsersTracking(user);
            }
        });
    } else {
        bootDashboard();
    }

    function initThemeToggle() {
        const themeBtn = document.getElementById('themeToggleBtn');
        themeBtn.addEventListener('click', function() {
            document.body.classList.toggle('light-mode');

            if (document.body.classList.contains('light-mode')) {
                this.classList.remove('fa-sun');
                this.classList.add('fa-moon');
                Chart.defaults.color = '#333';
            } else {
                this.classList.remove('fa-moon');
                this.classList.add('fa-sun');
                Chart.defaults.color = '#8fa0dd';
            }

            const isLight = document.body.classList.contains('light-mode');
            Object.values(charts).forEach(chart => {
                if (chart.options.plugins.datalabels) {
                    chart.options.plugins.datalabels.color = isLight ? '#000000' : '#ffffff';
                }
                chart.update();
            });
        });
    }

    function initFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const val = this.getAttribute('data-val');
                const isYear = this.parentElement.classList.contains('year-filters');
                const groupSelector = isYear ? '#yearFilters .filter-btn' : '#monthFilters .filter-btn';
                const defaultValues = isYear ? defaultYears : defaultMonths;
                const targetKey = isYear ? 'years' : 'months';

                if (this.classList.contains('active') && currentFilters[targetKey].length === 1) {
                    currentFilters[targetKey] = [...defaultValues];
                    document.querySelectorAll(groupSelector).forEach(button => button.classList.add('active'));
                } else {
                    currentFilters[targetKey] = [val];
                    document.querySelectorAll(groupSelector).forEach(button => {
                        button.classList.toggle('active', button.getAttribute('data-val') === val);
                    });
                }

                applyFiltersAndRender();
            });
        });

        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            currentFilters = {
                years: [...defaultYears],
                months: [...defaultMonths],
                people: [],
                products: []
            };
        document.querySelectorAll('.filter-btn').forEach(button => button.classList.add('active'));
        applyFiltersAndRender();
        });
    }



    function initLogoutButton() {
        updateLoggedInUserBadge();

        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', function() {
            if (window.UpgradeAuth && typeof window.UpgradeAuth.logout === 'function') {
                window.UpgradeAuth.logout();
                return;
            }

            sessionStorage.removeItem('upgradeDashboardAuthenticated');
            localStorage.removeItem('upgradeDashboardRemembered');
            window.location.replace('login.html');
        });
    }

    function updateLoggedInUserBadge() {
        const userEmailEl = document.getElementById('authUserEmail');
        if (!userEmailEl) return;

        const user = window.UpgradeAuth && window.UpgradeAuth.auth
            ? window.UpgradeAuth.auth.currentUser
            : null;

        const displayValue = user && (user.displayName || user.email)
            ? (user.displayName || user.email)
            : 'Authorized User';

        userEmailEl.textContent = displayValue;
        userEmailEl.title = displayValue;
    }

    function initOnlineUsersTracking(user) {
        if (!user || !window.firebase || !firebase.database) return;

        const email = String(user.email || '').trim().toLowerCase();
        const uid = user.uid;
        const db = firebase.database();
        onlineUsersRef = db.ref('onlineUsers/' + uid);

        function buildPresencePayload() {
            return {
                email: email || 'unknown',
                displayName: user.displayName || '',
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                page: location.pathname,
                userAgent: navigator.userAgent || ''
            };
        }

        function updatePresence() {
            onlineUsersRef.set(buildPresencePayload()).catch(() => {});
        }

        updatePresence();
        onlineUsersRef.onDisconnect().remove();

        if (onlineUsersHeartbeatId) clearInterval(onlineUsersHeartbeatId);
        onlineUsersHeartbeatId = setInterval(updatePresence, 15000);

        window.addEventListener('beforeunload', () => {
            if (onlineUsersRef) onlineUsersRef.remove().catch(() => {});
        });

        if (email === ADMIN_EMAIL) {
            initAdminOnlineUsersPanel(db);
        } else {
            hideAdminOnlineUsersPanel();
        }
    }

    function initAdminOnlineUsersPanel(db) {
        const card = document.getElementById('adminOnlineUsersCard');
        if (!card) return;

        card.hidden = false;
        card.classList.add('visible-admin-online');

        db.ref('onlineUsers').on('value', snapshot => {
            const data = snapshot.val() || {};
            const now = Date.now();
            const online = Object.values(data)
                .filter(item => item && item.email && item.lastSeen && (now - Number(item.lastSeen) < 45000))
                .sort((a, b) => String(a.email).localeCompare(String(b.email)));

            renderAdminOnlineUsers(online);
        }, () => {
            renderAdminOnlineUsers([]);
        });
    }

    function renderAdminOnlineUsers(onlineUsers) {
        const countEl = document.getElementById('onlineUsersCount');
        const listEl = document.getElementById('onlineUsersList');
        if (!countEl || !listEl) return;

        countEl.textContent = onlineUsers.length;

        if (onlineUsers.length === 0) {
            listEl.innerHTML = '<div class="online-user-empty">No online users</div>';
            return;
        }

        listEl.innerHTML = onlineUsers.map(user => {
            const email = escapeHtml(user.email || 'Unknown');
            const label = escapeHtml((user.displayName || user.email || 'Unknown').split('@')[0]);
            const lastSeenText = user.lastSeen ? formatOnlineTime(user.lastSeen) : '';
            return `
                <div class="online-user-row" title="${email}">
                    <span class="online-user-dot"></span>
                    <span class="online-user-info">
                        <span class="online-user-name">${label}</span>
                        <span class="online-user-email">${email}</span>
                    </span>
                    <span class="online-user-time">${lastSeenText}</span>
                </div>
            `;
        }).join('');
    }

    function hideAdminOnlineUsersPanel() {
        const card = document.getElementById('adminOnlineUsersCard');
        if (!card) return;
        card.hidden = true;
        card.classList.remove('visible-admin-online');
    }

    function formatOnlineTime(value) {
        const date = new Date(Number(value));
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function loadData() {
        Papa.parse('data.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    allRawData = parseAndCleanData(results.data);
                    applyFiltersAndRender();
                } else {
                    console.error('CSV File is empty or could not be loaded.');
                }
            },
            error: function(error) {
                console.error('CSV load failed:', error);
            }
        });
    }

    function parseAndCleanData(rawInput) {
        const monthsMap = {
            jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
            jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
        };

        return rawInput.map(row => {
            const originalDate = (row.Date || '').trim();
            let finalYear = (row.Year || '').trim();
            let finalMonth = normalizeMonth(row.Month || '');

            if ((!finalYear || !finalMonth) && originalDate) {
                const parsed = parseDateParts(originalDate, monthsMap);
                finalYear = finalYear || parsed.year;
                finalMonth = finalMonth || parsed.month;
            }

            return {
                Job_Number: cleanValue(row.Job_Number, 'N/A'),
                QC_Name: cleanValue(row.QC_Name, 'Unknown'),
                Inspection_Status: normalizeStatus(row.Inspection_Status),
                Date: originalDate || '2024-01-01',
                Year: finalYear || '2024',
                Month: finalMonth || 'Jan',
                Inspection_By: cleanValue(row.Inspection_By, 'N/A'),
                Category: cleanValue(row.Category, 'Unknown'),
                Final_Product: normalizeFinalProduct(row.Final_Product)
            };
        });
    }

    function parseDateParts(dateValue, monthsMap) {
        const parts = dateValue.split(/[-/]/);
        const fallback = { year: '2024', month: 'Jan' };
        if (parts.length !== 3) return fallback;

        if (isNaN(parts[1])) {
            const monthStr = parts[1].toLowerCase().substring(0, 3);
            const yr = parts[2];
            return {
                year: yr.length === 2 ? '20' + yr : yr,
                month: monthsMap[monthStr] || 'Jan'
            };
        }

        if (parts[0].length === 4) {
            return {
                year: parts[0],
                month: defaultMonths[parseInt(parts[1], 10) - 1] || 'Jan'
            };
        }

        return fallback;
    }

    function normalizeMonth(value) {
        const clean = String(value || '').trim();
        if (!clean) return '';
        const match = defaultMonths.find(month => month.toLowerCase() === clean.substring(0, 3).toLowerCase());
        return match || '';
    }

    function normalizeStatus(value) {
        const clean = String(value || '').trim().toLowerCase();
        return clean === 'reject' || clean === 'rejected' || clean === 'fail' ? 'Reject' : 'Pass';
    }

    function normalizeFinalProduct(value) {
        const clean = String(value || '').trim();
        const knownProducts = ['Diamond', 'Platinum', 'Gold', 'RF-WH'];
        return knownProducts.find(product => product.toLowerCase() === clean.toLowerCase()) || 'Unknown';
    }

    function cleanValue(value, fallback) {
        const clean = String(value || '').trim();
        return clean || fallback;
    }

    window.togglePersonFilter = function(sectionKey, name) {
        const id = `${sectionKey}::${name}`;
        const index = currentFilters.people.indexOf(id);
        if (index > -1) currentFilters.people.splice(index, 1);
        else currentFilters.people.push(id);
        applyFiltersAndRender();
    };

    window.toggleSectionFilter = function(sectionKey) {
        const section = peopleSections.find(item => item.key === sectionKey);
        if (!section) return;

        const activeNames = getVisibleBaseData()
            .map(row => row[section.field])
            .filter(Boolean);
        const uniqueIds = [...new Set(activeNames)].map(name => `${section.key}::${name}`);
        const allSelected = uniqueIds.length > 0 && uniqueIds.every(id => currentFilters.people.includes(id));

        if (allSelected) {
            currentFilters.people = currentFilters.people.filter(id => !uniqueIds.includes(id));
        } else {
            uniqueIds.forEach(id => {
                if (!currentFilters.people.includes(id)) currentFilters.people.push(id);
            });
        }

        applyFiltersAndRender();
    };

    window.toggleProductFilter = function(product) {
        currentFilters.products = currentFilters.products.includes(product) ? [] : [product];
        applyFiltersAndRender();
    };

    function applyFiltersAndRender() {
        const dateFilteredData = getVisibleBaseData();
        const peopleFilteredData = dateFilteredData.filter(matchesPeopleFilters);
        const filteredData = peopleFilteredData.filter(matchesProductFilters);

        updateKPIs(filteredData);
        updateTable(filteredData);
        updatePackingQCTracks(filteredData);
        updateCategoriesList(filteredData);
        updateFinalProductList(peopleFilteredData);
        updateRankingLists(filteredData);
        updateChartsData(filteredData);
    }

    function getVisibleBaseData() {
        return allRawData.filter(row => {
            const yearMatch = currentFilters.years.length === 0 || currentFilters.years.includes(row.Year);
            const monthMatch = currentFilters.months.length === 0 || currentFilters.months.includes(row.Month);
            return yearMatch && monthMatch;
        });
    }

    function matchesPeopleFilters(row) {
        if (currentFilters.people.length === 0) return true;

        return currentFilters.people.some(id => {
            const [sectionKey, name] = id.split('::');
            const section = peopleSections.find(item => item.key === sectionKey);
            return section && row[section.field] === name;
        });
    }

    function matchesProductFilters(row) {
        return currentFilters.products.length === 0 || currentFilters.products.includes(row.Final_Product);
    }

    function updateKPIs(data) {
        const total = data.length;
        const reject = data.filter(d => d.Inspection_Status === 'Reject').length;
        const pass = total - reject;
        const passPct = total > 0 ? ((pass / total) * 100).toFixed(2) : '0.00';
        const rejectPct = total > 0 ? ((reject / total) * 100).toFixed(2) : '0.00';

        const mapping = {
            kpiTotalDevices: total,
            kpiTotalPass: pass,
            kpiTotalReject: reject,
            kpiPassRate: passPct + '%',
            kpiRejectRate: rejectPct + '%'
        };

        Object.keys(mapping).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = mapping[id];
        });
    }

    function updateTable(data) {
        const tbody = document.getElementById('rejectedTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.filter(d => d.Inspection_Status === 'Reject').forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(row.Job_Number)}</td>
                <td>${escapeHtml(row.QC_Name)}</td>
                <td class="red-text">${escapeHtml(row.Inspection_Status)}</td>
                <td>${escapeHtml(row.Date)}</td>
                <td>${escapeHtml(row.Inspection_By)}</td>
                <td>${escapeHtml(row.Category)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updatePackingQCTracks(data) {
        const container = document.getElementById('packingQcContent');
        container.innerHTML = '';

        peopleSections.forEach(section => {
            const block = document.createElement('div');
            block.className = 'dept-block';

            const sectionStats = buildPersonStats(data, section.field);
            const names = Object.keys(sectionStats).sort((a, b) => sectionStats[b].total - sectionStats[a].total);
            const sectionTotal = data.length;
            const sectionReject = data.filter(d => d.Inspection_Status === 'Reject').length;
            const sectionRejectRate = sectionTotal > 0 ? ((sectionReject / sectionTotal) * 100).toFixed(1) : '0.0';
            const activeSection = names.length > 0 && names.every(name => currentFilters.people.includes(`${section.key}::${name}`));

            const deptButton = document.createElement('button');
            deptButton.className = `dept-title ${activeSection ? 'active-dept' : ''}`;
            deptButton.type = 'button';
            deptButton.addEventListener('click', () => window.toggleSectionFilter(section.key));

            const deptName = document.createElement('span');
            deptName.textContent = section.title;
            const deptStats = document.createElement('span');
            deptStats.textContent = `${sectionTotal} / ${sectionRejectRate}%`;
            deptButton.append(deptName, deptStats);
            block.appendChild(deptButton);

            if (names.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'dept-empty';
                empty.textContent = 'No matching records';
                block.appendChild(empty);
            }

            names.forEach(name => {
                const stats = sectionStats[name];
                const rejectRate = stats.total > 0 ? Math.round((stats.reject / stats.total) * 100) : 0;
                const passRate = 100 - rejectRate;
                const activeClass = currentFilters.people.includes(`${section.key}::${name}`) ? 'active-person' : '';

                const row = document.createElement('div');
                row.className = `qc-bar-row ${activeClass}`;
                row.addEventListener('click', () => window.togglePersonFilter(section.key, name));

                const nameEl = document.createElement('div');
                nameEl.className = 'qc-name';
                nameEl.title = name;
                nameEl.textContent = name;

                const track = document.createElement('div');
                track.className = 'qc-track';

                const passFill = document.createElement('div');
                passFill.className = 'qc-pass-fill';
                passFill.style.width = `${passRate}%`;

                const rejectFill = document.createElement('div');
                rejectFill.className = 'qc-reject-fill';
                rejectFill.style.width = `${rejectRate}%`;

                const totalText = document.createElement('div');
                totalText.className = 'qc-total-text';
                totalText.textContent = stats.total;
                track.append(passFill, rejectFill, totalText);

                const rate = document.createElement('div');
                rate.className = 'qc-rate';
                rate.textContent = `${rejectRate}%`;

                row.append(nameEl, track, rate);
                block.appendChild(row);
            });

            container.appendChild(block);
        });
    }

    function buildPersonStats(data, field) {
        const stats = {};
        data.forEach(record => {
            const name = record[field] || 'Unknown';
            if (!stats[name]) stats[name] = { total: 0, reject: 0 };
            stats[name].total++;
            if (record.Inspection_Status === 'Reject') stats[name].reject++;
        });
        return stats;
    }

    function updateCategoriesList(data) {
        const catCount = {};
        const totalRejects = data.filter(d => d.Inspection_Status === 'Reject');

        totalRejects.forEach(d => {
            catCount[d.Category] = (catCount[d.Category] || 0) + 1;
        });

        const sortedCats = Object.keys(catCount)
            .map(key => ({ name: key, count: catCount[key] }))
            .sort((a, b) => b.count - a.count);
        const listContainer = document.getElementById('rejectCategoriesList');
        listContainer.innerHTML = '';

        if (sortedCats.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No rejects</div>';
            return;
        }

        const maxCount = sortedCats[0].count;
        const barColors = ['#00d2ff', '#ff4b2b', '#8a2be2', '#ffcc00', '#ff007f', '#00ffcc'];

        sortedCats.forEach((item, index) => {
            const fillPct = (item.count / maxCount) * 100;
            const chosenColor = barColors[index % barColors.length];
            listContainer.innerHTML += `
                <div class="cat-row">
                    <div class="cat-name"><span>${escapeHtml(item.name)}</span><span>${item.count}</span></div>
                    <div class="cat-bar-container">
                        <div class="cat-bar" style="width: ${fillPct}%; background: ${chosenColor}; box-shadow: 0 0 8px ${chosenColor}"></div>
                    </div>
                </div>
            `;
        });
    }

    function updateFinalProductList(data) {
        const productColors = {
            Diamond: '#FF0066',
            Platinum: '#7030A0',
            Gold: '#FFC000',
            'RF-WH': '#00D2FF'
        };
        const productOrder = ['Diamond', 'Platinum', 'Gold', 'RF-WH'];
        const counts = productOrder.reduce((acc, product) => {
            acc[product] = 0;
            return acc;
        }, {});

        data.forEach(row => {
            if (counts[row.Final_Product] !== undefined) counts[row.Final_Product]++;
        });

        const listContainer = document.getElementById('finalProductList');
        if (!listContainer) return;

        listContainer.innerHTML = productOrder.map(product => {
            const color = productColors[product];
            const isActive = currentFilters.products.includes(product);
            return `
                <button class="product-row ${isActive ? 'active-product' : ''}" type="button" style="--product-color: ${color}" onclick="toggleProductFilter('${product}')">
                    <span class="product-dot"></span>
                    <span class="product-name">${escapeHtml(product)}</span>
                    <span class="product-count">${counts[product]}</span>
                </button>
            `;
        }).join('');
    }

    function updateRankingLists(data) {
        renderRankingList(
            'inspectionRejectRankingList',
            buildStatusRanking(data, 'Inspection_By', 'Reject'),
            'Reject'
        );

        renderRankingList(
            'qcPassRankingList',
            buildStatusRanking(data, 'QC_Name', 'Reject'),
            'Reject'
        );
    }

    function buildStatusRanking(data, field, status) {
        const counts = {};
        data.forEach(row => {
            if (row.Inspection_Status !== status) return;
            const name = cleanValue(row[field], 'Unknown');
            counts[name] = (counts[name] || 0) + 1;
        });

        return Object.keys(counts)
            .map(name => ({ name, count: counts[name] }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    function renderRankingList(containerId, rankingData, label) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (rankingData.length === 0) {
            container.innerHTML = `<div class="empty-state">No ${escapeHtml(label.toLowerCase())} records</div>`;
            return;
        }

        const maxCount = rankingData[0].count || 1;
        rankingData.forEach((item, index) => {
            const fillPct = Math.max((item.count / maxCount) * 100, 4);
            const row = document.createElement('div');
            row.className = 'ranking-row';
            row.innerHTML = `
                <div class="ranking-head">
                    <span class="ranking-rank">#${index + 1}</span>
                    <span class="ranking-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                    <span class="ranking-count">${item.count}</span>
                </div>
                <div class="ranking-bar-container">
                    <div class="ranking-bar" style="width: ${fillPct}%"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function lockDashboardReadOnly() {
        const preventEditableAction = event => {
            const target = event.target;
            if (!target) return;
            const isEditableArea = target.closest('.data-table') || target.closest('.kpi-card') || target.closest('.panel');
            const isAllowedControl = target.closest('button, .filter-btn, .product-row, .qc-bar-row, .dept-title, #themeToggleBtn, #logoutBtn');
            if (isEditableArea && !isAllowedControl) event.preventDefault();
        };

        document.addEventListener('beforeinput', preventEditableAction, true);
        document.addEventListener('input', preventEditableAction, true);
        document.addEventListener('paste', preventEditableAction, true);
        document.addEventListener('drop', preventEditableAction, true);

        const applyReadOnlyAttributes = () => {
            document.querySelectorAll('table, thead, tbody, tr, td, th, .kpi-value, .ranking-list, .categories-list').forEach(el => {
                el.setAttribute('contenteditable', 'false');
                el.setAttribute('aria-readonly', 'true');
                el.draggable = false;
            });
        };

        applyReadOnlyAttributes();

        const observer = new MutationObserver(applyReadOnlyAttributes);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function initCharts() {
        const dlConfig = {
            display: true,
            color: '#ffffff',
            align: 'top',
            anchor: 'end',
            offset: -2,
            font: { weight: 'bold', size: 9 },
            clip: false,
            clamp: true,
            formatter: Math.round
        };

        const qualityLabelConfig = {
            display: context => Number(context.dataset.data[context.dataIndex]) > 0,
            color: function() {
                return document.body.classList.contains('light-mode') ? '#111111' : '#ffffff';
            },
            textStrokeColor: function() {
                return document.body.classList.contains('light-mode') ? '#ffffff' : '#000000';
            },
            textStrokeWidth: 1,
            anchor: 'end',
            align: 'top',
            offset: -2,
            clip: false,
            clamp: true,
            font: { weight: 'bold', size: 10 },
            formatter: Math.round
        };

        charts.monthly = new Chart(document.getElementById('monthlyChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: defaultMonths,
                datasets: [
                    { label: 'Total Devices', data: [], backgroundColor: '#009cff', borderRadius: 2 },
                    { label: 'Reject', data: [], backgroundColor: '#ff003d', borderRadius: 2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 24, right: 12, bottom: 8, left: 12 } },
                plugins: { legend: { display: false }, datalabels: qualityLabelConfig },
                scales: { x: { grid: { display: false } }, y: { display: false, beginAtZero: true, grace: '26%' } }
            }
        });

       charts.ratio = new Chart(document.getElementById('ratioChart').getContext('2d'), {
    type: 'doughnut',
    data: {
        labels: ['Reject', 'Pass'],
        datasets: [{
            data: [0, 100],
            backgroundColor: [
                'rgba(255, 42, 42, 0.92)',
                'rgba(0, 210, 255, 0.92)'
            ],
            borderColor: [
                '#ff4b4b',
                '#00d2ff'
            ],
            borderWidth: 2,
            hoverOffset: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 10,
                    padding: 10,
                    color: function() {
                        return document.body.classList.contains('light-mode') ? '#111111' : '#ffffff';
                    },
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            },
            datalabels: {
    display: context => Number(context.dataset.data[context.dataIndex]) > 0,

    color: function() {
        return document.body.classList.contains('light-mode')
            ? '#000000'
            : '#ffffff';
    },

    textStrokeWidth: 0,

    textShadowBlur: 0,

    anchor: 'center',
    align: 'center',

    font: {
        weight: 'bold',
        size: 13
    },

    formatter: (value, context) => {

        const total = context.dataset.data.reduce(
            (sum, item) => sum + Number(item || 0),
            0
        );

        if (!total) return '';

        return `${Math.round((value / total) * 100)}%`;
    }
}
        }
    }
});

        charts.annualTotal = new Chart(document.getElementById('annualTotalChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: defaultYears,
                datasets: [{ data: [], backgroundColor: ['#00d2ff', '#8a2be2', '#ff2a2a'], borderRadius: 5, barPercentage: 0.5 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 14, right: 8, bottom: 0, left: 8 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        ...dlConfig,
                        align: 'end',
                        anchor: 'end',
                        offset: 2,
                        font: { weight: 'bold', size: 10 }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#8fa0dd', font: { weight: 'bold', size: 10 } } },
                    y: { display: false, beginAtZero: true, grace: '18%' }
                }
            }
        });
    }

    function updateChartsData(data) {
        const mTotal = new Array(12).fill(0);
        const mReject = new Array(12).fill(0);
        data.forEach(d => {
            const idx = defaultMonths.indexOf(d.Month);
            if (idx > -1) {
                mTotal[idx]++;
                if (d.Inspection_Status === 'Reject') mReject[idx]++;
            }
        });
        charts.monthly.data.datasets[1].data = mReject;
        charts.monthly.data.datasets[0].data = mTotal.map((total, index) => total - mReject[index]);
        charts.monthly.update();

        const totalRejects = data.filter(d => d.Inspection_Status === 'Reject').length;
        const totalPasses = data.length - totalRejects;
        charts.ratio.data.datasets[0].data = [totalRejects, totalPasses];
        charts.ratio.update();

        charts.annualTotal.data.datasets[0].data = defaultYears.map(yr => data.filter(d => d.Year === yr).length);
        charts.annualTotal.update();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }
});
