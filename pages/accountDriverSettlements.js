/**
 * Account/ACC driver unpaid tracker (Track B).
 * Mark Paid locks accountDriverSettlements/{cid}/{periodKey}/{driverId}.
 * Isolated from BookaWaka driverSettlements (Card/TM/Hoist).
 */
module.exports = function accountDriverSettlementsPage(pageWrap, commonHead, commonScripts) {
  const css = `<style>
.ads-wrap{max-width:1400px;margin:0 auto}
.rpt-panel{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;border:1px solid #e8e8e8}
.rpt-toolbar{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #f0f0f0;background:linear-gradient(135deg,#1565C0 0%,#1E88E5 100%)}
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
.rpt-spinner{display:inline-block;width:32px;height:32px;border:3px solid #e0e0e0;border-top-color:#1565C0;border-radius:50%;animation:ads-spin .8s linear infinite;margin-bottom:12px}
@keyframes ads-spin{to{transform:rotate(360deg)}}
.ads-hint{background:#E3F2FD;border:1px solid #90CAF9;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1565C0;line-height:1.55}
.ads-hint b{color:#0D47A1}
.ads-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:14px 18px;border-bottom:1px solid #f0f0f0}
.ads-stat{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px 12px}
.ads-stat .v{font-size:20px;font-weight:800;color:#1565C0;line-height:1.1}
.ads-stat .v.owed{color:#E65100}.ads-stat .v.paid{color:#2E7D32}
.ads-stat .l{font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:.4px;margin-top:3px;font-weight:700}
.ads-tbl-wrap{overflow-x:auto;max-height:640px;overflow-y:auto}
.ads-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:980px}
.ads-tbl thead th{position:sticky;top:0;z-index:2;background:#F8FAFF;color:#546e7a;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:9px 8px;border-bottom:2px solid #e3ecf7;white-space:nowrap;cursor:pointer}
.ads-tbl td{padding:8px;border-bottom:1px solid #f5f5f5;vertical-align:middle;color:#333}
.ads-tbl tbody tr:hover{background:#F3F7FF}
.ads-money{font-weight:700;font-variant-numeric:tabular-nums}
.ads-owed{color:#E65100}.ads-zero{color:#bdbdbd}
.ads-sub{font-size:10px;color:#90a4ae;margin-top:2px;font-weight:500}
.ads-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px}
.ads-pill.open{background:#FFF3E0;color:#E65100}.ads-pill.paid{background:#E8F5E9;color:#2E7D32}
.ads-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;color:#37474f}
.ads-btn:hover{border-color:#1565C0;color:#1565C0}
.ads-btn.primary{background:#1565C0;color:#fff;border-color:#1565C0}
.ads-btn.primary:hover{background:#0D47A1}
.ads-btn:disabled{opacity:.45;cursor:not-allowed}
.ads-bank{font-size:11px;color:#546e7a;font-family:monospace}
.ads-ov{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:28px 16px}
.ads-ov.show{display:flex}
.ads-modal{background:#fff;border-radius:14px;width:780px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.22);margin:auto;overflow:hidden}
.ads-modal-h{padding:14px 18px;background:linear-gradient(135deg,#1565C0,#1E88E5);color:#fff;display:flex;justify-content:space-between;align-items:center}
.ads-modal-h h3{margin:0;font-size:15px}
.ads-modal-b{padding:16px 18px}
.ads-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px}
.ads-kv .k{font-size:10px;font-weight:700;color:#9e9e9e;text-transform:uppercase}
.ads-kv .val{font-size:13px;font-weight:600;color:#212121}
.ads-note{font-size:11px;color:#78909c;margin-top:10px;line-height:1.5}
</style>`;

  const body = `
<div class="ads-wrap">
  <div class="ads-hint">
    <b>Account / ACC driver payouts:</b> When jobs are paid on Account or ACC, the company collects from the client later and pays the driver the full fare.
    Use this page to track unpaid driver amounts for a period and <b>Mark Paid</b> when you have transferred them.
    This ledger is <b>separate</b> from BookaWaka Driver Ops (Card / TM / Hoist) and does not change that Mark Paid math.
  </div>

  <div class="rpt-panel">
    <div class="rpt-toolbar">
      <div class="rpt-toolbar-title">
        <i class="material-icons">&#xE8A1;</i>
        <h3>Account / ACC Driver Settlements</h3>
      </div>
      <div class="rpt-toolbar-meta">Period: <b id="ads-period-label">—</b></div>
      <div class="rpt-toolbar-actions">
        <button class="rpt-btn rpt-btn-white" onclick="adsLoad()"><i class="material-icons">&#xE5D5;</i> Refresh</button>
        <button class="rpt-btn rpt-btn-ghost" onclick="adsExportCsv()"><i class="material-icons">&#xE2C4;</i> CSV</button>
      </div>
    </div>

    <div class="rpt-filter-panel">
      <div class="rpt-filter-grid">
        <div class="rpt-fi">
          <label>Period</label>
          <select id="ads-mode" onchange="adsOnModeChange()">
            <option value="month" selected>Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
            <option value="range">Custom range</option>
          </select>
        </div>
        <div class="rpt-fi" id="ads-month-wrap">
          <label>Month</label>
          <input type="month" id="ads-month" onchange="adsLoad()"/>
        </div>
        <div class="rpt-fi" id="ads-day-wrap" style="display:none">
          <label>Date</label>
          <input type="date" id="ads-day" onchange="adsLoad()"/>
        </div>
        <div class="rpt-fi" id="ads-week-wrap" style="display:none">
          <label>Week of</label>
          <input type="date" id="ads-week" onchange="adsLoad()"/>
        </div>
        <div class="rpt-fi" id="ads-range-wrap" style="display:none">
          <label>From</label>
          <input type="date" id="ads-range-from" onchange="adsLoad()"/>
        </div>
        <div class="rpt-fi" id="ads-range-to-wrap" style="display:none">
          <label>To</label>
          <input type="date" id="ads-range-to" onchange="adsLoad()"/>
        </div>
        <div class="rpt-fi">
          <label>Driver</label>
          <select id="ads-driver-filter" onchange="adsRender()">
            <option value="">All drivers</option>
          </select>
        </div>
        <div class="rpt-fi">
          <label>Status</label>
          <select id="ads-status-filter" onchange="adsRender()">
            <option value="">All</option>
            <option value="open">Unpaid only</option>
            <option value="paid">Paid / locked</option>
          </select>
        </div>
      </div>
    </div>

    <div id="ads-loading" class="rpt-state-box"><div class="rpt-spinner"></div><p>Loading Account / ACC jobs…</p></div>
    <div id="ads-empty" class="rpt-state-box" style="display:none"><i class="material-icons">&#xE8B6;</i><p>No Account / ACC driver jobs in this period.</p></div>

    <div id="ads-main" style="display:none">
      <div class="ads-stats" id="ads-stats"></div>
      <div class="ads-tbl-wrap">
        <table class="ads-tbl">
          <thead>
            <tr>
              <th onclick="adsSort('driverName')">Driver</th>
              <th onclick="adsSort('completedCount')">Completed</th>
              <th>Outcomes</th>
              <th>Account refs</th>
              <th>Vehicles</th>
              <th onclick="adsSort('owedTotal')">Company owes</th>
              <th>Status</th>
              <th>Bank</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="ads-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<div class="ads-ov" id="ads-detail-ov" onclick="if(event.target===this)adsCloseDetail()">
  <div class="ads-modal">
    <div class="ads-modal-h">
      <h3 id="ads-detail-title">Driver detail</h3>
      <button class="rpt-btn rpt-btn-ghost" onclick="adsCloseDetail()">Close</button>
    </div>
    <div class="ads-modal-b" id="ads-detail-body"></div>
  </div>
</div>
`;

  const js = `<script>
var _adsRows = [];
var _adsPeriod = null;
var _adsSortKey = 'owedTotal';
var _adsSortDir = -1;
var _adsDriversMeta = {};

function adsEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function adsMoney(n){
  n = Math.round((parseFloat(n)||0)*100)/100;
  return '$' + n.toFixed(2);
}
function adsParseTs(v){
  if(v==null||v==='') return 0;
  if(typeof v==='number'){
    if(!isFinite(v)||v<=0) return 0;
    return v>1e12?v:(v>1e10?v:v*1000);
  }
  var n=Number(v);
  if(!isNaN(n)&&n>0) return n>1e12?n:(n>1e10?n:n*1000);
  var t=Date.parse(String(v));
  return isNaN(t)?0:t;
}
function adsJobTs(j){
  return adsParseTs(j.completedAt||j.CompletedAt||j.endTime||j.EndTime||j.finishTime||
    j.timestamp||j.Timestamp||j.createdAt||j.CreatedAt||j.jobDate||j.JobDate||j.dateTime||j.DateTime);
}
function adsIsCompanyKey(k, companyId){
  var s=String(k||'');
  if(!s) return false;
  if(companyId!=null && String(companyId)!=='' && s===String(companyId)) return true;
  return /^\\d+$/.test(s);
}
function adsIsLegacyDriverId(id){ return /^D\\d+/i.test(String(id||'').trim()); }
function adsClassifyPm(pm){
  var s=String(pm||'').toLowerCase().replace(/[\\s_-]/g,'');
  if(!s) return 'other';
  if(s.indexOf('account')>=0||s==='acc'||s.indexOf('business')>=0||s.indexOf('corporate')>=0) return 'account';
  if(s.indexOf('cash')>=0) return 'cash';
  if(s.indexOf('eftpos')>=0) return 'eftpos';
  if(s.indexOf('mobility')>=0||s==='tm'||s.indexOf('totalmobility')>=0) return 'tm';
  if(s.indexOf('card')>=0||s.indexOf('stripe')>=0||s.indexOf('visa')>=0||s.indexOf('master')>=0) return 'card';
  return 'other';
}
function adsIsAccountPm(pm){ return adsClassifyPm(pm)==='account'; }
function adsNormalizeOutcome(status){
  var s=String(status||'').toLowerCase().replace(/[\\s_-]/g,'');
  if(!s) return 'other';
  if(s.indexOf('complete')>=0||s==='closed'||s==='done'||s==='finished') return 'completed';
  if(s.indexOf('cancel')>=0) return 'cancelled';
  if(s.indexOf('reject')>=0||s.indexOf('declin')>=0) return 'rejected';
  if(s.indexOf('noshow')>=0||s==='ns') return 'no_show';
  return 'other';
}
function adsFormatPay(amt, count){
  var n=Math.round((parseFloat(amt)||0)*100)/100;
  var c=parseInt(count,10)||0;
  var m='$'+n.toFixed(2);
  return c>0?(m+' \\u00d7'+c):m;
}
function adsPeriodBounds(mode, refMs, rangeFromYmd, rangeToYmd){
  refMs = refMs || Date.now();
  var d=new Date(refMs), y=d.getFullYear(), m=d.getMonth(), day=d.getDate();
  function sod(yy,mm,dd){ return new Date(yy,mm,dd,0,0,0,0).getTime(); }
  function eod(yy,mm,dd){ return new Date(yy,mm,dd,23,59,59,999).getTime(); }
  if(mode==='range'){
    var fromParts=String(rangeFromYmd||'').split('-').map(Number);
    var toParts=String(rangeToYmd||rangeFromYmd||'').split('-').map(Number);
    if(fromParts.length===3 && fromParts[0] && toParts.length===3 && toParts[0]){
      var fromMs=sod(fromParts[0],fromParts[1]-1,fromParts[2]);
      var toMs=eod(toParts[0],toParts[1]-1,toParts[2]);
      if(toMs<fromMs){ var tmp=fromMs; fromMs=sod(toParts[0],toParts[1]-1,toParts[2]); toMs=eod(fromParts[0],fromParts[1]-1,fromParts[2]); }
      var fromLabel=new Date(fromMs).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'});
      var toLabel=new Date(toMs).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'});
      return {mode:'range', fromMs:fromMs, toMs:toMs, key:'R'+rangeFromYmd+'_'+(rangeToYmd||rangeFromYmd),
        label: fromLabel===toLabel?fromLabel:(fromLabel+' \\u2013 '+toLabel)};
    }
  }
  if(mode==='day'){
    return {mode:'day', fromMs:sod(y,m,day), toMs:eod(y,m,day),
      key:y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0'),
      label:d.toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short',year:'numeric'})};
  }
  if(mode==='week'){
    var dow=(d.getDay()+6)%7;
    var mon=new Date(y,m,day-dow);
    var sun=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+6);
    return {mode:'week', fromMs:sod(mon.getFullYear(),mon.getMonth(),mon.getDate()), toMs:eod(sun.getFullYear(),sun.getMonth(),sun.getDate()),
      key:'W'+mon.getFullYear()+'-'+String(mon.getMonth()+1).padStart(2,'0')+'-'+String(mon.getDate()).padStart(2,'0'),
      label:mon.toLocaleDateString('en-NZ',{day:'numeric',month:'short'})+' \\u2013 '+sun.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})};
  }
  var last=new Date(y,m+1,0).getDate();
  return {mode:'month', fromMs:sod(y,m,1), toMs:eod(y,m,last), key:y+'-'+String(m+1).padStart(2,'0'),
    label:d.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})};
}
function adsBuildRow(opts){
  var jobs=opts.jobs||[];
  var settlement=opts.settlement||null;
  var ledgerJobs=[];
  var gross=0, completedCount=0, cancelled=0, rejected=0, noShow=0, otherOut=0;
  var vehicles={}, accountRefs={};
  jobs.forEach(function(job){
    var pm=job.PaymentType||job.paymentType||job.PaymentMethod||job.paymentMethod||'';
    if(!adsIsAccountPm(pm)) return;
    ledgerJobs.push(job);
    var outcome=adsNormalizeOutcome(job.jobstatus||job.JobStatus||job.status||job.Status||'');
    if(outcome==='cancelled') cancelled++;
    else if(outcome==='rejected') rejected++;
    else if(outcome==='no_show') noShow++;
    else if(outcome!=='completed') otherOut++;
    var veh=String(job.vehicleId||job.VehicleId||job.taxiNumber||job.TaxiNumber||job.carNumber||'').trim();
    if(veh) vehicles[veh]=(vehicles[veh]||0)+1;
    var ref=String(job.accountNumber||job.AccountNumber||job.accountCode||job.AccountCode||job.accountId||job.AccountId||job.accClientId||'').trim();
    if(ref) accountRefs[ref]=(accountRefs[ref]||0)+1;
    if(outcome!=='completed') return;
    completedCount++;
    gross += parseFloat(job.TotalFare||job.totalFare||job.Fare||job.fare||job.RideCost||job.EstimatedFare||0)||0;
  });
  gross=Math.round(gross*100)/100;
  var locked=!!(settlement&&(settlement.locked||settlement.status==='paid'));
  return {
    driverId:String(opts.driverId||''),
    driverName:String(opts.driverName||opts.driverId||'Driver'),
    jobs:ledgerJobs, jobCount:ledgerJobs.length, completedCount:completedCount,
    cancelled:cancelled, rejected:rejected, noShow:noShow, otherOutcomes:otherOut,
    gross:gross, owedTotal:locked?0:gross, owedBeforeLock:gross,
    status:locked?'paid':'open', locked:locked, settlement:settlement,
    vehicles:Object.keys(vehicles).sort(), accountRefs:Object.keys(accountRefs).sort(),
    bankName:opts.bankName||'', accountName:opts.accountName||'', accountNumber:opts.accountNumber||'',
    formatAmount:adsFormatPay(locked?0:gross, completedCount)
  };
}
function adsResolveDriverId(rawId, canonMap, companyId){
  if(rawId==null||rawId===''||rawId==='0') return null;
  var id=String(rawId);
  if(adsIsCompanyKey(id, companyId)) return null;
  if(canonMap && canonMap[id]) return canonMap[id];
  return id;
}
function adsBuildCanon(driversRoot, driversCid, companyId){
  var canon={}, names={};
  function setCanon(alias, canonId, name){
    if(alias==null||alias==='') return;
    var a=String(alias);
    if(adsIsCompanyKey(a, companyId)) return;
    var c=String(canonId);
    if(!c||adsIsCompanyKey(c, companyId)) return;
    if(canon[a] && adsIsLegacyDriverId(canon[a]) && !adsIsLegacyDriverId(c)) return;
    canon[a]=c;
    if(name){ names[a]=name; names[c]=name; }
  }
  function ingest(key, d, fromCompanyScoped){
    if(!d||typeof d!=='object') return;
    if(adsIsCompanyKey(key, companyId) && d && typeof d==='object' && !d.name && !d.email){
      Object.keys(d).forEach(function(childKey){ ingest(childKey, d[childKey], true); });
      return;
    }
    if(!fromCompanyScoped && d.companyId!=null && companyId && String(d.companyId)!==String(companyId)) return;
    if(/^\\d+$/.test(String(key)) && !d.name && !d.email && !d.firstName) return;
    var name=[d.firstName||d.first_name||'', d.lastName||d.last_name||d.surname||'', d.name||''].join(' ').trim() || d.email || d.dispatcherId || '';
    var candidates=[d.dispatcherId, d.id, d.driverId, d.DriverId, key];
    var canonId='';
    for(var i=0;i<candidates.length;i++){
      var c=candidates[i];
      if(c!=null && String(c).trim()!=='' && adsIsLegacyDriverId(c)){ canonId=String(c).trim(); break; }
    }
    if(!canonId){
      for(var j=0;j<candidates.length;j++){
        var c2=candidates[j];
        if(c2!=null && String(c2).trim()!==''){ canonId=String(c2).trim(); break; }
      }
    }
    if(!canonId || adsIsCompanyKey(canonId, companyId)) return;
    setCanon(key, canonId, name||canonId);
    setCanon(d.uid, canonId, name||canonId);
    setCanon(d.id, canonId, name||canonId);
    setCanon(d.driverId, canonId, name||canonId);
    setCanon(d.dispatcherId, canonId, name||canonId);
    setCanon(canonId, canonId, name||canonId);
  }
  if(driversCid&&typeof driversCid==='object') Object.keys(driversCid).forEach(function(k){ ingest(k, driversCid[k], true); });
  if(driversRoot&&typeof driversRoot==='object') Object.keys(driversRoot).forEach(function(k){ ingest(k, driversRoot[k], false); });
  return {canon:canon, names:names};
}
function adsMergeJobSources(results){
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
function adsOnModeChange(){
  var mode=document.getElementById('ads-mode').value;
  document.getElementById('ads-month-wrap').style.display=mode==='month'?'':'none';
  document.getElementById('ads-day-wrap').style.display=mode==='day'?'':'none';
  document.getElementById('ads-week-wrap').style.display=mode==='week'?'':'none';
  document.getElementById('ads-range-wrap').style.display=mode==='range'?'':'none';
  document.getElementById('ads-range-to-wrap').style.display=mode==='range'?'':'none';
  adsLoad();
}
function adsInitDates(){
  var now=new Date();
  var ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var yd=ym+'-'+String(now.getDate()).padStart(2,'0');
  var mEl=document.getElementById('ads-month'); if(mEl&&!mEl.value) mEl.value=ym;
  var dEl=document.getElementById('ads-day'); if(dEl&&!dEl.value) dEl.value=yd;
  var wEl=document.getElementById('ads-week'); if(wEl&&!wEl.value) wEl.value=yd;
  var rf=document.getElementById('ads-range-from'); if(rf&&!rf.value) rf.value=yd;
  var rt=document.getElementById('ads-range-to'); if(rt&&!rt.value) rt.value=yd;
}
function adsCurrentPeriod(){
  var mode=document.getElementById('ads-mode').value||'month';
  var ref=Date.now();
  var tz=window.COMPANY_TZ||window.NZ_TZ||'Pacific/Auckland';
  function tzBounds(fromYmd,toYmd){
    if(typeof window._tzDayStart==='function' && typeof window._tzDayEnd==='function'){
      var fromMs=window._tzDayStart(fromYmd, tz);
      var toMs=window._tzDayEnd(toYmd||fromYmd, tz);
      if(fromMs&&toMs) return {fromMs:fromMs,toMs:toMs};
    }
    return null;
  }
  if(mode==='range'){
    var rf=document.getElementById('ads-range-from').value;
    var rt=document.getElementById('ads-range-to').value||rf;
    var p=adsPeriodBounds('range', ref, rf, rt);
    var tb=tzBounds(rf, rt);
    if(tb){ p.fromMs=tb.fromMs; p.toMs=tb.toMs; }
    return p;
  }
  if(mode==='month'){
    var mv=document.getElementById('ads-month').value;
    if(mv){ var mp=mv.split('-'); ref=new Date(parseInt(mp[0],10),parseInt(mp[1],10)-1,15).getTime(); }
    var p2=adsPeriodBounds('month', ref);
    if(mv){
      var y=+mv.split('-')[0], m=+mv.split('-')[1];
      var last=new Date(y,m,0).getDate();
      var tb2=tzBounds(mv+'-01', mv+'-'+String(last).padStart(2,'0'));
      if(tb2){ p2.fromMs=tb2.fromMs; p2.toMs=tb2.toMs; }
    }
    return p2;
  }
  if(mode==='day'){
    var dv=document.getElementById('ads-day').value;
    if(dv) ref=new Date(dv+'T12:00:00').getTime();
    var p3=adsPeriodBounds('day', ref);
    if(dv){ var tb3=tzBounds(dv,dv); if(tb3){ p3.fromMs=tb3.fromMs; p3.toMs=tb3.toMs; } }
    return p3;
  }
  var wv=document.getElementById('ads-week').value;
  if(wv) ref=new Date(wv+'T12:00:00').getTime();
  return adsPeriodBounds('week', ref);
}

function adsLoad(){
  adsInitDates();
  _adsPeriod=adsCurrentPeriod();
  document.getElementById('ads-period-label').textContent=_adsPeriod.label;
  document.getElementById('ads-loading').style.display='';
  document.getElementById('ads-main').style.display='none';
  document.getElementById('ads-empty').style.display='none';
  var cid=window.COMPANY_ID||'';
  Promise.all([
    window.adminRead('drivers').catch(function(){return null;}),
    window.adminRead('drivers/'+cid).catch(function(){return null;}),
    window.adminRead('joback',{limitToLast:800}).catch(function(){return null;}),
    window.adminRead('completedJobs/'+cid).catch(function(){return null;}),
    window.adminRead('closedJobs/'+cid).catch(function(){return null;}),
    window.adminRead('allbookings/'+cid).catch(function(){return null;}),
    window.adminRead('accountDriverSettlements/'+cid+'/'+_adsPeriod.key).catch(function(){return null;})
  ]).then(function(res){
    var built=adsBuildCanon(res[0], res[1], cid);
    var canon=built.canon||{};
    var names=built.names||{};
    var settlements=res[6]||{};
    _adsDriversMeta={};
    function ingestDrivers(d){
      if(!d||typeof d!=='object') return;
      Object.keys(d).forEach(function(k){
        var v=d[k];
        if(!v||typeof v!=='object') return;
        if(/^\\d+$/.test(k) && !v.name && !v.email) return;
        var id=String(v.id||v.driverId||v.dispatcherId||k);
        var name=[v.firstName||'',v.lastName||'',v.name||''].join(' ').trim()||v.dispatcherId||id;
        var meta={name:name,bankName:v.bankName||'',accountName:v.accountName||'',accountNumber:v.accountNumber||'',pushKey:k};
        _adsDriversMeta[id]=meta;
        if(v.dispatcherId) _adsDriversMeta[String(v.dispatcherId)]=meta;
        if(v.id) _adsDriversMeta[String(v.id)]=meta;
        if(v.uid) _adsDriversMeta[String(v.uid)]=meta;
        _adsDriversMeta[k]=meta;
      });
    }
    ingestDrivers(res[0]); ingestDrivers(res[1]);

    var merged=adsMergeJobSources([res[2],res[3],res[4],res[5]]);
    var byDriver={};
    Object.keys(merged).forEach(function(bid){
      Object.keys(merged[bid]||{}).forEach(function(did){
        var j=merged[bid][did];
        if(!j||typeof j!=='object') return;
        var copy=Object.assign({},j);
        copy.bookingId=copy.bookingId||copy.BookingId||bid;
        var rawDid=String(copy.driverId||copy.DriverId||copy.driverid||did||'').trim();
        if(!rawDid||rawDid===bid||rawDid===String(copy.bookingId||'')) return;
        var canonDid=adsResolveDriverId(rawDid, canon, cid);
        if(!canonDid) return;
        copy.driverId=canonDid;
        var ts=adsJobTs(copy);
        if(!ts||ts<_adsPeriod.fromMs||ts>_adsPeriod.toMs) return;
        var pm=copy.PaymentType||copy.paymentType||copy.PaymentMethod||copy.paymentMethod||'';
        if(!adsIsAccountPm(pm)) return;
        if(!byDriver[canonDid]) byDriver[canonDid]=[];
        byDriver[canonDid].push(copy);
      });
    });

    _adsRows=Object.keys(byDriver).map(function(did){
      var meta=_adsDriversMeta[did]||{};
      var settle=settlements[did]||null;
      if(!settle && meta.pushKey) settle=settlements[meta.pushKey]||null;
      return adsBuildRow({
        driverId:did,
        driverName:meta.name||names[did]||did,
        jobs:byDriver[did],
        settlement:settle,
        bankName:meta.bankName, accountName:meta.accountName, accountNumber:meta.accountNumber
      });
    }).filter(function(r){ return r.jobCount>0; });

    var sel=document.getElementById('ads-driver-filter');
    var prev=sel.value;
    sel.innerHTML='<option value="">All drivers</option>'+_adsRows.slice().sort(function(a,b){
      return a.driverName.localeCompare(b.driverName);
    }).map(function(r){
      return '<option value="'+adsEsc(r.driverId)+'">'+adsEsc(r.driverName)+'</option>';
    }).join('');
    if(prev) sel.value=prev;

    document.getElementById('ads-loading').style.display='none';
    if(!_adsRows.length){
      document.getElementById('ads-empty').style.display='';
      return;
    }
    document.getElementById('ads-main').style.display='';
    adsRender();
  }).catch(function(e){
    document.getElementById('ads-loading').style.display='none';
    document.getElementById('ads-empty').style.display='';
    document.getElementById('ads-empty').innerHTML='<p>Failed to load: '+adsEsc(e&&e.message||e)+'</p>';
  });
}

function adsSort(key){
  if(_adsSortKey===key) _adsSortDir*=-1; else { _adsSortKey=key; _adsSortDir=-1; }
  adsRender();
}
function adsFiltered(){
  var df=document.getElementById('ads-driver-filter').value;
  var sf=document.getElementById('ads-status-filter').value;
  return _adsRows.filter(function(r){
    if(df && r.driverId!==df) return false;
    if(sf && r.status!==sf) return false;
    return true;
  }).slice().sort(function(a,b){
    var av=a[_adsSortKey], bv=b[_adsSortKey];
    if(typeof av==='string') return av.localeCompare(bv)*_adsSortDir;
    return ((av||0)-(bv||0))*_adsSortDir;
  });
}
function adsRender(){
  var rows=adsFiltered();
  var unpaid=0, paidN=0, jobs=0;
  rows.forEach(function(r){
    unpaid+=r.owedTotal; jobs+=r.completedCount;
    if(r.status==='paid') paidN++;
  });
  document.getElementById('ads-stats').innerHTML=
    '<div class="ads-stat"><div class="v">'+rows.length+'</div><div class="l">Drivers</div></div>'+
    '<div class="ads-stat"><div class="v owed">'+adsMoney(unpaid)+'</div><div class="l">Total unpaid</div></div>'+
    '<div class="ads-stat"><div class="v paid">'+paidN+'</div><div class="l">Paid / locked</div></div>'+
    '<div class="ads-stat"><div class="v">'+jobs+'</div><div class="l">Completed Acc jobs</div></div>';

  document.getElementById('ads-tbody').innerHTML=rows.map(function(r){
    var bank=r.accountNumber
      ? '<span class="ads-bank" title="'+adsEsc((r.bankName||'')+' / '+(r.accountName||''))+'">'+adsEsc(r.accountNumber)+'</span>'
      : '<span class="ads-zero">—</span>';
    var markBtn=r.locked
      ? '<button class="ads-btn" disabled title="Period locked">Paid</button>'
      : '<button class="ads-btn primary" onclick="adsMarkPaid(\\''+adsEsc(r.driverId)+'\\')">Mark Paid</button>';
    return '<tr>'+
      '<td><b>'+adsEsc(r.driverName)+'</b><div class="ads-sub">'+adsEsc(r.driverId)+'</div></td>'+
      '<td class="ads-money">'+adsFormatPay(r.owedBeforeLock, r.completedCount)+'</td>'+
      '<td>Done '+r.completedCount+' · Canc '+r.cancelled+' · Rej '+r.rejected+' · NS '+r.noShow+'<div class="ads-sub">Tot '+r.jobCount+'</div></td>'+
      '<td>'+adsEsc(r.accountRefs.join(', ')||'—')+'</td>'+
      '<td>'+adsEsc(r.vehicles.join(', ')||'—')+'</td>'+
      '<td class="ads-money '+(r.owedTotal?'ads-owed':'ads-zero')+'">'+adsMoney(r.owedTotal)+
        (r.locked?' <span class="ads-sub" style="color:#2E7D32">('+adsMoney(r.owedBeforeLock)+' locked)</span>':'')+'</td>'+
      '<td><span class="ads-pill '+r.status+'">'+(r.status==='paid'?'Paid':'Unpaid')+'</span></td>'+
      '<td>'+bank+'</td>'+
      '<td style="white-space:nowrap"><button class="ads-btn" onclick="adsOpenDetail(\\''+adsEsc(r.driverId)+'\\')">Detail</button> '+markBtn+'</td>'+
    '</tr>';
  }).join('');
}
function adsOpenDetail(driverId){
  var r=_adsRows.find(function(x){return x.driverId===driverId;});
  if(!r) return;
  document.getElementById('ads-detail-title').textContent=r.driverName+' — '+(_adsPeriod&&_adsPeriod.label||'');
  var html='<div class="ads-kv">'+
    '<div><div class="k">Company owes</div><div class="val" style="color:#E65100">'+adsMoney(r.owedTotal)+'</div></div>'+
    '<div><div class="k">Status</div><div class="val">'+(r.locked?'Paid & locked':'Open / unpaid')+'</div></div>'+
    '<div><div class="k">Completed</div><div class="val">'+r.completedCount+' / '+r.jobCount+' Acc jobs</div></div>'+
    '<div><div class="k">Account refs</div><div class="val">'+adsEsc(r.accountRefs.join(', ')||'—')+'</div></div>'+
    '<div><div class="k">Vehicles</div><div class="val">'+adsEsc(r.vehicles.join(', ')||'—')+'</div></div>'+
    '<div><div class="k">Bank</div><div class="val ads-bank">'+adsEsc([r.bankName,r.accountName,r.accountNumber].filter(Boolean).join(' · ')||'Not on file')+'</div></div>'+
  '</div>';
  html+='<table class="ads-tbl" style="min-width:0"><thead><tr><th>When</th><th>Booking</th><th>Pay</th><th>Account</th><th>Fare</th><th>Status</th></tr></thead><tbody>';
  var list=(r.jobs||[]).slice().sort(function(a,b){return adsJobTs(b)-adsJobTs(a);}).slice(0,80);
  list.forEach(function(j){
    var fare=parseFloat(j.TotalFare||j.totalFare||j.Fare||j.fare||0);
    var pm=j.PaymentType||j.paymentType||j.PaymentMethod||'';
    var ref=j.accountNumber||j.AccountNumber||j.accountCode||j.AccountCode||'';
    var ts=adsJobTs(j);
    html+='<tr><td>'+(ts?new Date(ts).toLocaleString('en-NZ'):'—')+'</td>'+
      '<td>'+adsEsc(j.bookingId||'')+'</td><td>'+adsEsc(pm||'—')+'</td><td>'+adsEsc(ref||'—')+'</td>'+
      '<td class="ads-money">'+adsMoney(fare)+'</td><td>'+adsEsc(j.jobstatus||j.status||'')+'</td></tr>';
  });
  html+='</tbody></table>';
  if((r.jobs||[]).length>80) html+='<div class="ads-note">Showing latest 80 of '+r.jobs.length+' jobs.</div>';
  document.getElementById('ads-detail-body').innerHTML=html;
  document.getElementById('ads-detail-ov').classList.add('show');
}
function adsCloseDetail(){ document.getElementById('ads-detail-ov').classList.remove('show'); }

function adsMarkPaid(driverId){
  var r=_adsRows.find(function(x){return x.driverId===driverId;});
  if(!r||r.locked) return;
  var amt=r.owedBeforeLock;
  if(!confirm('Mark '+r.driverName+' Account/ACC as PAID for '+(_adsPeriod&&_adsPeriod.label)+'?\\n\\nAmount: '+adsMoney(amt)+'\\nThis locks the Account ledger for this period (separate from BookaWaka Card/TM/Hoist).')) return;
  var cid=window.COMPANY_ID||'';
  var path='accountDriverSettlements/'+cid+'/'+_adsPeriod.key+'/'+driverId;
  var payload={
    status:'paid', locked:true, amountPaid:amt, kind:'account',
    periodKey:_adsPeriod.key, periodLabel:_adsPeriod.label,
    fromMs:_adsPeriod.fromMs, toMs:_adsPeriod.toMs,
    driverId:driverId, driverName:r.driverName,
    completedCount:r.completedCount, gross:r.gross, accountRefs:r.accountRefs,
    paidAt:Date.now(), paidBy:(window.OWNER_EMAIL||window.ADMIN_EMAIL||'owner')
  };
  window.adminWrite(path,'PUT',payload).then(function(){
    r.settlement=payload; r.locked=true; r.status='paid'; r.owedTotal=0;
    adsRender();
  }).catch(function(e){ alert('Could not mark paid: '+(e&&e.message||e)); });
}

function adsExportCsv(){
  var rows=adsFiltered();
  var headers=['Driver','DriverId','Period','Completed','Cancelled','Rejected','NoShow','JobTotal','Gross','Owed','Status','AccountRefs','Vehicles','BankName','AccountName','AccountNumber'];
  var lines=[headers.join(',')];
  rows.forEach(function(r){
    function q(v){ v=String(v==null?'':v); if(/[",\\n]/.test(v)) return '"'+v.replace(/"/g,'""')+'"'; return v; }
    lines.push([
      r.driverName,r.driverId,_adsPeriod&&_adsPeriod.label,r.completedCount,r.cancelled,r.rejected,r.noShow,r.jobCount,
      r.owedBeforeLock.toFixed(2),r.owedTotal.toFixed(2),r.status,r.accountRefs.join(' '),r.vehicles.join(' '),
      r.bankName,r.accountName,r.accountNumber
    ].map(q).join(','));
  });
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([lines.join('\\n')],{type:'text/csv;charset=utf-8'}));
  a.download='account-settlements-'+(_adsPeriod&&_adsPeriod.key||'export')+'.csv';
  a.click();
}

adsInitDates();
adsLoad();
</script>`;

  return pageWrap(commonHead('Account / ACC Driver Settlements', css), body, commonScripts(js));
};
