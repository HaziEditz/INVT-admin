/**
 * Owner-panel wiring for Driver Ops (uses helpers already in page scope).
 * Appended after SA-ported shift/pay helpers.
 */
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
function money(n){
  n = Math.round((parseFloat(n)||0)*100)/100;
  return '$' + n.toFixed(2);
}
function dosMoney(n){ return money(n); }
function esc(s){ return dosEsc(s); }

function dosOnModeChange(){
  var mode=document.getElementById('dos-mode').value;
  document.getElementById('dos-month-wrap').style.display=mode==='month'?'':'none';
  document.getElementById('dos-day-wrap').style.display=mode==='day'?'':'none';
  document.getElementById('dos-week-wrap').style.display=mode==='week'?'':'none';
  document.getElementById('dos-range-wrap').style.display=mode==='range'?'':'none';
  document.getElementById('dos-range-to-wrap').style.display=mode==='range'?'':'none';
  dosLoad();
}
function dosInitDates(){
  var now=new Date();
  var ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var yd=ym+'-'+String(now.getDate()).padStart(2,'0');
  var mEl=document.getElementById('dos-month'); if(mEl&&!mEl.value) mEl.value=ym;
  var dEl=document.getElementById('dos-day'); if(dEl&&!dEl.value) dEl.value=yd;
  var wEl=document.getElementById('dos-week'); if(wEl&&!wEl.value) wEl.value=yd;
  var rf=document.getElementById('dos-range-from'); if(rf&&!rf.value) rf.value=yd;
  var rt=document.getElementById('dos-range-to'); if(rt&&!rt.value) rt.value=yd;
}
function dosCurrentPeriod(){
  var mode=document.getElementById('dos-mode').value||'month';
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
    var rf=document.getElementById('dos-range-from').value;
    var rt=document.getElementById('dos-range-to').value||rf;
    var p=dosPeriodBounds('range', ref, rf, rt);
    var tb=tzBounds(rf, rt);
    if(tb){ p.fromMs=tb.fromMs; p.toMs=tb.toMs; }
    return p;
  }
  if(mode==='month'){
    var mv=document.getElementById('dos-month').value;
    if(mv){ var mp=mv.split('-'); ref=new Date(parseInt(mp[0],10),parseInt(mp[1],10)-1,15).getTime(); }
    var p2=dosPeriodBounds('month', ref);
    if(mv){
      var y=+mv.split('-')[0], m=+mv.split('-')[1];
      var last=new Date(y,m,0).getDate();
      var fromYmd=mv+'-01';
      var toYmd=mv+'-'+String(last).padStart(2,'0');
      var tb2=tzBounds(fromYmd,toYmd);
      if(tb2){ p2.fromMs=tb2.fromMs; p2.toMs=tb2.toMs; }
    }
    return p2;
  }
  if(mode==='day'){
    var dv=document.getElementById('dos-day').value;
    if(dv) ref=new Date(dv+'T12:00:00').getTime();
    var p3=dosPeriodBounds('day', ref);
    if(dv){ var tb3=tzBounds(dv,dv); if(tb3){ p3.fromMs=tb3.fromMs; p3.toMs=tb3.toMs; } }
    return p3;
  }
  var wv=document.getElementById('dos-week').value;
  if(wv) ref=new Date(wv+'T12:00:00').getTime();
  return dosPeriodBounds('week', ref);
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
    window.adminRead('attendance/'+cid).catch(function(){return null;}),
    window.adminRead('driverSessions/'+cid).catch(function(){return null;}),
    window.adminRead('driverSettlements/'+cid+'/'+_dosPeriod.key).catch(function(){return null;})
  ]).then(function(res){
    _dosCardSettings=res[0]||window._cardSettingsCache||{};
    var driversRoot=res[1], driversCid=res[2];
    var settlements=res[10]||{};

    var shiftAgg=dosAggregateDriverShiftMinutes({
      companyId:cid, fromMs:_dosPeriod.fromMs, toMs:_dosPeriod.toMs,
      driversRoot:driversRoot, driversCid:driversCid,
      shiftLogs:res[7], attendance:res[8], driverSessions:res[9]
    });
    var canon=shiftAgg.canon||{};
    var names=shiftAgg.names||{};

    _dosDriversMeta={};
    function ingestDrivers(d){
      if(!d||typeof d!=='object') return;
      Object.keys(d).forEach(function(k){
        var v=d[k];
        if(!v||typeof v!=='object') return;
        if(/^\d+$/.test(k) && !v.name && !v.email) return;
        var id=String(v.id||v.driverId||v.dispatcherId||k);
        var name=[v.firstName||'',v.lastName||'',v.name||''].join(' ').trim()||v.dispatcherId||id;
        var meta={name:name,bankName:v.bankName||'',accountName:v.accountName||'',accountNumber:v.accountNumber||'',
          pushKey:k, numericId:String(v.id||v.driverId||'')};
        _dosDriversMeta[id]=meta;
        if(v.dispatcherId) _dosDriversMeta[String(v.dispatcherId)]=meta;
        if(v.id) _dosDriversMeta[String(v.id)]=meta;
        if(v.uid) _dosDriversMeta[String(v.uid)]=meta;
        _dosDriversMeta[k]=meta;
      });
    }
    ingestDrivers(driversRoot); ingestDrivers(driversCid);

    var merged=dosMergeJobSources([res[3],res[4],res[5],res[6]]);
    var allJobs=[];
    Object.keys(merged).forEach(function(bid){
      Object.keys(merged[bid]||{}).forEach(function(did){
        var j=merged[bid][did];
        if(!j||typeof j!=='object') return;
        var copy=Object.assign({},j);
        copy.bookingId=copy.bookingId||copy.BookingId||bid;
        var rawDid=String(copy.driverId||copy.DriverId||copy.driverid||did||'').trim();
        if(!rawDid||rawDid===bid||rawDid===String(copy.bookingId||'')) return;
        var canonDid=dosResolveDriverId(rawDid, canon, cid);
        if(!canonDid) return; // rejected company/phantom ids (e.g. "0") — do not fall back
        copy.driverId=canonDid;
        var ts=dosJobTs(copy);
        if(!ts||ts<_dosPeriod.fromMs||ts>_dosPeriod.toMs) return;
        allJobs.push(copy);
      });
    });

    var byDriver={};
    allJobs.forEach(function(j){
      var did=String(j.driverId||'');
      if(!did) return;
      if(!byDriver[did]) byDriver[did]=[];
      byDriver[did].push(j);
    });
    Object.keys(shiftAgg.byDriver||{}).forEach(function(did){
      if(!byDriver[did]) byDriver[did]=[];
    });

    var dispMap={};
    allJobs.forEach(function(j){
      var dn=String(j.DispatcherName||j.dispatcherName||j.dispatcher||j.bookedBy||'').trim();
      if(!dn||dn==='—'||dn==='-') return;
      if(!dispMap[dn]) dispMap[dn]={name:dn,total:0,completed:0,cancelled:0};
      dispMap[dn].total++;
      var o=dosNormalizeJobOutcome(j.jobstatus||j.JobStatus||j.status||'');
      if(o==='completed') dispMap[dn].completed++;
      if(o==='cancelled') dispMap[dn].cancelled++;
    });
    _dosDisp=Object.keys(dispMap).map(function(k){return dispMap[k];}).sort(function(a,b){return b.total-a.total;});

    _dosRows=Object.keys(byDriver).map(function(did){
      var meta=_dosDriversMeta[did]||{};
      var sm=shiftAgg.byDriver[did]||{workMinutes:0,breakMinutes:0};
      var settle=settlements[did]||null;
      if(!settle && meta.pushKey) settle=settlements[meta.pushKey]||null;
      return dosBuildDriverSummaryRow({
        driverId:did,
        driverName:meta.name||names[did]||did,
        jobs:byDriver[did],
        workMinutes:sm.workMinutes,
        breakMinutes:sm.breakMinutes,
        cardSettings:_dosCardSettings,
        settlement:settle,
        bankName:meta.bankName, accountName:meta.accountName, accountNumber:meta.accountNumber
      });
    }).filter(function(r){
      if(!(r.outcomes.total>0 || r.workMinutes>0 || r.owedBeforeLock>0)) return false;
      var meta=_dosDriversMeta[r.driverId];
      var looksLikeBooking=/^869\d{6,}$/.test(r.driverId) || (/^\d{10,}$/.test(r.driverId) && !meta);
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
function dosStatusLabel(r){
  if(r.status==='paid') return 'Paid';
  if(r.status==='partial') return 'Partial';
  return 'Unpaid';
}
function dosMatchesStatusFilter(r, sf){
  if(!sf) return true;
  if(sf==='card_open') return !r.cardLocked && r.cardOwedBeforeLock>0;
  if(sf==='tm_open') return !r.tmLocked && r.tmOwedBeforeLock>0;
  if(sf==='open') return r.owedTotal>0;
  if(sf==='partial') return r.status==='partial';
  if(sf==='paid') return r.status==='paid';
  return r.status===sf;
}
function dosFiltered(){
  var df=document.getElementById('dos-driver-filter').value;
  var sf=document.getElementById('dos-status-filter').value;
  return _dosRows.filter(function(r){
    if(df && r.driverId!==df) return false;
    if(!dosMatchesStatusFilter(r, sf)) return false;
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
  var unpaid=0, cardUnpaid=0, tmUnpaid=0, paidN=0, cash=0, jobs=0, workMin=0;
  rows.forEach(function(r){
    unpaid+=r.owedTotal; cardUnpaid+=r.cardOwed; tmUnpaid+=r.tmOwed;
    cash+=r.cashHeld; jobs+=r.outcomes.total; workMin+=r.workMinutes||0;
    if(r.status==='paid') paidN++;
  });
  document.getElementById('dos-stats').innerHTML=
    '<div class="dos-stat"><div class="v">'+rows.length+'</div><div class="l">Drivers</div></div>'+
    '<div class="dos-stat"><div class="v owed">'+money(cardUnpaid)+'</div><div class="l">Card unpaid</div></div>'+
    '<div class="dos-stat"><div class="v owed">'+money(tmUnpaid)+'</div><div class="l">TM unpaid</div></div>'+
    '<div class="dos-stat"><div class="v owed">'+money(unpaid)+'</div><div class="l">Total unpaid</div></div>'+
    '<div class="dos-stat"><div class="v">'+money(cash)+'</div><div class="l">Cash held by drivers</div></div>'+
    '<div class="dos-stat"><div class="v paid">'+paidN+'</div><div class="l">Fully paid</div></div>'+
    '<div class="dos-stat"><div class="v">'+jobs+'</div><div class="l">Jobs</div></div>'+
    '<div class="dos-stat"><div class="v">'+dosFmtDur(workMin)+'</div><div class="l">Hours worked</div></div>';

  document.getElementById('dos-tbody').innerHTML=rows.map(function(r){
    var bank=r.accountNumber
      ? '<span class="dos-bank" title="'+dosEsc((r.bankName||'')+' / '+(r.accountName||''))+'">'+dosEsc(r.accountNumber)+'</span>'
      : '<span class="dos-zero">—</span>';
    var markCard=r.cardLocked || !(r.cardOwedBeforeLock>0)
      ? '<button class="dos-btn" disabled>'+(r.cardLocked?'Card paid':'No card')+'</button>'
      : '<button class="dos-btn primary" onclick="dosMarkCardPaid(\''+dosEsc(r.driverId)+'\')">Mark Card</button>';
    var markTm=r.tmLocked || !(r.tmOwedBeforeLock>0)
      ? '<button class="dos-btn" disabled>'+(r.tmLocked?'TM paid':'No TM')+'</button>'
      : '<button class="dos-btn primary" onclick="dosMarkTmPaid(\''+dosEsc(r.driverId)+'\')">Mark TM</button>';
    var t=r.tmDetail||dosEmptyTmDetail();
    var tmMain=t.trips?dosFormatPayWithCount(r.tmLocked?t.paid:t.owed, t.trips):'$0.00';
    var tmPctBits=[];
    if(t.councilPct!=null) tmPctBits.push('Council eff. '+t.councilPct+'%');
    if(t.passengerPct!=null) tmPctBits.push('Pax eff. '+t.passengerPct+'%');
    var tmSub=t.trips?('Sub '+money(t.subsidy)+' · Hoist '+money(t.hoist)+(tmPctBits.length?' · '+tmPctBits.join(' / '):'')+(t.passengerPays?' · Pax '+money(t.passengerPays):'')):'';
    function lockedNote(before){ return ' <span class="dos-sub" style="color:#2E7D32">('+money(before)+' locked)</span>'; }
    return '<tr>'+
      '<td class="sticky-driver"><b>'+dosEsc(r.driverName)+'</b><div class="dos-sub">'+dosEsc(r.driverId)+'</div></td>'+
      '<td>'+dosFmtDur(r.workMinutes)+'<div class="dos-sub">'+dosFmtDur(r.breakMinutes)+' brk</div></td>'+
      '<td>Done '+r.outcomes.completed+' · Canc '+r.outcomes.cancelled+' · Rej '+r.outcomes.rejected+' · NS '+r.outcomes.no_show+'<div class="dos-sub">Tot '+r.outcomes.total+'</div></td>'+
      '<td class="num">'+(r.sources.dispatch||0)+'</td>'+
      '<td class="num">'+(r.sources.passenger_app||0)+'</td>'+
      '<td class="num">'+(r.sources.website||0)+'</td>'+
      '<td class="num">'+(r.sources.food||0)+'</td>'+
      '<td class="num">'+(r.sources.freight||0)+'</td>'+
      '<td class="num">'+(r.sources.hail||0)+'</td>'+
      '<td class="num">'+(r.sources.other||0)+'</td>'+
      '<td class="num">'+(r.sources.unknown||0)+'</td>'+
      '<td>'+dosEsc(r.vehicles.join(', ')||'—')+'</td>'+
      '<td class="dos-money dos-cash">'+dosFormatPayWithCount(r.cashHeld, r.pay.cash.count)+'</td>'+
      '<td class="dos-money">'+dosFormatPayWithCount(r.cardLocked?0:r.pay.card.owed, r.pay.card.count)+'</td>'+
      '<td class="dos-money">'+dosFormatPayWithCount(r.pay.eftpos.gross, r.pay.eftpos.count)+'</td>'+
      '<td class="dos-money">'+tmMain+(tmSub?'<div class="dos-sub">'+tmSub+'</div>':'')+'</td>'+
      '<td class="dos-money">'+dosFormatPayWithCount(r.pay.account.gross, r.pay.account.count)+'</td>'+
      '<td class="dos-money">'+dosFormatPayWithCount(r.tmLocked?0:r.pay.hoist.owed, (r.pay.hoist.uses||r.pay.hoist.count))+'</td>'+
      '<td class="dos-money col-owed '+(r.cardOwed?'dos-owed':'dos-zero')+'">'+money(r.cardOwed)+(r.cardLocked?lockedNote(r.cardOwedBeforeLock):'')+'</td>'+
      '<td class="dos-money col-owed '+(r.tmOwed?'dos-owed':'dos-zero')+'">'+money(r.tmOwed)+(r.tmLocked?lockedNote(r.tmOwedBeforeLock):'')+'</td>'+
      '<td class="dos-money col-owed '+(r.owedTotal?'dos-owed':'dos-zero')+'">'+money(r.owedTotal)+'</td>'+
      '<td><span class="dos-pill '+r.status+'">'+dosStatusLabel(r)+'</span></td>'+
      '<td>'+bank+'</td>'+
      '<td style="white-space:nowrap"><button class="dos-btn" onclick="dosOpenDetail(\''+dosEsc(r.driverId)+'\')">Detail</button> '+markCard+' '+markTm+'</td>'+
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
  var t=r.tmDetail||dosEmptyTmDetail();
  var srcBits=Object.keys(r.sources).filter(function(k){return r.sources[k];}).map(function(k){return k.replace(/_/g,' ')+': '+r.sources[k];}).join(' · ');
  var html='<div class="dos-kv">'+
    '<div><div class="k">Hours / breaks</div><div class="val">'+dosFmtDur(r.workMinutes)+' / '+dosFmtDur(r.breakMinutes)+'</div></div>'+
    '<div><div class="k">Company owes</div><div class="val" style="color:#E65100">'+money(r.owedTotal)+'</div></div>'+
    '<div><div class="k">Cash held</div><div class="val">'+money(r.cashHeld)+'</div></div>'+
    '<div><div class="k">Status</div><div class="val">'+(r.locked?'Paid & locked':'Open / unpaid')+'</div></div>'+
    '<div><div class="k">Jobs</div><div class="val">Done '+r.outcomes.completed+' · Canc '+r.outcomes.cancelled+' · Rej '+r.outcomes.rejected+' · NS '+r.outcomes.no_show+' · Tot '+r.outcomes.total+'</div></div>'+
    '<div><div class="k">Sources</div><div class="val">'+dosEsc(srcBits||'—')+'</div></div>'+
    '<div><div class="k">Vehicles</div><div class="val">'+dosEsc(r.vehicles.join(', ')||'—')+'</div></div>'+
    '<div><div class="k">Bank</div><div class="val dos-bank">'+dosEsc([r.bankName,r.accountName,r.accountNumber].filter(Boolean).join(' · ')||'Not on file — add on driver profile')+'</div></div>'+
  '</div>';
  html+='<div class="dos-kv" style="border-top:1px solid #eee;padding-top:10px">'+
    '<div><div class="k">TM trips</div><div class="val">'+t.trips+'</div></div>'+
    '<div><div class="k">TM fare</div><div class="val">'+money(t.fare)+'</div></div>'+
    '<div><div class="k">Council subsidy</div><div class="val">'+money(t.subsidy)+(t.councilPct!=null?' (eff. '+t.councilPct+'%)':'')+'</div></div>'+
    '<div><div class="k">TM hoist</div><div class="val">'+money(t.hoist)+(t.hoistUses?' ×'+t.hoistUses:'')+'</div></div>'+
    '<div><div class="k">Pax pays</div><div class="val">'+money(t.passengerPays)+(t.passengerPct!=null?' (eff. '+t.passengerPct+'%)':'')+'</div></div>'+
    '<div><div class="k">TM owed / paid</div><div class="val"><span style="color:#E65100">'+money(t.owed)+'</span> / <span style="color:#2E7D32">'+money(t.paid)+'</span></div></div>'+
  '</div>';
  html+='<table class="dos-tbl" style="min-width:0"><thead><tr><th>When</th><th>Booking</th><th>Pay</th><th>Fare</th><th>Owed</th><th>Status</th><th>Source</th></tr></thead><tbody>';
  var list=(r.jobs||[]).slice().sort(function(a,b){return dosJobTs(b)-dosJobTs(a);}).slice(0,80);
  list.forEach(function(j){
    var fare=parseFloat(j.TotalFare||j.totalFare||j.Fare||j.fare||0);
    var pm=j.PaymentType||j.paymentType||j.PaymentMethod||'';
    var lines=dosJobPaymentLines(j,_dosCardSettings);
    var lineOwed=lines.reduce(function(a,l){return a+(l.owed||0);},0);
    var ts=dosJobTs(j);
    var isCompleted=dosNormalizeJobOutcome(j.jobstatus||j.status)==='completed';
    html+='<tr><td>'+(ts?new Date(ts).toLocaleString('en-NZ'):'—')+'</td>'+
      '<td>'+dosEsc(j.bookingId||'')+'</td><td>'+dosEsc(pm||'—')+'</td>'+
      '<td class="dos-money">'+money(fare)+'</td><td class="dos-money">'+(isCompleted?money(lineOwed):'—')+'</td>'+
      '<td>'+dosEsc(j.jobstatus||j.status||'')+'</td><td>'+dosEsc(dosNormalizeJobSource(j))+'</td></tr>';
  });
  html+='</tbody></table>';
  if((r.jobs||[]).length>80) html+='<div class="dos-note">Showing latest 80 of '+r.jobs.length+' jobs.</div>';
  document.getElementById('dos-detail-body').innerHTML=html;
  document.getElementById('dos-detail-ov').classList.add('show');
}
function dosCloseDetail(){ document.getElementById('dos-detail-ov').classList.remove('show'); }

function dosMarkStreamPaid(driverId, kind){
  var r=_dosRows.find(function(x){return x.driverId===driverId;});
  if(!r) return;
  var isCard=kind==='card';
  if(isCard){ if(r.cardLocked||!(r.cardOwedBeforeLock>0)) return; }
  else { if(r.tmLocked||!(r.tmOwedBeforeLock>0)) return; }
  var amt=isCard?r.cardOwedBeforeLock:r.tmOwedBeforeLock;
  var label=isCard?'Card':'TM/Hoist';
  if(!confirm('Mark '+r.driverName+' '+label+' as PAID for '+(_dosPeriod&&_dosPeriod.label)+'?\\n\\nAmount: '+money(amt)+'\\nLocks '+label+' only (independent of the other stream).')) return;
  var cid=window.COMPANY_ID||'';
  var root=isCard?'cardDriverSettlements':'tmDriverSettlements';
  var path=root+'/'+cid+'/'+_dosPeriod.key+'/'+driverId;
  var payload={
    status:'paid', locked:true, amountPaid:amt, kind:isCard?'card':'tm',
    periodKey:_dosPeriod.key, periodLabel:_dosPeriod.label,
    fromMs:_dosPeriod.fromMs, toMs:_dosPeriod.toMs,
    driverId:driverId, driverName:r.driverName,
    pay:r.pay, tmDetail:r.tmDetail, sources:r.sources,
    paidAt:Date.now(), paidBy:(window.OWNER_EMAIL||window.ADMIN_EMAIL||'owner')
  };
  window.adminWrite(path,'PUT',payload).then(function(){
    if(isCard){ r.cardSettlement=payload; r.cardLocked=true; r.cardOwed=0; }
    else {
      r.tmSettlement=payload; r.tmLocked=true; r.tmOwed=0;
      if(r.tmDetail){ r.tmDetail.paid=r.tmDetail.owed; r.tmDetail.owed=0; }
    }
    r.owedTotal=Math.round(((r.cardOwed||0)+(r.tmOwed||0))*100)/100;
    r.locked=!!(r.cardLocked&&r.tmLocked);
    r.status=r.locked?'paid':((r.cardLocked||r.tmLocked)?'partial':'open');
    dosRender();
  }).catch(function(e){ alert('Could not mark paid: '+(e&&e.message||e)); });
}
function dosMarkCardPaid(driverId){ dosMarkStreamPaid(driverId, 'card'); }
function dosMarkTmPaid(driverId){ dosMarkStreamPaid(driverId, 'tm'); }

function dosExportCsv(){
  var rows=dosFiltered();
  var headers=['Driver','DriverId','Period','Hours','BreakMin','Done','Cancelled','Rejected','NoShow','JobsTotal','Disp','App','Web','Food','Frt','Hail','Other','Unknown','Vehicles','CashHeld','CashCount','CardOwed','CardCount','EftposGross','EftposCount','TmTrips','TmFare','TmSubsidy','TmHoist','TmHoistUses','TmPassengerPays','TmOwed','TmPaid','AccountGross','AccountCount','HoistOwed','HoistCount','CardStreamOwed','TmStreamOwed','OwedTotal','CardStatus','TmStatus','Status','BankName','AccountName','AccountNumber'];
  var lines=[headers.join(',')];
  rows.forEach(function(r){
    function q(v){ v=String(v==null?'':v); if(/[",\\n]/.test(v)) return '"'+v.replace(/"/g,'""')+'"'; return v; }
    var t=r.tmDetail||dosEmptyTmDetail();
    lines.push([
      r.driverName,r.driverId,_dosPeriod&&_dosPeriod.label,(r.workMinutes/60).toFixed(1),r.breakMinutes,
      r.outcomes.completed,r.outcomes.cancelled,r.outcomes.rejected,r.outcomes.no_show,r.outcomes.total,
      r.sources.dispatch||0,r.sources.passenger_app||0,r.sources.website||0,r.sources.food||0,r.sources.freight||0,r.sources.hail||0,
      r.sources.other||0,r.sources.unknown||0,
      r.vehicles.join(' '),r.cashHeld.toFixed(2),r.pay.cash.count,r.pay.card.owed.toFixed(2),r.pay.card.count,
      r.pay.eftpos.gross.toFixed(2),r.pay.eftpos.count,
      t.trips,t.fare.toFixed(2),t.subsidy.toFixed(2),t.hoist.toFixed(2),t.hoistUses,t.passengerPays.toFixed(2),t.owed.toFixed(2),t.paid.toFixed(2),
      r.pay.account.gross.toFixed(2),r.pay.account.count,r.pay.hoist.owed.toFixed(2),r.pay.hoist.count,
      r.cardOwed.toFixed(2),r.tmOwed.toFixed(2),r.owedTotal.toFixed(2),
      r.cardLocked?'paid':'open',r.tmLocked?'paid':'open',r.status,r.bankName,r.accountName,r.accountNumber
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
