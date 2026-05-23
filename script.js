document.addEventListener('DOMContentLoaded', function() {
    
    // Register Chart DataLabels plugin
    Chart.register(ChartDataLabels);
    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = '#8fa0dd'; // Default dark mode color

    let charts = {};
    let allRawData = [];
    
    // Active all filters initially as requested
    let currentFilters = { 
        years: ['2024', '2025', '2026'], 
        months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 
        names: [] 
    };

    // Initialize Empty Charts with correct layout specs
    initCharts();

    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        
        // Toggle icon
        if(document.body.classList.contains('light-mode')) {
            this.classList.remove('fa-sun');
            this.classList.add('fa-moon');
            Chart.defaults.color = '#333'; // Light mode chart text
        } else {
            this.classList.remove('fa-moon');
            this.classList.add('fa-sun');
            Chart.defaults.color = '#8fa0dd'; // Dark mode chart text
        }
        
        // Update specific datalabels color based on theme
        let isLight = document.body.classList.contains('light-mode');
        Object.values(charts).forEach(c => {
            if (c.options.plugins.datalabels) {
                c.options.plugins.datalabels.color = isLight ? '#000000' : '#ffffff';
            }
            c.update();
        });
    });

    // Load Data Purely from data.csv
    function loadData() {
        Papa.parse("data.csv", {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    allRawData = parseAndCleanData(results.data);
                    applyFiltersAndRender();
                } else {
                    console.error("CSV File is empty or could not be loaded.");
                }
            }
        });
    }

    // ADVANCED DATE PARSER
    function parseAndCleanData(rawInput) {
        const monthsMap = { 
            'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Jun',
            'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
        };

        return rawInput.map(row => {
            let originalDate = (row.Date || '').trim();
            let finalYear = '2024';
            let finalMonth = 'Jan';

            if (originalDate) {
                let partsAlpha = originalDate.split(/[-/]/);
                if (partsAlpha.length === 3 && isNaN(partsAlpha[1])) {
                    let monthStr = partsAlpha[1].toLowerCase().substring(0, 3);
                    finalMonth = monthsMap[monthStr] || 'Jan';
                    let yr = partsAlpha[2];
                    finalYear = yr.length === 2 ? '20' + yr : yr;
                } 
                else if (partsAlpha.length === 3) {
                    if (partsAlpha[0].length === 4) { 
                        finalYear = partsAlpha[0];
                        let mIdx = parseInt(partsAlpha[1], 10) - 1;
                        const mArray = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        finalMonth = mArray[mIdx] || 'Jan';
                    }
                }
            }

            return {
                Job_Number: row.Job_Number || 'N/A',
                QC_Name: row.QC_Name || 'Unknown',
                Inspection_Status: (row.Inspection_Status || 'Pass').trim(),
                Date: originalDate || '2024-01-01',
                Year: finalYear,
                Month: finalMonth,
                Department: row.Department || 'Inspection & Packing',
                Inspection_By: row.Inspection_By || 'N/A',
                Category: row.Category || 'Unknown'
            };
        });
    }

    // Filter buttons logic
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            let val = this.getAttribute('data-val');
            let isYear = this.parentElement.classList.contains('year-filters');
            let targetGroup = isYear ? currentFilters.years : currentFilters.months;

            if (this.classList.contains('active')) {
                targetGroup.push(val);
            } else {
                let index = targetGroup.indexOf(val);
                if (index > -1) targetGroup.splice(index, 1);
            }
            applyFiltersAndRender();
        });
    });

    // Reset All Filters Button
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        currentFilters = { 
            years: ['2024', '2025', '2026'], 
            months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 
            names: [] 
        };
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.add('active'));
        applyFiltersAndRender();
    });

    // Interactive Bar Toggling Function
    window.toggleNameFilter = function(name) {
        let index = currentFilters.names.indexOf(name);
        if (index > -1) currentFilters.names.splice(index, 1);
        else currentFilters.names.push(name);
        applyFiltersAndRender();
    };

    // Engine Core Renderer
    function applyFiltersAndRender() {
        let filteredData = allRawData.filter(row => {
            let yearMatch = currentFilters.years.length === 0 || currentFilters.years.includes(row.Year);
            let monthMatch = currentFilters.months.length === 0 || currentFilters.months.includes(row.Month);
            let nameMatch = currentFilters.names.length === 0 || currentFilters.names.includes(row.QC_Name);
            return yearMatch && monthMatch && nameMatch;
        });

        let timelineFilteredData = allRawData.filter(row => {
            let yearMatch = currentFilters.years.length === 0 || currentFilters.years.includes(row.Year);
            let monthMatch = currentFilters.months.length === 0 || currentFilters.months.includes(row.Month);
            return yearMatch && monthMatch;
        });

        updateKPIs(filteredData);
        updateTable(filteredData); // Hardcoded inside to show only Rejects
        updatePackingQCTracks(timelineFilteredData);
        updateCategoriesList(filteredData);
        updateChartsData(filteredData);
    }

    // Component Functionality
    function updateKPIs(data) {
        let total = data.length;
        let reject = data.filter(d => d.Inspection_Status === 'Reject').length;
        let pass = total - reject;
        
        let passPct = total > 0 ? ((pass / total) * 100).toFixed(2) : "0.00";
        let rejectPct = total > 0 ? ((reject / total) * 100).toFixed(2) : "0.00";

        const mapping = {
            'kpiTotalDevices': total, 'kpiTotalPass': pass, 'kpiTotalReject': reject,
            'kpiPassRate': passPct + '%', 'kpiRejectRate': rejectPct + '%',
            'sumTotal': total, 'sumPass': pass, 'sumReject': reject,
            'sumPassRate': passPct + '%', 'sumRejectRate': rejectPct + '%'
        };

        Object.keys(mapping).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = mapping[id];
        });
    }

    function updateTable(data) {
        const tbody = document.getElementById('rejectedTableBody');
        if (!tbody) return; // حماية إضافية
        tbody.innerHTML = '';
        
        let tableRows = data.filter(d => d.Inspection_Status === 'Reject');
        tableRows.forEach(row => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.Job_Number || ''}</td>
                <td>${row.QC_Name || ''}</td>
                <td class="red-text">${row.Inspection_Status || ''}</td>
                <td>${row.Date || ''}</td>
                <td>${row.Inspection_By || ''}</td>
                <td>${row.Category || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updatePackingQCTracks(data) {
        let container = document.getElementById('packingQcContent');
        container.innerHTML = '';

        let distinctDepts = [...new Set(data.map(d => d.Department))];

        distinctDepts.forEach(dept => {
            let deptRecords = data.filter(d => d.Department === dept);
            if (deptRecords.length === 0) return;

            let blockHtml = `<div class="dept-block"><div class="dept-title">${dept}</div>`;
            let userMap = {};

            deptRecords.forEach(r => {
                if (!userMap[r.QC_Name]) userMap[r.QC_Name] = { total: 0, reject: 0 };
                userMap[r.QC_Name].total++;
                if (r.Inspection_Status === 'Reject') userMap[r.QC_Name].reject++;
            });

            let sortedNames = Object.keys(userMap).sort((a,b) => userMap[b].total - userMap[a].total);

            sortedNames.forEach(name => {
                let stats = userMap[name];
                let rejRate = stats.total > 0 ? Math.round((stats.reject / stats.total) * 100) : 0;
                let passRate = 100 - rejRate;
                let activeClass = currentFilters.names.includes(name) ? 'active-name' : '';

                blockHtml += `
                    <div class="qc-bar-row ${activeClass}" onclick="toggleNameFilter('${name}')">
                        <div class="qc-name" title="${name}">${name}</div>
                        <div class="qc-track">
                            <div class="qc-pass-fill" style="width: ${passRate}%;"></div>
                            <div class="qc-reject-fill" style="width: ${rejRate}%;"></div>
                            <div class="qc-total-text">${stats.total}</div>
                        </div>
                        <div class="qc-rate">${rejRate}%</div>
                    </div>
                `;
            });

            blockHtml += `</div>`;
            container.innerHTML += blockHtml;
        });
    }

    function updateCategoriesList(data) {
        let catCount = {};
        let totalRejects = data.filter(d => d.Inspection_Status === 'Reject');
        
        totalRejects.forEach(d => {
            catCount[d.Category] = (catCount[d.Category] || 0) + 1;
        });

        let sortedCats = Object.keys(catCount).map(k => ({ name: k, count: catCount[k] })).sort((a,b) => b.count - a.count);
        let listContainer = document.getElementById('rejectCategoriesList');
        listContainer.innerHTML = '';

        let maxCount = sortedCats.length > 0 ? sortedCats[0].count : 1;
        const barColors = ['#00d2ff', '#ff4b2b', '#8a2be2', '#ffcc00', '#ff007f', '#00ffcc'];

        sortedCats.forEach((item, index) => {
            let fillPct = (item.count / maxCount) * 100;
            let chosenColor = barColors[index % barColors.length];
            listContainer.innerHTML += `
                <div class="cat-row">
                    <div class="cat-name"><span>${item.name}</span><span>${item.count}</span></div>
                    <div class="cat-bar-container">
                        <div class="cat-bar" style="width: ${fillPct}%; background: ${chosenColor}; box-shadow: 0 0 8px ${chosenColor}"></div>
                    </div>
                </div>
            `;
        });
    }

    // Chart.js Configuration
    function initCharts() {
        const dlConfig = {
            display: true,
            color: '#ffffff',
            align: 'top',
            anchor: 'end',
            offset: -2,
            font: { weight: 'bold', size: 9 },
            formatter: Math.round
        };

        charts.monthly = new Chart(document.getElementById('monthlyChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [
                    { label: 'Total', data: [], backgroundColor: '#0055ff', borderRadius: 2 },
                    { label: 'Reject', data: [], backgroundColor: '#ff2a2a', borderRadius: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, datalabels: dlConfig },
                scales: { x: { grid: { display: false } }, y: { display: false, beginAtZero: true } }
            }
        });

        charts.annual = new Chart(document.getElementById('annualChart').getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [
                { label: 'Total', data: [], backgroundColor: '#00d2ff', borderRadius: 2 },
                { label: 'Reject', data: [], backgroundColor: '#ff2a2a', borderRadius: 2 }
            ]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, datalabels: dlConfig },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 8 } } }, y: { display: false, beginAtZero: true } }
            }
        });

        charts.ratio = new Chart(document.getElementById('ratioChart').getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['Reject', 'Pass'], datasets: [{ data: [0, 100], backgroundColor: ['#ff2a2a', '#0055ff'], borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }, datalabels: { display: false } }
            }
        });

        charts.annualTotal = new Chart(document.getElementById('annualTotalChart').getContext('2d'), {
            type: 'bar',
            data: { labels: ['2024', '2025', '2026'], datasets: [{ data: [], backgroundColor: '#8a2be2', borderRadius: 3, barPercentage: 0.4 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, datalabels: dlConfig },
                scales: { x: { grid: { display: false } }, y: { display: false, beginAtZero: true } }
            }
        });
    }

    function updateChartsData(data) {
        const monthsList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        
        let mTotal = new Array(12).fill(0);
        let mReject = new Array(12).fill(0);
        data.forEach(d => {
            let idx = monthsList.indexOf(d.Month);
            if (idx > -1) { mTotal[idx]++; if (d.Inspection_Status === 'Reject') mReject[idx]++; }
        });
        charts.monthly.data.datasets[0].data = mTotal;
        charts.monthly.data.datasets[1].data = mReject;
        charts.monthly.update();

        let trackingMap = {};
        data.forEach(d => {
            let key = `${d.Year}-${d.Month}`;
            if (!trackingMap[key]) {
                trackingMap[key] = { 
                    label: `${d.Month} ${d.Year.substring(2)}`, 
                    total: 0, reject: 0, 
                    order: parseInt(d.Year) * 12 + monthsList.indexOf(d.Month) 
                };
            }
            trackingMap[key].total++;
            if (d.Inspection_Status === 'Reject') trackingMap[key].reject++;
        });

        let orderedPeriods = Object.values(trackingMap).sort((a,b) => a.order - b.order);
        charts.annual.data.labels = orderedPeriods.map(p => p.label);
        charts.annual.data.datasets[0].data = orderedPeriods.map(p => p.total);
        charts.annual.data.datasets[1].data = orderedPeriods.map(p => p.reject);
        charts.annual.update();

        let totalRejects = data.filter(d => d.Inspection_Status === 'Reject').length;
        let totalPasses = data.length - totalRejects;
        charts.ratio.data.datasets[0].data = [totalRejects, totalPasses];
        charts.ratio.update();

        let yLabels = ['2024', '2025', '2026'];
        charts.annualTotal.data.datasets[0].data = yLabels.map(yr => data.filter(d => d.Year === yr).length);
        charts.annualTotal.update();
    }

    loadData();
});
