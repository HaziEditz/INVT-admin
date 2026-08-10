/**
 * Driver Ops & Payment Summary — owner panel page.
 * Mark Paid locks driverSettlements/{cid}/{periodKey}/{driverId}.
 */
module.exports = function driverOpsSummaryPage(pageWrap, commonHead, commonScripts) {
  const css = `<style>
.rpt-panel{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;border:1px solid #e8e8e8}
.rpt-toolbar{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #f0f0f0;background:linear-gradient(135deg,#00695C 0%,#00897B 100%)}
.rpt-toolbar-title{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.rpt-toolbar-title .material-icons{color:rgba(255,255,255,.85);font-size:20px}
.rpt-toolbar-title h3{margin:0;font-size:15px;font-weight:600;color:#fff}
.rpt-toolbar-meta{font-size:11px;color:rgba(255,255,255,.65)}.rpt-toolbar-meta b{color:#fff}
.rpt-toolbar-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
.rpt-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:5px;border:none;font-size:12px;font-weight:600;cursor:pointer;height:32px}
.rpt-btn-white{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3)}
.rpt-btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}
.rpt-btn .material-icons{font-size:14px}
.rpt-filter-panel{background:#fafafa;border-bottom:1px solid #efefef;padding:12px 20px}
.rpt-filter-grid{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.rpt-fi{display:flex;flex-direction:column;gap:3px}
.rpt-fi label{font-size:10px;font-weight:700;color:#9e9e9e;text-transform:uppercase;letter-spacing:.5px}
.rpt-fi input,.rpt-fi select{padding:5px 10px;border:1px solid #e0e0e0;border-radius:5px;font-size:12px;height:32px;background:#fff}
.rpt-state-box{text-align:center;padding:52px 20px;color:#bdbdbd}
.rpt-spinner{display:inline-block;width:32px;height:32px;border:3px solid #e0e0e0;border-top-color:#00695C;border-radius:50%;animation:dos-spin .8s linear infinite;margin-bottom:12px}
@keyframes dos-spin{to{transform:rotate(360deg)}}
.dos-wrap{max-width:1280px;margin:0 auto}
.dos-hint{background:#E0F2F1;border:1px solid #B2DFDB;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#00695C;line-height:1.55}
.dos-hint b{color:#004D40}
.dos-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:14px 18px;border-bottom:1px solid #f0f0f0}
.dos-stat{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px 12px}
.dos-stat .v{font-size:20px;font-weight:800;color:#00695C;line-height:1.1}
.dos-stat .v.owed{color:#E65100}
.dos-stat .v.paid{color:#2E7D32}
.dos-stat .l{font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:.4px;margin-top:3px;font-weight:700}
.dos-tbl-wrap{overflow-x:auto;max-height:640px;overflow-y:auto}
.dos-tbl{width:100%;border-collapse:collapse;font-size:12px}
.dos-tbl thead th{position:sticky;top:0;z-index:2;background:#F8FAFF;color:#546e7a;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:9px 10px;border-bottom:2px solid #e3ecf7;white-space:nowrap;cursor:pointer}
.dos-tbl td{padding:9px 10px;border-bottom:1px solid #f5f5f5;vertical-align:middle;color:#333}
.dos-tbl tbody tr:hover{background:#F3F7FF}
.dos-money{font-weight:700;font-variant-numeric:tabular-nums}
.dos-owed{color:#E65100}.dos-cash{color:#546e7a}.dos-zero{color:#bdbdbd}
.dos-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px}
.dos-pill.open{background:#FFF3E0;color:#E65100}
.dos-pill.paid{background:#E8F5E9;color:#2E7D32}
.dos-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;color:#37474f}
.dos-btn:hover{border-color:#00695C;color:#00695C}
.dos-btn.primary{background:#00695C;color:#fff;border-color:#00695C}
.dos-btn.primary:hover{background:#004D40}
.dos-btn:disabled{opacity:.45;cursor:not-allowed}
.dos-ov{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:28px 16px}
.dos-ov.show{display:flex}
.dos-modal{background:#fff;border-radius:14px;width:720px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.22);margin:auto;overflow:hidden}
.dos-modal-h{padding:14px 18px;background:linear-gradient(135deg,#00695C,#00897B);color:#fff;display:flex;justify-content:space-between;align-items:center}
.dos-modal-h h3{margin:0;font-size:15px}
.dos-modal-b{padding:16px 18px}
.dos-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px}
.dos-kv .k{font-size:10px;font-weight:700;color:#9e9e9e;text-transform:uppercase}
.dos-kv .val{font-size:13px;font-weight:600;color:#212121}
.dos-note{font-size:11px;color:#78909c;margin-top:10px;line-height:1.5}
.dos-disp{margin-top:18px}
.dos-bank{font-size:11px;color:#546e7a;font-family:monospace}
</style>`;

  const body = `
<div class="dos-wrap">
  <div class="dos-hint">
    <b>What you owe drivers:</b> Cash stays with the driver (shown as “cash held”, not owed).
    Card / EFTPOS / TM / Account / Hoist land with the company — net after card commission is <b>unpaid</b> until you Mark as Paid for this period.
    Marking paid <b>locks</b> that driver’s period (like a TM batch) so it won’t keep growing into the next glance.
  </div>

  <div class="rpt-panel">
    <div class="rpt-toolbar">
      <div class="rpt-toolbar-title">
        <i class="material-icons">&#xE227;</i>
        <h3>Driver Ops &amp; Payment Summary</h3>
      </div>
      <div class="rpt-toolbar-meta">Period: <b id="dos-period-label">—</b></div>
      <div class="rpt-toolbar-actions">
        <button class="rpt-btn rpt-btn-white" onclick="dosLoad()"><i class="material-icons">&#xE5D5;</i> Refresh</button>
        <button class="rpt-btn rpt-btn-ghost" onclick="dosExportCsv()"><i class="material-icons">&#xE2C4;</i> CSV</button>
      </div>
    </div>

    <div class="rpt-filter-panel">
      <div class="rpt-filter-grid">
        <div class="rpt-fi">
          <label>Period</label>
          <select id="dos-mode" onchange="dosOnModeChange()">
            <option value="month" selected>Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div class="rpt-fi" id="dos-month-wrap">
          <label>Month</label>
          <input type="month" id="dos-month" onchange="dosLoad()"/>
        </div>
        <div class="rpt-fi" id="dos-day-wrap" style="display:none">
          <label>Date</label>
          <input type="date" id="dos-day" onchange="dosLoad()"/>
        </div>
        <div class="rpt-fi" id="dos-week-wrap" style="display:none">
          <label>Week of</label>
          <input type="date" id="dos-week" onchange="dosLoad()"/>
        </div>
        <div class="rpt-fi">
          <label>Driver</label>
          <select id="dos-driver-filter" onchange="dosRender()">
            <option value="">All drivers</option>
          </select>
        </div>
        <div class="rpt-fi">
          <label>Status</label>
          <select id="dos-status-filter" onchange="dosRender()">
            <option value="">All</option>
            <option value="open">Unpaid only</option>
            <option value="paid">Paid / locked</option>
          </select>
        </div>
      </div>
    </div>

    <div id="dos-loading" class="rpt-state-box"><div class="rpt-spinner"></div><p>Loading driver ops…</p></div>
    <div id="dos-empty" class="rpt-state-box" style="display:none"><i class="material-icons">&#xE8B6;</i><p>No driver activity in this period.</p></div>

    <div id="dos-main" style="display:none">
      <div class="dos-stats" id="dos-stats"></div>
      <div class="dos-tbl-wrap">
        <table class="dos-tbl">
          <thead>
            <tr>
              <th onclick="dosSort('driverName')">Driver</th>
              <th onclick="dosSort('workHours')">Hours</th>
              <th onclick="dosSort('jobs')">Jobs</th>
              <th>Vehicles</th>
              <th onclick="dosSort('cashHeld')">Cash held</th>
              <th onclick="dosSort('owedTotal')">Company owes</th>
              <th>Card</th>
              <th>EFTPOS</th>
              <th>TM</th>
              <th>Account</th>
              <th>Hoist</th>
              <th>Status</th>
              <th>Bank</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="dos-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="rpt-panel dos-disp">
    <div class="rpt-toolbar">
      <div class="rpt-toolbar-title">
        <i class="material-icons">&#xE0B7;</i>
        <h3>Dispatcher activity (same period)</h3>
      </div>
    </div>
    <div style="padding:12px 18px;font-size:12px;color:#607d8b;line-height:1.5">
      Shift <b>hours</b> for dispatchers are not stored historically (only live heartbeats). This list counts jobs that name a dispatcher in the period — best available today.
    </div>
    <div class="dos-tbl-wrap" style="max-height:280px">
      <table class="dos-tbl">
        <thead><tr><th>Dispatcher</th><th>Jobs handled</th><th>Completed</th><th>Cancelled</th></tr></thead>
        <tbody id="dos-disp-tbody"><tr><td colspan="4" style="color:#9e9e9e">Load a period to see activity.</td></tr></tbody>
      </table>
    </div>
  </div>
</div>

<div class="dos-ov" id="dos-detail-ov" onclick="if(event.target===this)dosCloseDetail()">
  <div class="dos-modal">
    <div class="dos-modal-h">
      <h3 id="dos-detail-title">Driver detail</h3>
      <button class="rpt-btn rpt-btn-ghost" onclick="dosCloseDetail()">Close</button>
    </div>
    <div class="dos-modal-b" id="dos-detail-body"></div>
  </div>
</div>
`;

  // Must wrap in <script> — commonScripts appends extraJs after a closed </script>.
  const js = `
<script>
var _dosRows = [];
var _dosDisp = [];
var _dosPeriod = null;
var _dosSortKey = 'owedTotal';
var _dosSortDir = -1;
var _dosCardSettings = {};
var _dosDriversMeta = {};

function dosEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function dosMoney(n){
  n = Math.round((parseFloat(n)||0)*100)/100;
  return '$' + n.toFixed(2);
}
function dosClassifyPm(pm){
  var s = String(pm||'').toLowerCase().replace(/[\\s_-]/g,'');
  if(!s) return 'other';
  if(s.indexOf('cash')>=0) return 'cash';
  if(s.indexOf('mobility')>=0||s==='tm'||s.indexOf('totalmobility')>=0) return 'tm';
  if(s.indexOf('account')>=0||s==='acc'||s.indexOf('business')>=0||s.indexOf('corporate')>=0) return 'account';
  if(s.indexOf('eftpos')>=0) return 'eftpos';
  if(s.indexOf('card')>=0||s.indexOf('stripe')>=0||s.indexOf('visa')>=0||s.indexOf('master')>=0||s.indexOf('amex')>=0||s.indexOf('debit')>=0||s.indexOf('credit')>=0) return 'card';
  return 'other';
}
function dosOwes(fareNum, pm, cs){
  var gross = Math.max(0, parseFloat(fareNum)||0);
  var bucket = dosClassifyPm(pm);
  if(gross<=0) return {bucket:bucket,gross:0,owed:0};
  if(bucket==='cash') return {bucket:bucket,gross:gross,owed:0};
  if(bucket==='card'||bucket==='eftpos'){
    var comp = parseFloat(cs.companyPercent)||0;
    var drv = parseFloat(cs.driverPercent)||0;
    var owed = Math.max(0, gross - (gross*comp)/100 - (gross*drv)/100);
    return {bucket:bucket,gross:gross,owed:owed};
  }
  return {bucket:bucket,gross:gross,owed:gross};
}
function dosOutcome(st){
  var s = String(st||'').toLowerCase().replace(/[\\s_-]/g,'');
  if(s.indexOf('complete')>=0||s==='closed'||s==='done'||s==='finished') return 'completed';
  if(s.indexOf('cancel')>=0) return 'cancelled';
  if(s.indexOf('reject')>=0||s.indexOf('declin')>=0) return 'rejected';
  if(s.indexOf('noshow')>=0||s==='ns') return 'no_show';
  return 'other';
}
function dosSource(job){
  var raw = String(job.source||job.bookingSource||job.BookingSource||job.Source||job.via||'').toLowerCase();
  var svc = String(job.serviceType||job.ServiceType||job.bookingType||job.Bookingtype||'').toLowerCase();
  if(svc.indexOf('food')>=0||raw.indexOf('food')>=0) return 'food';
  if(svc.indexOf('freight')>=0||raw.indexOf('freight')>=0||raw.indexOf('parcel')>=0) return 'freight';
  if(raw.indexOf('passenger')>=0||raw.indexOf('app')>=0) return 'passenger_app';
  if(raw.indexOf('web')>=0||raw.indexOf('website')>=0) return 'website';
  if(raw.indexOf('dispatch')>=0||raw.indexOf('console')>=0) return 'dispatch';
  return raw ? 'other' : 'unknown';
}
function dosParseTs(v){
  if(v==null||v==='') return 0;
  if(typeof v==='number') return v < 1e12 ? v*1000 : v;
  var n = Date.parse(String(v));
  return isNaN(n) ? 0 : n;
}
function dosJobTs(job){
  return dosParseTs(job.completedAt||job.CompletedAt||job.endTime||job.EndTime||job.finishTime||
    job.timestamp||job.Timestamp||job.createdAt||job.CreatedAt||job.jobDate||job.JobDate||job.dateTime||job.DateTime);
}
function dosPeriodBounds(mode, refMs){
  var d = new Date(refMs);
  var y=d.getFullYear(), m=d.getMonth(), day=d.getDate();
  function sod(yy,mm,dd){ return new Date(yy,mm,dd,0,0,0,0).getTime(); }
  function eod(yy,mm,dd){ return new Date(yy,mm,dd,23,59,59,999).getTime(); }
  if(mode==='day'){
    return {mode:'day',fromMs:sod(y,m,day),toMs:eod(y,m,day),key:y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0'),
      label:d.toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short',year:'numeric'})};
  }
  if(mode==='week'){
    var dow=(d.getDay()+6)%7;
    var mon=new Date(y,m,day-dow);
    var sun=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+6);
    return {mode:'week',fromMs:sod(mon.getFullYear(),mon.getMonth(),mon.getDate()),toMs:eod(sun.getFullYear(),sun.getMonth(),sun.getDate()),
      key:'W'+mon.getFullYear()+'-'+String(mon.getMonth()+1).padStart(2,'0')+'-'+String(mon.getDate()).padStart(2,'0'),
      label:mon.toLocaleDateString('en-NZ',{day:'numeric',month:'short'})+' – '+sun.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})};
  }
  var last=new Date(y,m+1,0).getDate();
  return {mode:'month',fromMs:sod(y,m,1),toMs:eod(y,m,last),key:y+'-'+String(m+1).padStart(2,'0'),
    label:d.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})};
}
function dosEmptyPay(){
  return {cash:{gross:0,owed:0,count:0},card:{gross:0,owed:0,count:0},eftpos:{gross:0,owed:0,count:0},
    tm:{gross:0,owed:0,count:0},hoist:{gross:0,owed:0,count:0,uses:0},account:{gross:0,owed:0,count:0},other:{gross:0,owed:0,count:0}};
}
function dosBuildRow(opts){
  var jobs=opts.jobs||[], cs=opts.cardSettings||{}, settlement=opts.settlement||null;
  var pay=dosEmptyPay();
  var outcomes={completed:0,cancelled:0,rejected:0,no_show:0,other:0,total:0};
  var sources={dispatch:0,passenger_app:0,website:0,food:0,freight:0,other:0,unknown:0};
  var vehicles={};
  jobs.forEach(function(job){
    var outcome=dosOutcome(job.jobstatus||job.JobStatus||job.status||job.Status||'');
    outcomes[outcome]=(outcomes[outcome]||0)+1; outcomes.total++;
    var src=dosSource(job); sources[src]=(sources[src]||0)+1;
    var veh=String(job.vehicleId||job.VehicleId||job.taxiNumber||job.TaxiNumber||'').trim();
    if(veh) vehicles[veh]=(vehicles[veh]||0)+1;
    if(outcome!=='completed') return;
    var fare=parseFloat(job.TotalFare||job.totalFare||job.Fare||job.fare||job.RideCost||job.EstimatedFare||0);
    var pm=job.PaymentType||job.paymentType||job.PaymentMethod||job.paymentMethod||'';
    var main=dosOwes(fare, pm, cs);
    pay[main.bucket].gross+=main.gross; pay[main.bucket].owed+=main.owed; pay[main.bucket].count++;
    var hoistAmt=parseFloat(job.tmSubsidyHoist||job.hoistFare||job.HoistFare||job.hoistAmount||0);
    var hoistUses=parseInt(job.hoistUses||job.HoistUses||job.hoistCount||0,10)||0;
    if(hoistAmt>0||hoistUses>0){
      pay.hoist.gross+=hoistAmt; pay.hoist.owed+=hoistAmt; pay.hoist.count++;
      pay.hoist.uses=(pay.hoist.uses||0)+hoistUses;
    }
  });
  var owed=pay.card.owed+pay.eftpos.owed+pay.tm.owed+pay.hoist.owed+pay.account.owed+pay.other.owed;
  var locked=!!(settlement&&(settlement.locked||settlement.status==='paid'));
  return {
    driverId:String(opts.driverId||''),
    driverName:String(opts.driverName||opts.driverId||'Driver'),
    workMinutes:Math.max(0,opts.workMinutes|0),
    breakMinutes:Math.max(0,opts.breakMinutes|0),
    workHours:Math.round((Math.max(0,opts.workMinutes)/60)*10)/10,
    outcomes:outcomes, sources:sources, vehicles:Object.keys(vehicles).sort(),
    pay:pay, cashHeld:pay.cash.gross,
    owedTotal:locked?0:Math.round(owed*100)/100,
    owedBeforeLock:Math.round(owed*100)/100,
    status:locked?'paid':'open', locked:locked, settlement:settlement,
    bankName:(opts.bankName||''), accountName:(opts.accountName||''), accountNumber:(opts.accountNumber||''),
    jobs:jobs
  };
}

function dosOnModeChange(){
  var mode=document.getElementById('dos-mode').value;
  document.getElementById('dos-month-wrap').style.display=mode==='month'?'':'none';
  document.getElementById('dos-day-wrap').style.display=mode==='day'?'':'none';
  document.getElementById('dos-week-wrap').style.display=mode==='week'?'':'none';
  dosLoad();
}
function dosInitDates(){
  var now=new Date();
  var ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var yd=ym+'-'+String(now.getDate()).padStart(2,'0');
  var mEl=document.getElementById('dos-month'); if(mEl&&!mEl.value) mEl.value=ym;
  var dEl=document.getElementById('dos-day'); if(dEl&&!dEl.value) dEl.value=yd;
  var wEl=document.getElementById('dos-week'); if(wEl&&!wEl.value) wEl.value=yd;
}
function dosCurrentPeriod(){
  var mode=document.getElementById('dos-mode').value||'month';
  var ref=Date.now();
  if(mode==='month'){
    var mv=document.getElementById('dos-month').value;
    if(mv){ var p=mv.split('-'); ref=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,15).getTime(); }
  } else if(mode==='day'){
    var dv=document.getElementById('dos-day').value;
    if(dv) ref=new Date(dv+'T12:00:00').getTime();
  } else {
    var wv=document.getElementById('dos-week').value;
    if(wv) ref=new Date(wv+'T12:00:00').getTime();
  }
  return dosPeriodBounds(mode, ref);
}
function dosFlattenJobs(merged){
  var out=[];
  if(!merged||typeof merged!=='object') return out;
  Object.keys(merged).forEach(function(bid){
    var drivers=merged[bid];
    if(!drivers||typeof drivers!=='object') return;
    Object.keys(drivers).forEach(function(did){
      var j=drivers[did];
      if(!j||typeof j!=='object') return;
      var copy=Object.assign({},j);
      copy.bookingId=copy.bookingId||copy.BookingId||bid;
      copy.driverId=String(copy.driverId||copy.DriverId||copy.driverid||did||'').trim();
      // Nested joback keys can be booking ids when structure is weird — drop those.
      if(!copy.driverId || copy.driverId===bid || copy.driverId===String(copy.bookingId||'')) return;
      out.push(copy);
    });
  });
  return out;
}
function dosMergeJobSources(results){
  var merged={};
  function addNested(data){
    if(!data||typeof data!=='object') return;
    Object.keys(data).forEach(function(bid){
      if(!merged[bid]) merged[bid]={};
      var drivers=data[bid];
      if(drivers&&typeof drivers==='object') Object.assign(merged[bid], drivers);
    });
  }
  function addFlat(data){
    if(!data||typeof data!=='object') return;
    Object.keys(data).forEach(function(bid){
      var job=data[bid];
      if(!job||typeof job!=='object') return;
      // Never fall back to bookingId — that created phantom "driver" rows (869…).
      var did=String(job.driverId||job.DriverId||job.driverid||'').trim();
      if(!did) return;
      if(!merged[bid]) merged[bid]={};
      if(!merged[bid][did]) merged[bid][did]={};
      Object.assign(merged[bid][did], job);
    });
  }
  addNested(results[0]);
  addFlat(results[1]); addFlat(results[2]);
  if(results[3]&&typeof results[3]==='object'){
    Object.keys(results[3]).forEach(function(bid){
      var job=results[3][bid];
      if(!job||typeof job!=='object') return;
      if(!merged[bid]) merged[bid]={};
      var vals=Object.values(job);
      var isFlat=vals.length>0&&vals.every(function(v){return v===null||typeof v!=='object';});
      if(isFlat){
        var did=String(job.driverId||job.DriverId||job.driverid||'').trim();
        if(!did) return;
        if(!merged[bid][did]) merged[bid][did]={};
        Object.assign(merged[bid][did], job);
      } else {
        Object.keys(job).forEach(function(did){
          var j=job[did];
          if(!j||typeof j!=='object') return;
          if(!merged[bid][did]) merged[bid][did]={};
          Object.assign(merged[bid][did], j);
        });
      }
    });
  }
  return merged;
}
function dosShiftMinutes(shiftData, fromMs, toMs){
  var byDriver={};
  if(!shiftData||typeof shiftData!=='object') return byDriver;
  Object.keys(shiftData).forEach(function(driverId){
    var shifts=shiftData[driverId];
    if(!shifts||typeof shifts!=='object') return;
    var work=0, brk=0;
    Object.keys(shifts).forEach(function(sid){
      var s=shifts[sid];
      if(!s||typeof s!=='object') return;
      var st=dosParseTs(s.startTime||s.loginTime||s.start);
      var en=dosParseTs(s.endTime||s.logoutTime||s.end||s.finishTime);
      if(!st) return;
      if(en && en < fromMs) return;
      if(st > toMs) return;
      var clipStart=Math.max(st, fromMs);
      var clipEnd=en ? Math.min(en, toMs) : Math.min(Date.now(), toMs);
      if(clipEnd<=clipStart) return;
      work += Math.round((clipEnd-clipStart)/60000);
      brk += parseInt(s.breakMinutes||s.breakMin||s.totalBreakMinutes||0,10)||0;
      if(Array.isArray(s.breaks)){
        s.breaks.forEach(function(b){
          var bs=dosParseTs(b.start||b.startTime);
          var be=dosParseTs(b.end||b.endTime);
          if(bs&&be&&be>bs) brk += Math.round((be-bs)/60000);
        });
      }
    });
    byDriver[driverId]={workMinutes:work, breakMinutes:brk};
  });
  return byDriver;
}

function dosLoad(){
  dosInitDates();
  _dosPeriod=dosCurrentPeriod();
  document.getElementById('dos-period-label').textContent=_dosPeriod.label;
  document.getElementById('dos-loading').style.display='';
  document.getElementById('dos-main').style.display='none';
  document.getElementById('dos-empty').style.display='none';
  var cid=window.COMPANY_ID||'';
  Promise.all([
    (typeof window.loadCardSettings==='function'?window.loadCardSettings():Promise.resolve({})).catch(function(){return {};}),
    window.adminRead('drivers').catch(function(){return null;}),
    window.adminRead('drivers/'+cid).catch(function(){return null;}),
    window.adminRead('joback',{limitToLast:800}).catch(function(){return null;}),
    window.adminRead('completedJobs/'+cid).catch(function(){return null;}),
    window.adminRead('closedJobs/'+cid).catch(function(){return null;}),
    window.adminRead('allbookings/'+cid).catch(function(){return null;}),
    window.adminRead('shiftLogs/'+cid).catch(function(){return null;}),
    window.adminRead('driverSettlements/'+cid+'/'+_dosPeriod.key).catch(function(){return null;})
  ]).then(function(res){
    _dosCardSettings=res[0]||window._cardSettingsCache||{};
    _dosDriversMeta={};
    function ingestDrivers(d){
      if(!d||typeof d!=='object') return;
      Object.keys(d).forEach(function(k){
        var v=d[k];
        if(!v||typeof v!=='object') return;
        if(/^\\d+$/.test(k) && !v.name && !v.email) return;
        var id=String(v.id||v.driverId||v.dispatcherId||k);
        var name=[v.firstName||'',v.lastName||'',v.name||''].join(' ').trim()||v.dispatcherId||id;
        var meta={name:name,bankName:v.bankName||'',accountName:v.accountName||'',accountNumber:v.accountNumber||'',
          pushKey:k, numericId:String(v.id||v.driverId||'')};
        _dosDriversMeta[id]=meta;
        if(v.dispatcherId) _dosDriversMeta[String(v.dispatcherId)]=meta;
        if(v.id) _dosDriversMeta[String(v.id)]=meta;
        _dosDriversMeta[k]=meta;
      });
    }
    ingestDrivers(res[1]); ingestDrivers(res[2]);

    var merged=dosMergeJobSources([res[3],res[4],res[5],res[6]]);
    var allJobs=dosFlattenJobs(merged).filter(function(j){
      var ts=dosJobTs(j);
      if(!ts) return false;
      return ts>=_dosPeriod.fromMs && ts<=_dosPeriod.toMs;
    });

    var shiftMins=dosShiftMinutes(res[7], _dosPeriod.fromMs, _dosPeriod.toMs);
    var settlements=res[8]||{};

    var byDriver={};
    allJobs.forEach(function(j){
      var did=String(j.driverId||'');
      if(!did) return;
      if(!byDriver[did]) byDriver[did]=[];
      byDriver[did].push(j);
    });
    Object.keys(shiftMins).forEach(function(did){
      if(!byDriver[did]) byDriver[did]=[];
    });

    var dispMap={};
    allJobs.forEach(function(j){
      var dn=String(j.DispatcherName||j.dispatcherName||j.dispatcher||j.bookedBy||'').trim();
      if(!dn||dn==='—'||dn==='-') return;
      if(!dispMap[dn]) dispMap[dn]={name:dn,total:0,completed:0,cancelled:0};
      dispMap[dn].total++;
      var o=dosOutcome(j.jobstatus||j.JobStatus||j.status||'');
      if(o==='completed') dispMap[dn].completed++;
      if(o==='cancelled') dispMap[dn].cancelled++;
    });
    _dosDisp=Object.keys(dispMap).map(function(k){return dispMap[k];}).sort(function(a,b){return b.total-a.total;});

    _dosRows=Object.keys(byDriver).map(function(did){
      var meta=_dosDriversMeta[did]||{};
      var sm=shiftMins[did]||{workMinutes:0,breakMinutes:0};
      var settle=settlements[did]||null;
      // Also try push-key settlement if driver id differs
      if(!settle && meta.pushKey) settle=settlements[meta.pushKey]||null;
      return dosBuildRow({
        driverId:did,
        driverName:meta.name||(_dosDriversMeta[did]&&_dosDriversMeta[did].name)||did,
        jobs:byDriver[did],
        workMinutes:sm.workMinutes,
        breakMinutes:sm.breakMinutes,
        cardSettings:_dosCardSettings,
        settlement:settle,
        bankName:meta.bankName, accountName:meta.accountName, accountNumber:meta.accountNumber
      });
    }).filter(function(r){
      if(!(r.outcomes.total>0 || r.workMinutes>0 || r.owedBeforeLock>0)) return false;
      // Drop phantom booking-id rows with no profile and no paid activity.
      var meta=_dosDriversMeta[r.driverId];
      var looksLikeBooking=/^869\\d{6,}$/.test(r.driverId) || (/^\\d{10,}$/.test(r.driverId) && !meta);
      if(looksLikeBooking && !meta && r.workMinutes===0 && r.owedBeforeLock===0 && r.outcomes.completed===0) return false;
      return true;
    });

    var sel=document.getElementById('dos-driver-filter');
    var prev=sel.value;
    sel.innerHTML='<option value="">All drivers</option>'+_dosRows.slice().sort(function(a,b){
      return a.driverName.localeCompare(b.driverName);
    }).map(function(r){
      return '<option value="'+dosEsc(r.driverId)+'">'+dosEsc(r.driverName)+'</option>';
    }).join('');
    if(prev) sel.value=prev;

    document.getElementById('dos-loading').style.display='none';
    if(!_dosRows.length){
      document.getElementById('dos-empty').style.display='';
      dosRenderDisp();
      return;
    }
    document.getElementById('dos-main').style.display='';
    dosRender();
  }).catch(function(e){
    document.getElementById('dos-loading').style.display='none';
    document.getElementById('dos-empty').style.display='';
    document.getElementById('dos-empty').innerHTML='<p>Failed to load: '+dosEsc(e&&e.message||e)+'</p>';
  });
}

function dosSort(key){
  if(_dosSortKey===key) _dosSortDir*=-1; else { _dosSortKey=key; _dosSortDir=-1; }
  dosRender();
}
function dosFiltered(){
  var df=document.getElementById('dos-driver-filter').value;
  var sf=document.getElementById('dos-status-filter').value;
  return _dosRows.filter(function(r){
    if(df && r.driverId!==df) return false;
    if(sf && r.status!==sf) return false;
    return true;
  }).slice().sort(function(a,b){
    var av=a[_dosSortKey], bv=b[_dosSortKey];
    if(_dosSortKey==='jobs'){ av=a.outcomes.total; bv=b.outcomes.total; }
    if(typeof av==='string') return av.localeCompare(bv)*_dosSortDir;
    return ((av||0)-(bv||0))*_dosSortDir;
  });
}
function dosRender(){
  var rows=dosFiltered();
  var unpaid=0, paidN=0, cash=0, jobs=0, hours=0;
  rows.forEach(function(r){
    unpaid+=r.owedTotal; cash+=r.cashHeld; jobs+=r.outcomes.total; hours+=r.workHours;
    if(r.status==='paid') paidN++;
  });
  document.getElementById('dos-stats').innerHTML=
    '<div class="dos-stat"><div class="v">'+rows.length+'</div><div class="l">Drivers</div></div>'+
    '<div class="dos-stat"><div class="v owed">'+dosMoney(unpaid)+'</div><div class="l">Total unpaid</div></div>'+
    '<div class="dos-stat"><div class="v cash">'+dosMoney(cash)+'</div><div class="l">Cash held by drivers</div></div>'+
    '<div class="dos-stat"><div class="v paid">'+paidN+'</div><div class="l">Paid / locked</div></div>'+
    '<div class="dos-stat"><div class="v">'+jobs+'</div><div class="l">Jobs</div></div>'+
    '<div class="dos-stat"><div class="v">'+hours.toFixed(1)+'h</div><div class="l">Hours worked</div></div>';

  document.getElementById('dos-tbody').innerHTML=rows.map(function(r){
    var bank=r.accountNumber
      ? '<span class="dos-bank" title="'+dosEsc((r.bankName||'')+' / '+(r.accountName||''))+'">'+dosEsc(r.accountNumber)+'</span>'
      : '<span class="dos-zero">—</span>';
    var markBtn=r.locked
      ? '<button class="dos-btn" disabled title="Period locked">Paid</button>'
      : '<button class="dos-btn primary" onclick="dosMarkPaid(\\''+dosEsc(r.driverId)+'\\')">Mark Paid</button>';
    return '<tr>'+
      '<td><b>'+dosEsc(r.driverName)+'</b><div style="font-size:10px;color:#90a4ae">'+dosEsc(r.driverId)+'</div></td>'+
      '<td>'+r.workHours+'h <span style="color:#90a4ae;font-size:10px">('+r.breakMinutes+'m brk)</span></td>'+
      '<td title="C/Canc/Rej/NS">'+r.outcomes.completed+'/'+r.outcomes.cancelled+'/'+r.outcomes.rejected+'/'+r.outcomes.no_show+
        ' <span style="color:#90a4ae">('+r.outcomes.total+')</span></td>'+
      '<td>'+dosEsc(r.vehicles.join(', ')||'—')+'</td>'+
      '<td class="dos-money dos-cash">'+(r.cashHeld?dosMoney(r.cashHeld):'<span class="dos-zero">$0</span>')+'</td>'+
      '<td class="dos-money '+(r.owedTotal?'dos-owed':'dos-zero')+'">'+dosMoney(r.owedTotal)+
        (r.locked?' <span style="font-size:10px;color:#2E7D32">('+dosMoney(r.owedBeforeLock)+' locked)</span>':'')+'</td>'+
      '<td class="dos-money">'+dosMoney(r.pay.card.owed)+'</td>'+
      '<td class="dos-money">'+dosMoney(r.pay.eftpos.owed)+'</td>'+
      '<td class="dos-money">'+dosMoney(r.pay.tm.owed)+'</td>'+
      '<td class="dos-money">'+dosMoney(r.pay.account.owed)+'</td>'+
      '<td class="dos-money">'+dosMoney(r.pay.hoist.owed)+(r.pay.hoist.uses?' <span style="font-size:10px;color:#90a4ae">×'+r.pay.hoist.uses+'</span>':'')+'</td>'+
      '<td><span class="dos-pill '+r.status+'">'+(r.status==='paid'?'Paid':'Unpaid')+'</span></td>'+
      '<td>'+bank+'</td>'+
      '<td style="white-space:nowrap"><button class="dos-btn" onclick="dosOpenDetail(\\''+dosEsc(r.driverId)+'\\')">Detail</button> '+markBtn+'</td>'+
    '</tr>';
  }).join('');
  dosRenderDisp();
}
function dosRenderDisp(){
  var tb=document.getElementById('dos-disp-tbody');
  if(!_dosDisp.length){
    tb.innerHTML='<tr><td colspan="4" style="color:#9e9e9e">No dispatcher names found on jobs in this period.</td></tr>';
    return;
  }
  tb.innerHTML=_dosDisp.map(function(d){
    return '<tr><td>'+dosEsc(d.name)+'</td><td><b>'+d.total+'</b></td><td>'+d.completed+'</td><td>'+d.cancelled+'</td></tr>';
  }).join('');
}
function dosOpenDetail(driverId){
  var r=_dosRows.find(function(x){return x.driverId===driverId;});
  if(!r) return;
  document.getElementById('dos-detail-title').textContent=r.driverName+' — '+(_dosPeriod&&_dosPeriod.label||'');
  var srcBits=Object.keys(r.sources).filter(function(k){return r.sources[k];}).map(function(k){return k.replace(/_/g,' ')+': '+r.sources[k];}).join(' · ');
  var html='<div class="dos-kv">'+
    '<div><div class="k">Hours / breaks</div><div class="val">'+r.workHours+'h / '+r.breakMinutes+'m</div></div>'+
    '<div><div class="k">Company owes</div><div class="val" style="color:#E65100">'+dosMoney(r.owedTotal)+'</div></div>'+
    '<div><div class="k">Cash held</div><div class="val">'+dosMoney(r.cashHeld)+'</div></div>'+
    '<div><div class="k">Status</div><div class="val">'+(r.locked?'Paid & locked':'Open / unpaid')+'</div></div>'+
    '<div><div class="k">Jobs</div><div class="val">'+r.outcomes.completed+' completed · '+r.outcomes.cancelled+' cancelled · '+r.outcomes.rejected+' rejected · '+r.outcomes.no_show+' no-show</div></div>'+
    '<div><div class="k">Sources</div><div class="val">'+dosEsc(srcBits||'—')+'</div></div>'+
    '<div><div class="k">Vehicles</div><div class="val">'+dosEsc(r.vehicles.join(', ')||'—')+'</div></div>'+
    '<div><div class="k">Bank</div><div class="val dos-bank">'+dosEsc([r.bankName,r.accountName,r.accountNumber].filter(Boolean).join(' · ')||'Not on file — add on driver profile')+'</div></div>'+
  '</div>';
  html+='<table class="dos-tbl"><thead><tr><th>When</th><th>Booking</th><th>Pay</th><th>Fare</th><th>Owed</th><th>Status</th><th>Source</th></tr></thead><tbody>';
  var list=(r.jobs||[]).slice().sort(function(a,b){return dosJobTs(b)-dosJobTs(a);}).slice(0,80);
  list.forEach(function(j){
    var fare=parseFloat(j.TotalFare||j.totalFare||j.Fare||j.fare||0);
    var pm=j.PaymentType||j.paymentType||j.PaymentMethod||'';
    var o=dosOwes(fare,pm,_dosCardSettings);
    var ts=dosJobTs(j);
    html+='<tr><td>'+(ts?new Date(ts).toLocaleString('en-NZ'):'—')+'</td>'+
      '<td>'+dosEsc(j.bookingId||'')+'</td><td>'+dosEsc(pm||'—')+'</td>'+
      '<td class="dos-money">'+dosMoney(fare)+'</td><td class="dos-money">'+(dosOutcome(j.jobstatus||j.status)==='completed'?dosMoney(o.owed):'—')+'</td>'+
      '<td>'+dosEsc(j.jobstatus||j.status||'')+'</td><td>'+dosEsc(dosSource(j))+'</td></tr>';
  });
  html+='</tbody></table>';
  if((r.jobs||[]).length>80) html+='<div class="dos-note">Showing latest 80 of '+r.jobs.length+' jobs.</div>';
  document.getElementById('dos-detail-body').innerHTML=html;
  document.getElementById('dos-detail-ov').classList.add('show');
}
function dosCloseDetail(){ document.getElementById('dos-detail-ov').classList.remove('show'); }

function dosMarkPaid(driverId){
  var r=_dosRows.find(function(x){return x.driverId===driverId;});
  if(!r||r.locked) return;
  var amt=r.owedBeforeLock;
  if(!confirm('Mark '+r.driverName+' as PAID for '+(_dosPeriod&&_dosPeriod.label)+'?\\n\\nAmount: '+dosMoney(amt)+'\\nThis locks the period for this driver.')) return;
  var cid=window.COMPANY_ID||'';
  var path='driverSettlements/'+cid+'/'+_dosPeriod.key+'/'+driverId;
  var payload={
    status:'paid', locked:true, amountPaid:amt,
    periodKey:_dosPeriod.key, periodLabel:_dosPeriod.label,
    fromMs:_dosPeriod.fromMs, toMs:_dosPeriod.toMs,
    driverId:driverId, driverName:r.driverName,
    cashHeld:r.cashHeld, pay:r.pay,
    paidAt:Date.now(), paidBy:(window.OWNER_EMAIL||window.ADMIN_EMAIL||'owner')
  };
  window.adminWrite(path,'PUT',payload).then(function(){
    r.settlement=payload; r.locked=true; r.status='paid'; r.owedTotal=0;
    dosRender();
  }).catch(function(e){ alert('Could not mark paid: '+(e&&e.message||e)); });
}

function dosExportCsv(){
  var rows=dosFiltered();
  var headers=['Driver','DriverId','Period','Hours','BreakMin','JobsTotal','Completed','Cancelled','Rejected','NoShow','Vehicles','CashHeld','Owed','CardOwed','EftposOwed','TmOwed','AccountOwed','HoistOwed','Status','BankName','AccountName','AccountNumber'];
  var lines=[headers.join(',')];
  rows.forEach(function(r){
    function q(v){ v=String(v==null?'':v); if(/[",\\n]/.test(v)) return '"'+v.replace(/"/g,'""')+'"'; return v; }
    lines.push([
      r.driverName,r.driverId,_dosPeriod&&_dosPeriod.label,r.workHours,r.breakMinutes,
      r.outcomes.total,r.outcomes.completed,r.outcomes.cancelled,r.outcomes.rejected,r.outcomes.no_show,
      r.vehicles.join(' '),r.cashHeld.toFixed(2),r.owedTotal.toFixed(2),
      r.pay.card.owed.toFixed(2),r.pay.eftpos.owed.toFixed(2),r.pay.tm.owed.toFixed(2),
      r.pay.account.owed.toFixed(2),r.pay.hoist.owed.toFixed(2),r.status,
      r.bankName,r.accountName,r.accountNumber
    ].map(q).join(','));
  });
  var blob=new Blob([lines.join('\\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='driver-ops-'+(_dosPeriod&&_dosPeriod.key||'export')+'.csv';
  a.click();
}

dosInitDates();
dosLoad();
<\/script>
`;

  return pageWrap(commonHead('Driver Ops & Payment Summary', css), body, commonScripts(js));
};
