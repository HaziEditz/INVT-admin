var map, selectedShape, drawingManager;
var tariffZones = [];

/* ── Firebase helpers ── */
function _fbDB() {
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
    return firebase.database();
  }
  return null;
}
function loadZones(cb) {
  var db = _fbDB();
  if (db) {
    db.ref('tariffZones').once('value').then(function(snap) {
      tariffZones = [];
      snap.forEach(function(child) { tariffZones.push(child.val()); });
      if (cb) cb();
    }).catch(function() {
      try { tariffZones = JSON.parse(localStorage.getItem('tariffZones') || '[]'); } catch(e) { tariffZones = []; }
      if (cb) cb();
    });
  } else {
    try { tariffZones = JSON.parse(localStorage.getItem('tariffZones') || '[]'); } catch(e) { tariffZones = []; }
    if (cb) cb();
  }
}
function saveZones() {
  var db = _fbDB();
  if (db) {
    var obj = {};
    tariffZones.forEach(function(z) { obj[z.id] = z; });
    db.ref('tariffZones').set(obj).catch(function(err) {
      console.warn('[Tariffs] Firebase write failed, using localStorage fallback:', err.message);
      localStorage.setItem('tariffZones', JSON.stringify(tariffZones));
    });
  } else {
    localStorage.setItem('tariffZones', JSON.stringify(tariffZones));
  }
}

/* ── IP-based geolocation ── */
function getIPLocation(callback) {
  fetch('https://ipapi.co/json/')
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.latitude && d.longitude) {
        callback({ lat: parseFloat(d.latitude), lng: parseFloat(d.longitude), city: d.city || '' });
      } else {
        callback(null);
      }
    })
    .catch(function(){ callback(null); });
}

/* ── Map init (called by Maps API callback) ── */
function initTariffMap() {
  loadZones(function() {

  var nzDefault = { lat: -36.8485, lng: 174.7633 };

  function setupMap(center, cityName) {
    map = new google.maps.Map(document.getElementById('tariff-map'), {
      zoom: 12,
      center: center,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      fullscreenControl: true
    });

    if (cityName) {
      var lbl = document.getElementById('map-location-label');
      if (lbl) lbl.textContent = 'Centred on ' + cityName + ' (from your IP)';
    }

    new google.maps.Marker({
      position: center,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#1565C0',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      },
      title: cityName ? 'Your approximate location: ' + cityName : 'Map centre'
    });

    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON,
          google.maps.drawing.OverlayType.RECTANGLE,
          google.maps.drawing.OverlayType.CIRCLE
        ]
      },
      polygonOptions: {
        strokeColor: '#1976D2', strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: '#42A5F5', fillOpacity: 0.3,
        editable: true, draggable: true, clickable: true, suppressUndo: true
      },
      rectangleOptions: {
        strokeColor: '#1976D2', strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: '#42A5F5', fillOpacity: 0.3, editable: true, draggable: true
      },
      circleOptions: {
        strokeColor: '#1976D2', strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: '#42A5F5', fillOpacity: 0.3, editable: true, draggable: true
      }
    });
    drawingManager.setMap(map);

    drawingManager.addListener('overlaycomplete', function(e) {
      drawingManager.setDrawingMode(null);
      var shape = e.overlay;
      shape.shapeType = e.type;
      shape.addListener('click', function() { selectShape(shape); });
      selectShape(shape);
      showSavePanel();
    });

    renderSavedZones();
  }

  getIPLocation(function(loc) {
    if (loc) {
      setupMap({ lat: loc.lat, lng: loc.lng }, loc.city);
    } else {
      setupMap(nzDefault, 'Auckland');
    }
    setTimeout(buildTable, 300);
  });
  });
}

/* ── Drawing mode helpers ── */
function startDrawingPolygon() {
  if (!drawingManager) return;
  drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  document.getElementById('drawing-hint').style.display = 'block';
}

function cancelDrawing() {
  if (drawingManager) drawingManager.setDrawingMode(null);
  document.getElementById('drawing-hint').style.display = 'none';
}

function selectShape(shape) {
  clearSelection();
  selectedShape = shape;
  if (shape.setEditable) shape.setEditable(true);
  document.getElementById('drawing-hint').style.display = 'none';
}

function clearSelection() {
  if (selectedShape) {
    if (selectedShape.setEditable) selectedShape.setEditable(false);
    selectedShape = null;
  }
}

function deleteSelectedShape() {
  if (selectedShape) {
    selectedShape.setMap(null);
    selectedShape = null;
    hideSavePanel();
  } else {
    alert('Click a shape on the map first, then click Delete Shape.');
  }
}

/* ── Schedule UI toggles ── */
function toggleScheduleFields() {
  var isCustom = document.getElementById('schedCustom') && document.getElementById('schedCustom').checked;
  var sf = document.getElementById('schedule-fields');
  if (sf) sf.style.display = isCustom ? 'block' : 'none';
  if (isCustom) {
    var today = new Date();
    var dd = today.toISOString().slice(0, 10);
    var sd = document.getElementById('schedStartDate');
    var ed = document.getElementById('schedEndDate');
    if (sd && !sd.value) sd.value = dd;
    if (ed && !ed.value) {
      var future = new Date(today);
      future.setFullYear(future.getFullYear() + 1);
      ed.value = future.toISOString().slice(0, 10);
    }
  }
}

function toggleTimeFields() {
  var allDay = document.getElementById('schedAllDay');
  var tf = document.getElementById('time-fields');
  if (tf) tf.style.display = (allDay && allDay.checked) ? 'none' : 'block';
}

/* ── Save panel ── */
function showSavePanel() {
  document.getElementById('save-panel').style.display = 'block';
  document.getElementById('txtZoneName').focus();
}
function hideSavePanel() {
  document.getElementById('save-panel').style.display = 'none';
  clearForm();
}
function clearForm() {
  ['txtZoneName','txtBaseFare','txtPerKm','txtPerMin','txtMinFare','txtMaxFare'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var color = document.getElementById('ddlZoneColor');
  if (color) color.value = '#42A5F5';

  // Reset schedule
  var always = document.getElementById('schedAlways');
  if (always) { always.checked = true; }
  var sf = document.getElementById('schedule-fields');
  if (sf) sf.style.display = 'none';
  var startDate = document.getElementById('schedStartDate');
  if (startDate) startDate.value = '';
  var endDate = document.getElementById('schedEndDate');
  if (endDate) endDate.value = '';
  var allDay = document.getElementById('schedAllDay');
  if (allDay) allDay.checked = true;
  var tf = document.getElementById('time-fields');
  if (tf) tf.style.display = 'none';
  var st = document.getElementById('schedStartTime');
  if (st) st.value = '08:00';
  var et = document.getElementById('schedEndTime');
  if (et) et.value = '22:00';
  // Check all days
  var dayBoxes = document.querySelectorAll('#days-of-week input[type="checkbox"]');
  dayBoxes.forEach(function(cb) { cb.checked = true; });
}

/* ── Extract coords from shape ── */
function getShapeCoords(shape) {
  var coords = [];
  if (shape.shapeType === 'polygon') {
    shape.getPath().forEach(function(ll) { coords.push({ lat: ll.lat(), lng: ll.lng() }); });
  } else if (shape.shapeType === 'rectangle') {
    var b = shape.getBounds();
    var ne = b.getNorthEast(), sw = b.getSouthWest();
    coords = [
      { lat: ne.lat(), lng: ne.lng() },
      { lat: ne.lat(), lng: sw.lng() },
      { lat: sw.lat(), lng: sw.lng() },
      { lat: sw.lat(), lng: ne.lng() }
    ];
  } else if (shape.shapeType === 'circle') {
    coords = [{ lat: shape.getCenter().lat(), lng: shape.getCenter().lng(), radius: shape.getRadius() }];
  }
  return coords;
}

/* ── Read schedule from form ── */
function readScheduleFromForm() {
  var isCustom = document.getElementById('schedCustom') && document.getElementById('schedCustom').checked;
  if (!isCustom) {
    return { scheduleType: 'always' };
  }

  var startDate = (document.getElementById('schedStartDate') || {}).value || '';
  var endDate   = (document.getElementById('schedEndDate')   || {}).value || '';
  var allDay    = document.getElementById('schedAllDay') ? document.getElementById('schedAllDay').checked : true;
  var startTime = allDay ? '00:00' : ((document.getElementById('schedStartTime') || {}).value || '00:00');
  var endTime   = allDay ? '23:59' : ((document.getElementById('schedEndTime')   || {}).value || '23:59');

  var days = [];
  var dayBoxes = document.querySelectorAll('#days-of-week input[type="checkbox"]');
  dayBoxes.forEach(function(cb) {
    if (cb.checked) days.push(parseInt(cb.value, 10));
  });
  if (days.length === 0) days = [0,1,2,3,4,5,6];

  return {
    scheduleType: 'custom',
    startDate:    startDate,
    endDate:      endDate,
    allDay:       allDay,
    startTime:    startTime,
    endTime:      endTime,
    days:         days
  };
}

/* ── Is tariff currently active? ── */
function isTariffActive(zone) {
  if (!zone.scheduleType || zone.scheduleType === 'always') return true;

  var now = new Date();

  // Date range check
  if (zone.startDate) {
    var start = new Date(zone.startDate + 'T00:00:00');
    if (now < start) return false;
  }
  if (zone.endDate) {
    var end = new Date(zone.endDate + 'T23:59:59');
    if (now > end) return false;
  }

  // Day of week check (0=Sun, 1=Mon, ... 6=Sat)
  if (zone.days && zone.days.length > 0) {
    if (zone.days.indexOf(now.getDay()) === -1) return false;
  }

  // Time range check
  if (!zone.allDay) {
    var hhmm = now.getHours() * 60 + now.getMinutes();
    var stParts = (zone.startTime || '00:00').split(':');
    var etParts = (zone.endTime   || '23:59').split(':');
    var startMins = parseInt(stParts[0], 10) * 60 + parseInt(stParts[1], 10);
    var endMins   = parseInt(etParts[0], 10) * 60 + parseInt(etParts[1], 10);
    if (endMins < startMins) {
      // overnight window e.g. 22:00 – 06:00
      if (hhmm < startMins && hhmm > endMins) return false;
    } else {
      if (hhmm < startMins || hhmm > endMins) return false;
    }
  }

  return true;
}

/* ── Human-readable schedule summary ── */
function getScheduleSummary(zone) {
  if (!zone.scheduleType || zone.scheduleType === 'always') return '24/7';
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var days = (zone.days || [0,1,2,3,4,5,6]).map(function(d){ return DAY_NAMES[d]; }).join(', ');
  var times = zone.allDay ? 'All day' : ((zone.startTime || '00:00') + ' – ' + (zone.endTime || '23:59'));
  var dates = '';
  if (zone.startDate || zone.endDate) {
    dates = (zone.startDate || '?') + ' → ' + (zone.endDate || '?');
  }
  return (dates ? dates + '<br>' : '') + days + '<br>' + times;
}

/* ── Save tariff zone ── */
function saveTariffZone() {
  var nameEl = document.getElementById('txtZoneName');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    if (nameEl) { nameEl.style.borderColor = 'red'; nameEl.focus(); }
    return;
  }
  if (!selectedShape) {
    alert('Please draw a zone on the map first.');
    return;
  }

  // Validate custom schedule fields
  var sched = readScheduleFromForm();
  if (sched.scheduleType === 'custom') {
    if (!sched.startDate || !sched.endDate) {
      alert('Please set Start Date and End Date for the schedule.');
      return;
    }
    if (sched.startDate > sched.endDate) {
      alert('Start Date must be before End Date.');
      return;
    }
  }

  var color  = document.getElementById('ddlZoneColor').value;
  var record = {
    id:           Date.now(),
    name:         name,
    baseFare:     document.getElementById('txtBaseFare').value  || '0.00',
    perKm:        document.getElementById('txtPerKm').value     || '0.00',
    perMin:       document.getElementById('txtPerMin').value    || '0.00',
    minFare:      document.getElementById('txtMinFare').value   || '0.00',
    maxFare:      document.getElementById('txtMaxFare').value   || '',
    color:        color,
    shapeType:    selectedShape.shapeType,
    coords:       getShapeCoords(selectedShape),
    scheduleType: sched.scheduleType,
    startDate:    sched.startDate    || null,
    endDate:      sched.endDate      || null,
    allDay:       sched.allDay !== false,
    startTime:    sched.startTime    || '00:00',
    endTime:      sched.endTime      || '23:59',
    days:         sched.days         || [0,1,2,3,4,5,6]
  };

  if (selectedShape.setOptions) {
    selectedShape.setOptions({ fillColor: color, strokeColor: color, editable: false });
  }
  selectedShape.zoneId = record.id;

  tariffZones.push(record);
  saveZones();
  buildTable();
  hideSavePanel();
  selectedShape = null;

  showToast('Tariff zone "' + name + '" saved.');
}

/* ── Render saved zones on map ── */
function renderSavedZones() {
  tariffZones.forEach(function(z) {
    if (!z.coords || z.coords.length === 0) return;
    var active = isTariffActive(z);
    var opacity = active ? 0.35 : 0.12;
    var shape;
    if (z.shapeType === 'circle' && z.coords[0] && z.coords[0].radius) {
      shape = new google.maps.Circle({
        center: { lat: z.coords[0].lat, lng: z.coords[0].lng },
        radius: z.coords[0].radius,
        strokeColor: z.color, strokeOpacity: active ? 0.9 : 0.4, strokeWeight: 2,
        fillColor: z.color, fillOpacity: opacity, map: map, clickable: true
      });
    } else {
      var paths = z.coords.map(function(c){ return { lat: c.lat, lng: c.lng }; });
      shape = new google.maps.Polygon({
        paths: paths,
        strokeColor: z.color, strokeOpacity: active ? 0.9 : 0.4, strokeWeight: 2,
        fillColor: z.color, fillOpacity: opacity, map: map,
        editable: false, clickable: true
      });
    }
    shape.zoneId = z.id;

    (function(zone, s) {
      s.addListener('click', function(ev) {
        var pos = (ev && ev.latLng) ? ev.latLng : (s.getCenter ? s.getCenter() : null);
        if (!pos) return;
        var activeNow = isTariffActive(zone);
        var statusBadge = activeNow
          ? '<span style="display:inline-block;background:#43A047;color:#fff;font-size:10px;padding:1px 8px;border-radius:10px;font-weight:600;margin-left:4px">ACTIVE</span>'
          : '<span style="display:inline-block;background:#9E9E9E;color:#fff;font-size:10px;padding:1px 8px;border-radius:10px;font-weight:600;margin-left:4px">INACTIVE</span>';
        var schedLine = '';
        if (zone.scheduleType === 'custom') {
          var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          var daysStr = (zone.days || []).map(function(d){ return DAY_NAMES[d]; }).join(', ');
          var timeStr = zone.allDay ? 'All day' : ((zone.startTime || '') + ' – ' + (zone.endTime || ''));
          schedLine = '<hr style="margin:6px 0"/>' +
            '<span style="font-size:11px;color:#555">' +
            (zone.startDate ? zone.startDate + ' → ' + (zone.endDate||'?') + '<br>' : '') +
            daysStr + '<br>' + timeStr + '</span>';
        }
        var iw = new google.maps.InfoWindow({
          content: '<div style="padding:8px;min-width:170px;font-size:13px">' +
                   '<strong style="font-size:14px">' + zone.name + '</strong>' + statusBadge +
                   '<hr style="margin:6px 0"/>' +
                   'Base Fare: <b>$' + zone.baseFare + '</b><br/>' +
                   'Per KM: <b>$' + zone.perKm + '</b><br/>' +
                   'Per Min: <b>$' + zone.perMin + '</b><br/>' +
                   'Min Fare: <b>$' + zone.minFare + '</b>' +
                   schedLine +
                   '</div>',
          position: pos
        });
        iw.open(map);
      });
    })(z, shape);
  });
}

/* ── DataTable ── */
function buildTable() {
  if (typeof $ === 'undefined' || typeof $.fn === 'undefined' || typeof $.fn.dataTable === 'undefined') {
    setTimeout(buildTable, 400);
    return;
  }

  var tbody = document.getElementById('tariff-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  tariffZones.forEach(function(z, idx) {
    var active = isTariffActive(z);
    var statusBadge = active
      ? '<span class="badge-active">ACTIVE</span>'
      : '<span class="badge-inactive">INACTIVE</span>';
    var schedCell;
    if (!z.scheduleType || z.scheduleType === 'always') {
      schedCell = '<span class="badge-sched">24/7</span>';
    } else {
      var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var daysStr = (z.days || []).map(function(d){ return DAY_NAMES[d]; }).join(', ');
      var timeStr = z.allDay ? 'All day' : ((z.startTime||'') + ' – ' + (z.endTime||''));
      schedCell = '<span style="font-size:11px;line-height:1.5">' +
        (z.startDate ? '<b>' + z.startDate + '</b> → <b>' + (z.endDate||'?') + '</b><br>' : '') +
        daysStr + '<br>' + timeStr + '</span>';
    }
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (idx + 1) + '</td>' +
      '<td><span style="display:inline-block;width:13px;height:13px;background:' + z.color +
        ';border-radius:3px;margin-right:5px;vertical-align:middle"></span>' + z.name + '</td>' +
      '<td>$' + z.baseFare + '</td>' +
      '<td>$' + z.perKm + '</td>' +
      '<td>$' + z.perMin + '</td>' +
      '<td>$' + z.minFare + '</td>' +
      '<td>' + (z.maxFare || '—') + '</td>' +
      '<td>' + schedCell + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<a class="md-icon material-icons" onclick="zoomToZone(' + z.id + ')" title="Zoom to zone" style="cursor:pointer;margin-right:6px;font-size:18px">&#xE55B;</a>' +
        '<a class="md-icon material-icons" onclick="deleteZone(' + z.id + ')" title="Delete" style="cursor:pointer;color:#e53935;font-size:18px">&#xE872;</a>' +
      '</td>';
    tbody.appendChild(tr);
  });

  if ($.fn.dataTable.isDataTable('#TblTariffs')) {
    $('#TblTariffs').DataTable().destroy();
  }
  var dtBtns = [];
  if ($.fn.dataTable && $.fn.dataTable.ext && $.fn.dataTable.ext.buttons) {
    if ($.fn.dataTable.ext.buttons.copyHtml5)  dtBtns.push({ extend: 'copy',  exportOptions: { columns: [0,1,2,3,4,5,6,7,8] } });
    if ($.fn.dataTable.ext.buttons.csvHtml5)   dtBtns.push({ extend: 'csv',   exportOptions: { columns: [0,1,2,3,4,5,6,7,8] } });
    if ($.fn.dataTable.ext.buttons.excelHtml5) dtBtns.push({ extend: 'excel', exportOptions: { columns: [0,1,2,3,4,5,6,7,8] } });
  }
  try {
    $('#TblTariffs').DataTable({
      pageLength: 10,
      lengthMenu: [[5, 10, 25, -1], [5, 10, 25, 'All']],
      ordering: false,
      dom: dtBtns.length ? 'Bfrtip' : 'frtip',
      buttons: dtBtns
    });
  } catch(e) { console.warn('[Tariffs] DataTable error:', e.message); }
}

function deleteZone(id) {
  if (!confirm('Delete this tariff zone?')) return;
  tariffZones = tariffZones.filter(function(z){ return z.id !== id; });
  saveZones();
  location.reload();
}

function zoomToZone(id) {
  var z = tariffZones.find(function(z){ return z.id === id; });
  if (!z || !z.coords || z.coords.length === 0) return;
  var bounds = new google.maps.LatLngBounds();
  z.coords.forEach(function(c){ bounds.extend({ lat: c.lat, lng: c.lng }); });
  map.fitBounds(bounds);
}

/* ── Toast ── */
function showToast(msg) {
  var t = document.getElementById('toast-msg');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.bottom = '30px';
  setTimeout(function(){
    t.style.opacity = '0';
    t.style.bottom = '10px';
  }, 3000);
}
