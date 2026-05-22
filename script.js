let allData = [];

let pieChart;
let monthlyChart;
let categoryChart;

let currentYear = 'All';
let currentMonth = 'All';

/* ==========================
   LOAD CSV
========================== */

Papa.parse('data.csv', {
download:true,
header:true,
skipEmptyLines:true,

complete:function(results){

allData = results.data
.filter(r => Object.keys(r).length > 0)
.map(row=>({

...row,

Job_Number:String(row.Job_Number||'').trim(),

QC_Name:String(row.QC_Name||'')
.replace(/-/g,'')
.trim(),

Inspection_Status:String(
row.Inspection_Status||''
).trim(),

Date:String(row.Date||'').trim(),

Inspection_By:String(
row.Inspection_By||''
).replace(/-/g,'')
.trim(),

Category:String(
row.Category||''
).trim(),

Month:String(
row.Month||''
).trim(),

Year:String(
row.Year||''
).trim()

}));

updateDashboard(allData);

}

});

/* ==========================
   FILTERS
========================== */

document.querySelectorAll('.year-btn')

.forEach(btn=>{

btn.addEventListener('click',()=>{

currentYear = btn.innerText;

applyFilters();

});

});

document.querySelectorAll('.month-btn')

.forEach(btn=>{

btn.addEventListener('click',()=>{

currentMonth = btn.innerText;

applyFilters();

});

});

document.getElementById('qcFilter')
?.addEventListener('change',applyFilters);

document.getElementById('packingFilter')
?.addEventListener('change',applyFilters);

document.getElementById('resetBtn')
?.addEventListener('click',()=>{

currentYear='All';
currentMonth='All';

document.getElementById('qcFilter').value='All';
document.getElementById('packingFilter').value='All';

updateDashboard(allData);

});

/* ==========================
   APPLY FILTERS
========================== */

function applyFilters(){

let filtered=[...allData];

const qc =
document.getElementById('qcFilter')?.value || 'All';

const packing =
document.getElementById('packingFilter')?.value || 'All';

/* YEAR */

if(currentYear!=='All'){

filtered=filtered.filter(x=>

String(x.Year).trim()===currentYear

);

}

/* MONTH */

if(currentMonth!=='All'){

filtered=filtered.filter(x=>

String(x.Month).trim()===currentMonth

);

}

/* QC */

if(qc!=='All'){

filtered=filtered.filter(x=>

x.QC_Name===qc

);

}

/* PACKING */

if(packing!=='All'){

filtered=filtered.filter(x=>

x.Inspection_By===packing

);

}

updateDashboard(filtered);

}

/* ==========================
   UPDATE DASHBOARD
========================== */

function updateDashboard(data){

const total = data.length;

const pass = data.filter(x=>
x.Inspection_Status==='Pass'
).length;

const reject = data.filter(x=>
x.Inspection_Status==='Reject'
).length;

const passRate = total ?
((pass/total)*100).toFixed(1) : 0;

const rejectRate = total ?
((reject/total)*100).toFixed(1) : 0;

/* KPI */

document.getElementById('totalDevices').innerText = total;
document.getElementById('totalPass').innerText = pass;
document.getElementById('totalReject').innerText = reject;
document.getElementById('passRate').innerText = passRate+'%';
document.getElementById('rejectRate').innerText = rejectRate+'%';

if(document.getElementById('sTotal'))
document.getElementById('sTotal').innerText = total;

if(document.getElementById('sPass'))
document.getElementById('sPass').innerText = pass;

if(document.getElementById('sReject'))
document.getElementById('sReject').innerText = reject;

if(document.getElementById('sPassRate'))
document.getElementById('sPassRate').innerText = passRate+'%';

if(document.getElementById('sRejectRate'))
document.getElementById('sRejectRate').innerText = rejectRate+'%';

/* ==========================
   REJECT TABLE
========================== */

const rejectedOnly = data.filter(x=>
x.Inspection_Status==='Reject'
);

let rows='';

/* كل الريجكت بدون limit */

rejectedOnly.forEach(r=>{

rows += `

<tr>
<td>${r.Job_Number||''}</td>
<td>${r.QC_Name||''}</td>
<td class="reject">${r.Inspection_Status||''}</td>
<td>${r.Date||''}</td>
<td>${r.Inspection_By||''}</td>
<td>${r.Category||''}</td>
</tr>

`;

});

document.getElementById('tableBody').innerHTML = rows;

/* ==========================
   DONUT
========================== */

if(pieChart) pieChart.destroy();

const donutCenter = {

id:'donutCenter',

afterDraw(chart){

const {ctx} = chart;
const meta = chart.getDatasetMeta(0);

if(!meta.data.length) return;

const x = meta.data[0].x;
const y = meta.data[0].y;

ctx.save();

ctx.textAlign='center';
ctx.textBaseline='middle';

/* PASS % */

ctx.font='bold 30px Segoe UI';
ctx.fillStyle='#ffffff';

ctx.fillText(
passRate+'%',
x,
y-18
);

/* PASS */

ctx.font='bold 15px Segoe UI';
ctx.fillStyle='#16d1ff';

ctx.fillText(
'PASS',
x,
y+10
);

/* REJECT */

ctx.font='bold 13px Segoe UI';
ctx.fillStyle='#ff2f67';

ctx.fillText(
rejectRate+'% Reject',
x,
y+34
);

ctx.restore();

}

};

pieChart = new Chart(

document.getElementById('pieChart'),

{

type:'doughnut',

data:{

labels:['Pass','Reject'],

datasets:[{

data:[pass,reject],

backgroundColor:[
'#16d1ff',
'#ff005d'
],

borderWidth:0,
radius:'72%'

}]

},

options:{

responsive:true,
maintainAspectRatio:false,
cutout:'68%',

plugins:{
legend:{display:false}
}

},

plugins:[donutCenter]

});

/* ==========================
   MONTHLY TREND
========================== */

const months={};

data.forEach(r=>{

const m=r.Month||'Unknown';

if(!months[m]) months[m]=0;

months[m]++;

});

if(monthlyChart) monthlyChart.destroy();

monthlyChart=new Chart(

document.getElementById('monthlyChart'),

{

type:'bar',

data:{

labels:Object.keys(months),

datasets:[{

data:Object.values(months),

backgroundColor:'#16d1ff',
borderRadius:6

}]

},

options:{

responsive:true,
maintainAspectRatio:false,

plugins:{

legend:{display:false},

datalabels:{

color:'#fff',

anchor:'end',

align:'top',

font:{
size:11,
weight:'bold'
}

}

},

scales:{

x:{
ticks:{color:'#fff'},
grid:{display:false}
},

y:{
ticks:{display:false},
grid:{display:false}
}

}

},

plugins:[ChartDataLabels]

});

/* ==========================
   REJECT CATEGORY
========================== */

const categories={};

rejectedOnly.forEach(r=>{

const c=r.Category||'Unknown';

if(!categories[c])
categories[c]=0;

categories[c]++;

});

if(categoryChart)
categoryChart.destroy();

categoryChart=new Chart(

document.getElementById('categoryChart'),

{

type:'bar',

data:{

labels:Object.keys(categories),

datasets:[{

data:Object.values(categories),

backgroundColor:'#ff005d',

borderRadius:6

}]

},

options:{

indexAxis:'y',

responsive:true,
maintainAspectRatio:false,

plugins:{

legend:{display:false},

datalabels:{

color:'#fff',

anchor:'end',

align:'right',

font:{
size:11,
weight:'bold'
}

}

},

scales:{

x:{
ticks:{display:false},
grid:{display:false}
},

y:{
ticks:{
color:'#fff',
font:{size:10}
},
grid:{display:false}
}

}

},

plugins:[ChartDataLabels]

});

}