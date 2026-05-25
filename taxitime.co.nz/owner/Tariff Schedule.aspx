<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<title>360Taxi - Tariff Schedule</title>
<link rel="icon" href="assets/img/Logo-03.jpg" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
<script src="assets/js/jquery.min.js" type="text/javascript"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"></script>
<script src="firebase-config.js"></script>
<script>
  if (typeof firebase !== 'undefined' && FIREBASE_CONFIG) {
    try { firebase.app(); } catch(e) { firebase.initializeApp(FIREBASE_CONFIG); }
  }
</script>
<link href="bower_components/uikit/css/uikit.almost-flat.min.css" rel="stylesheet" />
<link href="assets/css/main.min.css" rel="stylesheet" />
<script src="DataManager/AjaxHandler.js"></script>
<link href="DataManager/Validate.css" rel="stylesheet" />
<script src="DataManager/Validate.js"></script>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" />
<link href="assets/DeletePopup/style2.css" rel="stylesheet" />
<link href="assets/css/font-awesome.min.css" rel="stylesheet" />
<link href="assets/css/bootstrap.min.css" rel="stylesheet" />
<link href="css/dataTables.bootstrap.css" rel="stylesheet" />
<link href="css/buttons.bootstrap.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
<script src="JsScripts/Tariffs.js"></script>
<style>
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('assets/icons/material-design-icons/MaterialIcons-Regular.woff2') format('woff2'),
       url('assets/icons/material-design-icons/MaterialIcons-Regular.woff') format('woff');
}
@font-face {
  font-family: 'FontAwesome';
  src: url('assets/fonts/fontawesome-webfont.woff2') format('woff2'),
       url('assets/fonts/fontawesome-webfont.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}
#tariff-map {
  height: 520px;
  width: 100%;
}
#save-panel {
  display: none;
  background: #E3F2FD;
  border-left: 4px solid #1976D2;
  border-radius: 4px;
  padding: 16px 20px 10px;
  margin: 12px 0 0;
}
#save-panel h4 {
  margin: 0 0 12px;
  color: #1565C0;
  font-size: 15px;
}
.tariff-field { margin-bottom: 12px; }
.tariff-field label { font-size: 12px; color: #616161; display: block; margin-bottom: 3px; }
.tariff-row { display: flex; flex-wrap: wrap; gap: 12px; }
.tariff-col { flex: 1; min-width: 120px; }
.active_section > a { background-color: rgba(0,0,0,0.15) !important; }
.active_section > a .menu_title { color: #fff !important; font-weight: 600; }
#toast-msg {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #323232;
  color: #fff;
  padding: 10px 24px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.4s, bottom 0.4s;
  z-index: 9999;
  font-size: 14px;
  pointer-events: none;
}
.map-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 12px;
  flex-wrap: wrap;
}
#drawing-hint {
  display: none;
  background: #E8F5E9;
  border-left: 4px solid #388E3C;
  border-radius: 4px;
  padding: 10px 14px;
  margin: 0 0 10px;
  font-size: 13px;
  color: #1B5E20;
}
.day-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #BBDEFB;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  background: #E3F2FD;
  color: #1565C0;
  font-weight: normal;
  user-select: none;
  transition: background 0.15s;
}
.day-chip:hover { background: #BBDEFB; }
.day-chip input[type="checkbox"] { width: 13px; height: 13px; cursor: pointer; }
.badge-active {
  display: inline-block;
  background: #43A047;
  color: #fff;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 600;
  vertical-align: middle;
  margin-left: 4px;
}
.badge-inactive {
  display: inline-block;
  background: #9E9E9E;
  color: #fff;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 600;
  vertical-align: middle;
  margin-left: 4px;
}
.badge-sched {
  display: inline-block;
  background: #1976D2;
  color: #fff;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 10px;
  vertical-align: middle;
  margin-left: 4px;
}
</style>
</head>
<body class="sidebar_main_open sidebar_main_swipe">

<!-- header -->
<header id="header_main">
  <div class="header_main_content">
    <nav class="uk-navbar">
      <a href="#" id="sidebar_main_toggle" class="sSwitch sSwitch_left"><span class="sSwitchIcon"></span></a>
      <a href="#" id="sidebar_secondary_toggle" class="sSwitch sSwitch_right sidebar_secondary_check"><span class="sSwitchIcon"></span></a>
      <div class="col-md-offset-2 col-md-4">
        <label style="color:#fff">Welcome To </label>
        <label id="lblName" style="color:#fff"></label>
      </div>
      <div class="uk-navbar-flip">
        <ul class="uk-navbar-nav user_actions">
          <li><a href="#" id="full_screen_toggle" class="user_action_icon uk-visible-large"><i class="material-icons md-24 md-light">&#xE5D0;</i></a></li>
          <li><a href="#" id="main_search_btn" class="user_action_icon"><i class="material-icons md-24 md-light">&#xE8B6;</i></a></li>
          <li data-uk-dropdown="{mode:'click',pos:'bottom-right'}">
            <a href="#" class="user_action_icon"><i class="material-icons md-24 md-light">&#xE7F4;</i><span class="uk-badge" id="spnTotal"></span></a>
            <div class="uk-dropdown uk-dropdown-xlarge">
              <div class="md-card-content">
                <ul class="uk-tab uk-tab-grid" data-uk-tab="{connect:'#header_alerts',animation:'slide-horizontal'}">
                  <li class="uk-width-1-2 uk-active"><a href="#" class="js-uk-prevent uk-text-small" id="SpnEmployeeAccounts"></a></li>
                  <li class="uk-width-1-2"><a href="#" class="js-uk-prevent uk-text-small" id="SpnParentsAccounts"></a></li>
                </ul>
                <ul id="header_alerts" class="uk-switcher uk-margin">
                  <li><ul class="md-list md-list-addon" id="EmployeeAccountSection"></ul></li>
                  <li><ul class="md-list md-list-addon" id="ParentsAccountSection"></ul></li>
                </ul>
              </div>
            </div>
          </li>
          <li data-uk-dropdown="{mode:'click',pos:'bottom-right'}">
            <a href="#" class="user_action_image"><img class="md-user-image Logo" id="UserAction" src="assets/img/Logo-03.jpg" alt="" /></a>
            <div class="uk-dropdown uk-dropdown-small">
              <ul class="uk-nav js-uk-prevent">
                <li><a href="#">My profile</a></li>
                <li><a href="#">Settings</a></li>
                <li><a href="#" onclick="Logout()">Logout</a></li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="header_main_search_form">
    <i class="md-icon header_main_search_close material-icons">&#xE5CD;</i>
    <form class="uk-form">
      <input type="text" class="header_main_search_input" />
      <button class="header_main_search_btn uk-button-link"><i class="md-icon material-icons">&#xE8B6;</i></button>
    </form>
  </div>
</header>

<!-- sidebar -->
<aside id="sidebar_main">
  <div class="sidebar_main_header">
    <div class="sidebar_logo">
      <a href="Default.aspx" class="sSidebar_hide"><img class="Logo" src="assets/img/Logo-03.jpg" alt="" style="height:100px;width:100px;border-radius:50%"/></a>
      <a href="Default.aspx" class="sSidebar_show"><img src="assets/img/Logo-03.jpg" class="Logo" alt="" style="height:50px;width:50px;border-radius:50%"/></a>
    </div>
  </div>
  <div class="menu_section">
    <ul>
      <li class="current_section" title="Dashboard"><a href="Default.aspx"><span class="menu_icon"><i class="material-icons">&#xE871;</i></span><span class="menu_title">Dashboard</span></a></li>
      <li class="current_section" title="Billing"><a><span class="menu_icon"><i class="material-icons fa fa-credit-card"></i></span><span class="menu_title">Billing</span></a>
        <ul><li><a href="#">Overview</a></li><li><a href="Accounts-Details.aspx">Bank Accounts</a></li></ul>
      </li>
      <li class="current_section" title="Settings"><a><span class="menu_icon"><i class="material-icons">&#xE8B8;</i></span><span class="menu_title">Settings</span></a>
        <ul>
          <li><a href="Dispatch.aspx">Dispatch</a></li>
          <li><a href="Service Area.aspx">Service Area</a></li>
          <li><a href="Vehicle Type.aspx">Vehicle Types</a></li>
          <li><a href="Notifications.aspx">Notifications</a></li>
          <li><a href="Company_account_detail.aspx">Company Account Details</a></li>
          <li><a href="Company_card_percent.aspx">Company Card Percentage</a></li>
        </ul>
      </li>
      <li class="current_section" title="Users"><a href="Users-Registration.aspx"><span class="menu_icon"><i class="material-icons">&#xE7FD;</i></span><span class="menu_title">Users</span></a></li>
      <li class="current_section" title="Vehicles"><a href="Vehicle-Registration.aspx"><span class="menu_icon"><i class="material-icons fa fa-car"></i></span><span class="menu_title">Vehicles</span></a></li>
      <li class="current_section" title="Vendors"><a><span class="menu_icon"><i class="material-icons">&#xE8D3;</i></span><span class="menu_title">Vendors</span></a>
        <ul><li><a href="Vendors.aspx">Registration</a></li><li><a href="VendorCars.aspx">Vendors Cars</a></li></ul>
      </li>
      <li class="current_section" title="Zones"><a href="Define Zones.aspx"><span class="menu_icon"><i class="material-icons fa fa-puzzle-piece"></i></span><span class="menu_title">Zones</span></a></li>
      <li class="current_section active_section" title="Tariffs"><a href="Tariff Schedule.aspx"><span class="menu_icon"><i class="material-icons fa fa-text-width"></i></span><span class="menu_title">Tariffs</span></a></li>
      <li class="current_section" title="Promo Codes"><a><span class="menu_icon"><i class="material-icons fa fa-gift"></i></span><span class="menu_title">Promos</span></a>
        <ul><li><a href="Promos.aspx">Define</a></li><li><a href="SegmentedPromos.aspx">Segmented Entry</a></li></ul>
      </li>
      <li class="current_section" title="Reports"><a><span class="menu_icon"><i class="material-icons fa fa-file-archive-o"></i></span><span class="menu_title">Reports</span></a>
        <ul>
          <li><a href="ShiftReports.aspx">Shift Reports</a></li>
          <li><a href="ClosedJobsReports.aspx">Closed Jobs</a></li>
          <li><a href="CarReports.aspx">Car Jobs</a></li>
          <li><a href="DriverReports.aspx">Driver Jobs</a></li>
          <li><a href="Invoice_create.aspx">Create Invoices</a></li>
          <li><a href="Invoice_send_report.aspx">ALL Invoice Report</a></li>
          <li><a href="AccReport.aspx">Driver Account Jobs</a></li>
          <li><a href="DispatcherJobsReport.aspx">Dispatcher Jobs</a></li>
          <li><a href="DriverSummary.aspx">Driver Summary</a></li>
          <li><a href="DispatchSummary.aspx">Dispatch Summary</a></li>
          <li><a href="DriverShiftsSummary.aspx">Drivers Shifts Summary</a></li>
          <li><a href="CarShiftsSummary.aspx">Cars Shifts Summary</a></li>
          <li><a href="TotalMobility.aspx">Total Mobility Jobs</a></li>
        </ul>
      </li>
      <li class="current_section" title="Replay"><a href="Replay.aspx"><span class="menu_icon"><i class="material-icons fa fa-play-circle-o"></i></span><span class="menu_title">Replay</span></a></li>
      <li class="current_section" title="Plannings"><a><span class="menu_icon"><i class="material-icons fa fa-calendar-o"></i></span><span class="menu_title">Plannings</span></a>
        <ul>
          <li><a href="Users Working Schedule.aspx">Schedules</a></li>
          <li><a href="Working Shifts.aspx">Shifts</a></li>
          <li><a href="Assign Shifts.aspx">Assign Shifts</a></li>
        </ul>
      </li>
      <li class="current_section" title="Customers"><a><span class="menu_icon"><i class="material-icons">&#xE7FD;</i></span><span class="menu_title">Customers</span></a>
        <ul><li><a href="Customer Account.aspx">Customers Accounts</a></li><li><a href="#">Invoicing</a></li></ul>
      </li>
      <li class="current_section" title="POIs"><a href="POIs.aspx"><span class="menu_icon"><i class="material-icons fa fa-thumb-tack"></i></span><span class="menu_title">POIs</span></a></li>
      <li class="current_section" title="Jobs"><a><span class="menu_icon"><i class="material-icons fa fa-ticket"></i></span><span class="menu_title">Jobs</span></a>
        <ul><li><a href="Jobs Editor.aspx">Editor</a></li><li><a href="Jobs Rating.aspx">Ratings</a></li></ul>
      </li>
    </ul>
  </div>
</aside>

<form id="form1">
<div id="page_content">
  <div id="page_content_inner">

    <div class="uk-grid">
      <div class="uk-width-1-1">

        <!-- Map card -->
        <div class="md-card">
          <div class="md-card-toolbar">
            <div class="md-card-toolbar-actions">
              <i class="md-icon material-icons md-card-fullscreen-activate">&#xE5D0;</i>
            </div>
            <h3 class="md-card-toolbar-heading-text">
              <i class="material-icons fa fa-text-width" style="vertical-align:middle;margin-right:8px"></i>
              Tariff Schedule — Zone Map
            </h3>
          </div>
          <div class="md-card-content" style="padding:16px">

            <!-- toolbar above map -->
            <div class="map-toolbar">
              <div style="flex:1;color:#616161;font-size:13px">
                <i class="material-icons" style="vertical-align:middle;font-size:16px;color:#1976D2">&#xE88A;</i>
                <span id="map-location-label">Locating you via IP&hellip;</span>
              </div>
              <button type="button" class="md-btn md-btn-primary" onclick="startDrawingPolygon()" style="white-space:nowrap;background:#388E3C;border-color:#388E3C">
                <i class="material-icons" style="vertical-align:middle;font-size:16px">&#xE254;</i> Draw Zone
              </button>
              <button type="button" class="md-btn md-btn-danger" onclick="deleteSelectedShape()" style="white-space:nowrap">
                <i class="material-icons" style="vertical-align:middle;font-size:16px">&#xE872;</i> Delete Shape
              </button>
              <a href="Define Zones.aspx" class="md-btn" style="white-space:nowrap">
                <i class="material-icons" style="vertical-align:middle;font-size:16px">&#xE55B;</i> Zones
              </a>
            </div>

            <!-- drawing hint -->
            <div id="drawing-hint">
              <i class="material-icons" style="vertical-align:middle;font-size:15px">&#xE88F;</i>
              <strong>Drawing mode active.</strong> Click on the map to place each corner of your zone. Double-click (or click the first point) to close and finish the shape.
              <a onclick="cancelDrawing()" style="margin-left:12px;cursor:pointer;color:#B71C1C;font-weight:600">Cancel</a>
            </div>

            <!-- map -->
            <div id="tariff-map"></div>

            <!-- save panel (appears after drawing) -->
            <div id="save-panel">
              <h4><i class="material-icons" style="vertical-align:middle;font-size:17px">&#xE254;</i> New Tariff Zone — Fill in details then click Save</h4>
              <div class="tariff-row">
                <div class="tariff-col" style="flex:2">
                  <div class="tariff-field">
                    <label>Zone Name <span style="color:red">*</span></label>
                    <input type="text" class="md-input" id="txtZoneName" placeholder="e.g. City Centre" />
                  </div>
                </div>
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Zone Colour</label>
                    <select id="ddlZoneColor" class="md-input">
                      <option value="#42A5F5" style="background:#42A5F5">Blue</option>
                      <option value="#66BB6A" style="background:#66BB6A">Green</option>
                      <option value="#FFA726" style="background:#FFA726">Orange</option>
                      <option value="#EF5350" style="background:#EF5350">Red</option>
                      <option value="#AB47BC" style="background:#AB47BC">Purple</option>
                      <option value="#26C6DA" style="background:#26C6DA">Cyan</option>
                      <option value="#FFD54F" style="background:#FFD54F">Yellow</option>
                      <option value="#8D6E63" style="background:#8D6E63">Brown</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="tariff-row">
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Base Fare ($)</label>
                    <input type="number" class="md-input" id="txtBaseFare" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Per KM Rate ($)</label>
                    <input type="number" class="md-input" id="txtPerKm" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Per Minute Rate ($)</label>
                    <input type="number" class="md-input" id="txtPerMin" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Minimum Fare ($)</label>
                    <input type="number" class="md-input" id="txtMinFare" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div class="tariff-col">
                  <div class="tariff-field">
                    <label>Maximum Fare ($) — optional</label>
                    <input type="number" class="md-input" id="txtMaxFare" placeholder="—" min="0" step="0.01" />
                  </div>
                </div>
              </div>
              <!-- Schedule section -->
              <div style="margin-top:14px;border-top:1px solid #BBDEFB;padding-top:12px">
                <div style="font-size:13px;font-weight:600;color:#1565C0;margin-bottom:10px">
                  <i class="material-icons" style="vertical-align:middle;font-size:16px;margin-right:4px">&#xE916;</i>
                  Tariff Schedule
                </div>
                <div class="tariff-row" style="align-items:center;margin-bottom:10px">
                  <div class="tariff-col" style="flex:0 0 auto">
                    <label style="font-size:12px;color:#616161;display:block;margin-bottom:4px">Schedule Type</label>
                    <label style="margin-right:16px;font-size:13px;font-weight:normal;cursor:pointer">
                      <input type="radio" name="scheduleType" id="schedAlways" value="always" checked onchange="toggleScheduleFields()" style="margin-right:4px" />
                      Always Active (24/7)
                    </label>
                    <label style="font-size:13px;font-weight:normal;cursor:pointer">
                      <input type="radio" name="scheduleType" id="schedCustom" value="custom" onchange="toggleScheduleFields()" style="margin-right:4px" />
                      Custom Schedule
                    </label>
                  </div>
                </div>

                <!-- Custom fields (hidden by default) -->
                <div id="schedule-fields" style="display:none">
                  <div class="tariff-row" style="margin-bottom:10px">
                    <div class="tariff-col">
                      <div class="tariff-field">
                        <label>Start Date <span style="color:red">*</span></label>
                        <input type="date" class="md-input" id="schedStartDate" />
                      </div>
                    </div>
                    <div class="tariff-col">
                      <div class="tariff-field">
                        <label>End Date <span style="color:red">*</span></label>
                        <input type="date" class="md-input" id="schedEndDate" />
                      </div>
                    </div>
                  </div>

                  <div style="margin-bottom:10px">
                    <label style="font-size:12px;color:#616161;display:block;margin-bottom:6px">Days of Week</label>
                    <div id="days-of-week" style="display:flex;flex-wrap:wrap;gap:6px">
                      <label class="day-chip" data-day="1"><input type="checkbox" value="1" checked /> Mon</label>
                      <label class="day-chip" data-day="2"><input type="checkbox" value="2" checked /> Tue</label>
                      <label class="day-chip" data-day="3"><input type="checkbox" value="3" checked /> Wed</label>
                      <label class="day-chip" data-day="4"><input type="checkbox" value="4" checked /> Thu</label>
                      <label class="day-chip" data-day="5"><input type="checkbox" value="5" checked /> Fri</label>
                      <label class="day-chip" data-day="6"><input type="checkbox" value="6" checked /> Sat</label>
                      <label class="day-chip" data-day="0"><input type="checkbox" value="0" checked /> Sun</label>
                    </div>
                  </div>

                  <div class="tariff-row" style="align-items:center;margin-bottom:8px">
                    <div class="tariff-col" style="flex:0 0 auto">
                      <label style="font-size:13px;font-weight:normal;cursor:pointer">
                        <input type="checkbox" id="schedAllDay" onchange="toggleTimeFields()" style="margin-right:4px" checked />
                        Run all day (00:00 – 23:59)
                      </label>
                    </div>
                  </div>

                  <div id="time-fields" style="display:none">
                    <div class="tariff-row">
                      <div class="tariff-col">
                        <div class="tariff-field">
                          <label>Start Time <span style="color:red">*</span></label>
                          <input type="time" class="md-input" id="schedStartTime" value="08:00" />
                        </div>
                      </div>
                      <div class="tariff-col">
                        <div class="tariff-field">
                          <label>End Time <span style="color:red">*</span></label>
                          <input type="time" class="md-input" id="schedEndTime" value="22:00" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top:14px;display:flex;gap:10px">
                <button type="button" class="md-btn md-btn-primary" onclick="saveTariffZone()">
                  <i class="material-icons" style="vertical-align:middle;font-size:16px">&#xE161;</i> Save Tariff Zone
                </button>
                <button type="button" class="md-btn" onclick="hideSavePanel();deleteSelectedShape()">Cancel</button>
              </div>
            </div>

          </div>
        </div>

        <!-- Records table -->
        <div class="md-card uk-margin-medium-top">
          <div class="md-card-toolbar">
            <h3 class="md-card-toolbar-heading-text">Saved Tariff Zones</h3>
          </div>
          <div class="md-card-content">
            <table id="TblTariffs" class="uk-table">
              <thead class="md-btn-primary">
                <tr>
                  <th>#</th>
                  <th>Zone Name</th>
                  <th>Base Fare</th>
                  <th>Per KM</th>
                  <th>Per Min</th>
                  <th>Min Fare</th>
                  <th>Max Fare</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="tariff-tbody"></tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

  </div>
</div>
</form>

<div class="uni-delete-form"></div>
<div id="toast-msg"></div>

<!-- Google Maps with Drawing Manager -->
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAg5Q5LyM2Bv0xpeHz4gPRG1MwMh71klis&callback=initTariffMap&libraries=drawing"></script>

<script src="assets/js/common.min.js"></script>
<script src="assets/js/uikit_custom.min.js"></script>
<script src="assets/js/altair_admin_common.min.js"></script>
<script src="bower_components/chartist/dist/chartist.min.js"></script>
<script src="bower_components/peity/jquery.peity.min.js"></script>
<script src="bower_components/handlebars/handlebars.min.js"></script>
<script src="assets/js/custom/handlebars_helpers.min.js"></script>
<script>
  if (typeof altair_forms !== 'undefined') {
    altair_forms.parsley_validation_config();
    altair_forms.parsley_extra_validators();
  }
</script>
<script src="assets/js/pages/plugins_datatables.min.js"></script>
<script src="bower_components/parsleyjs/dist/parsley.min.js"></script>
<script src="assets/js/custom/wizard_steps.js"></script>
<script src="JsScripts/Masterjs.js"></script>
<script src="assets/js/pages/forms_wizard.js"></script>
<script src="bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
<script src="bower_components/dataTables.buttons.js"></script>
<script src="assets/js/custom/datatables_uikit.min.js"></script>
<script src="bower_components/buttons.bootstrap.min.js"></script>
<script src="bower_components/buttons.flash.js"></script>
<script src="bower_components/buttons.html5.js"></script>
<script src="bower_components/buttons.print.js"></script>
<script src="assets/DeletePopup/Delete.js"></script>
<script>
$(function() {
  if (typeof altair_helpers !== 'undefined') altair_helpers.retina_images();
  // Highlight active sidebar link
  var path = window.location.pathname.replace(/.*\//, '').toLowerCase().split('?')[0];
  $('#sidebar_main a').each(function(){
    var href = $(this).attr('href');
    if (href && href.toLowerCase().split('?')[0] === path) {
      $(this).closest('li').addClass('active_section');
    }
  });
});
</script>
</body>
</html>
