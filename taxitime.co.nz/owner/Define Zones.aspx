

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8" /><title>
        360Taxi 
</title><link rel="icon" href="assets/img/Logo-03.jpg" />
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
    <link href="bower_components/uikit/css/uikit.almost-flat.min.css" rel="stylesheet" /><link href="assets/css/main.min.css" rel="stylesheet" />
    <script src="DataManager/AjaxHandler.js"></script>
    <link href="DataManager/Validate.css" rel="stylesheet" />
    <script src="DataManager/Validate.js"></script>
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" /><link href="assets/DeletePopup/style2.css" rel="stylesheet" /><link href="assets/css/font-awesome.min.css" rel="stylesheet" /><link href="assets/css/bootstrap.min.css" rel="stylesheet" /><link href="css/dataTables.bootstrap.css" rel="stylesheet" /><link href="css/buttons.bootstrap.css" rel="stylesheet" />
    <script src="JsScripts/Zones.js"></script>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
    <style>
       #map-canvas {
    height:100%;
    width: 100%;
    margin: 10px;
    padding: 10px;
}
        @font-face {
            font-family: 'Material Icons';
            font-style: normal;
            font-weight: 400;
            src: url('https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2') format('woff2'),
                 url('https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNa.woff') format('woff');
        }
        @font-face {
            font-family: 'FontAwesome';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff') format('woff');
            font-weight: normal;
            font-style: normal;
        }
    </style>


</head>

<body class=" sidebar_main_open sidebar_main_swipe">

    
    <header id="header_main">
        <div class="header_main_content">
            <nav class="uk-navbar">
                
                <a href="#" id="sidebar_main_toggle" class="sSwitch sSwitch_left">
                    <span class="sSwitchIcon"></span>
                </a>
                
                <a href="#" id="sidebar_secondary_toggle" class="sSwitch sSwitch_right sidebar_secondary_check">
                    <span class="sSwitchIcon"></span>

                </a>
                
                
                <div class="col-md-offset-2 col-md-4">
                    <label style="color: #fff">Welcome To </label>
                    <label id="lblName" style="color: #fff"></label>

                </div>
                
                <div class="uk-navbar-flip">
                    <ul class="uk-navbar-nav user_actions">
                        <li><a href="#" id="full_screen_toggle" class="user_action_icon uk-visible-large"><i class="material-icons md-24 md-light">&#xE5D0;</i></a></li>
                        <li><a href="#" id="main_search_btn" class="user_action_icon"><i class="material-icons md-24 md-light">&#xE8B6;</i></a></li>
                        <li data-uk-dropdown="{mode:'click',pos:'bottom-right'}">
                            
                            <a href="#" class="user_action_icon" ><i class="material-icons md-24 md-light">&#xE7F4;</i><span class="uk-badge" id="spnTotal"></span></a>
                            <div class="uk-dropdown uk-dropdown-xlarge">
                                <div class="md-card-content">
                                    <ul class="uk-tab uk-tab-grid" data-uk-tab="{connect:'#header_alerts',animation:'slide-horizontal'}">
                                        <li class="uk-width-1-2 uk-active"><a href="#" class="js-uk-prevent uk-text-small" id="SpnEmployeeAccounts"></a></li>
                                        <li class="uk-width-1-2"><a href="#" class="js-uk-prevent uk-text-small" id="SpnParentsAccounts"></a></li>
                                    </ul>
                                    <ul id="header_alerts" class="uk-switcher uk-margin">
                                        <li>
                                            <ul class="md-list md-list-addon" id="EmployeeAccountSection">
                                            </ul>
                                            <div class="uk-text-center uk-margin-top uk-margin-small-bottom">
                                                <a href="#" class="md-btn md-btn-flat md-btn-flat-primary js-uk-prevent">Show All</a>
                                            </div>
                                        </li>
                                        <li>
                                            <ul class="md-list md-list-addon" id="ParentsAccountSection">
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li data-uk-dropdown="{mode:'click',pos:'bottom-right'}">
                            <a href="#" class="user_action_image">
                                <img class="md-user-image Logo" id="UserAction" src="assets/img/Logo-03.jpg" alt="" /></a>
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
    <!-- main header end -->
    <!-- main sidebar -->
    <aside id="sidebar_main">

        <div class="sidebar_main_header">
            <div class="sidebar_logo">
                <a href="#" class="sSidebar_hide">
                    <img  class="Logo" src="assets/img/Logo-03.jpg" alt="" style="height: 100px; width: 100px; border-radius: 50%" /></a>
                <a href="#" class="sSidebar_show">
                    <img src="assets/img/Logo-03.jpg" class="Logo"  alt="" style="height: 50px; width: 50px; border-radius: 50%" /></a>
            </div>
            
        </div>

        <div class="menu_section">
            <ul>
                <li class="current_section" title="Dashboard">
                    <a href="Default.aspx?">
                        <span class="menu_icon"><i class="material-icons">&#xE871;</i></span>
                        <span class="menu_title">Dashboard</span>
                    </a>
                </li>

            
                <li class="current_section" title="Billing">
                    <a href="#">
                        <span class="menu_icon"><i class="material-icons fa fa-credit-card"></i></span>
                        <span class="menu_title">Billing</span>
                    </a>
                    <ul>
                        <li><a href="#">Overview</a></li>
                        <li><a href="Accounts-Details.aspx">Bank Accounts</a></li>
                    </ul>
                </li>
                <li class="current_section" title="Settings">
                    <a>
                        <span class="menu_icon"><i class="material-icons"></i></span>
                        <span class="menu_title">Settings</span>
                    </a>
                    <ul>
                        <li><a href="Dispatch.aspx?">Dispatch</a></li>
                        <li><a href="Service Area.aspx?">Service Area</a></li>
                        <li><a href="Vehicle Type.aspx?">Vehicle Types</a></li>
                        <li><a href="Notifications.aspx?"  >Notifications</a></li>
                        <li><a href="Company_account_detail.aspx?"  >Company Account Details</a></li>
                        <li><a href="Company_card_percent.aspx?"  >Company Card Percentage</a></li>
                    </ul>
                </li>
                <li class="current_section" title="Users">
                    <a href="Users-Registration.aspx?">
                        <span class="menu_icon"><i class="material-icons"></i></span>
                        <span class="menu_title">Users</span>
                    </a>
                </li>
             
                <li class="current_section" title="Vehicles">
                    <a href="Vehicle-Registration.aspx?">
                        <span class="menu_icon"><i class="material-icons  fa fa-car"></i></span>
                        <span class="menu_title">Vehicles</span>
                    </a>
                </li>
                   <li class="current_section" title="Vendors">
                    <a>
                        <span class="menu_icon"><i class="material-icons"></i></span>
                        <span class="menu_title">Vendors</span>
                    </a>
                    <ul>
                        <li><a href="Vendors.aspx?">Registration</a></li>
                        <li><a href="VendorCars.aspx?">Vendors Cars</a></li>
                       
                    </ul>
                </li>
                <li class="current_section" title="Zones">
                    <a href="Define Zones.aspx?">
                        <span class="menu_icon"><i class="material-icons fa fa-puzzle-piece"></i></span>
                        <span class="menu_title">Zones</span>
                    </a>
                </li>
                 
                <li class="current_section" title="Tariffs">
                    <a href="Tariff Schedule.aspx?">
                        <span class="menu_icon"><i class="material-icons fa fa-text-width"></i></span>
                        <span class="menu_title">Tariffs</span>
                    </a>
                </li>
                    <li class="current_section" title="Promo Codes">
                    <a href="#">
                        <span class="menu_icon"><i class="material-icons fa fa-gift"></i></span>
                        <span class="menu_title">Promos</span>
                    </a>
                         <ul>
                        <li><a href="Promos.aspx?">Define</a></li>
                        <li><a href="SegmentedPromos.aspx?">Segmented Entry</a></li>
                             </ul>
                </li>
                 <li class="current_section" title="Reports">
                    <a href="#">
                        <span class="menu_icon"><i class="material-icons fa fa-file-archive-o"></i></span>
                        <span class="menu_title">Reports</span>
                    </a>
                    <ul>
                        <li><a href="ShiftReports.aspx">Shift Reports</a></li>
                        <li><a href="ClosedJobsReports.aspx">Closed Jobs</a></li>
                        <li><a href="CarReports.aspx">Car Jobs</a></li>
                        <li><a href="DriverReports.aspx">Driver Jobs</a></li>
                        
                        <li><a href="Invoice_create.aspx">Create Invoices</a></li>
                        <li><a href="Invoice_send_report.aspx">ALL Invoice Report</a></li>
                        <li><a href="AccReport.aspx">Driver Accout Job</a></li>
                        <li><a href="DispatcherJobsReport.aspx">Dispatcher Jobs</a></li>
                        <li><a href="DriverSummary.aspx">Driver Summary</a></li>
                        <li><a href="DispatchSummary.aspx">Dispatch Summary</a></li>

                        <li><a href="DriverShiftsSummary.aspx">Drivers Shifts Summary </a></li>

                        <li><a href="CarShiftsSummary.aspx">Cars Shifts Summary </a></li>
<li><a href="TotalMobility.aspx">Total Mobility Jobs </a></li>

                        <li><a href="#">Other Reports</a></li>
                    </ul>
                </li>
                
                <li class="current_section" title="Replay">
                    <a href="Replay.aspx?">
                        <span class="menu_icon"><i class="material-icons fa fa-play-circle-o"></i></span>
                        <span class="menu_title">Replay</span>
                    </a>
                </li>
                <li class="current_section" title="Plannings">
                    <a>
                        <span class="menu_icon"><i class="material-icons fa fa-calendar-o"></i></span>
                        <span class="menu_title">Plannings</span>
                    </a>
                    <ul>
                        <li><a href="Users Working Schedule.aspx?">Schedules</a></li>
                        <li><a href="Working Shifts.aspx?" >Shifts</a></li>
                        <li><a href="Assign Shifts.aspx?">Assign Shifts</a></li>
                    </ul>
                </li>
                <li class="current_section" title="Customers">
                    <a>
                        <span class="menu_icon"><i class="material-icons"></i></span>
                        <span class="menu_title">Customers</span>
                    </a>
                    <ul>
                      <li> <a href="Customer Account.aspx?">Customers Accounts</a></li>
                        <li><a>Invoicing</a></li>

                    </ul>
                </li>

                <li class="current_section" title="POIs">
                    <a href="POIs.aspx?">
                        <span class="menu_icon"><i class="material-icons fa fa-thumb-tack"></i></span>
                        <span class="menu_title">POIs</span>
                    </a>

                </li>
                <li class="current_section" title="Jobs">
                    <a>
                        <span class="menu_icon"><i class="material-icons fa fa-ticket"></i></span>
                        <span class="menu_title">Jobs</span>
                    </a>
                    <ul>
                        <li><a href="Jobs Editor.aspx?">Editor</a></li>
                        <li><a href="Jobs Rating.aspx?">Ratings</a></li>
                    </ul>
                </li>


            </ul>
        </div>
    </aside>
    <!-- main sidebar end -->
    <!-- secondary sidebar -->
    
    <!-- secondary sidebar end -->




    
    <form id="form1">

        <div id="page_content">
            <div id="page_content_inner">

                
                <div class="uk-grid">
                    <div class="uk-width-1-1">
                        <div class="md-card">
                            <div class="md-card-toolbar">
                                <div class="md-card-toolbar-actions">
                                    <i class="md-icon material-icons md-card-fullscreen-activate">&#xE5D0;</i>
                                    <i class="md-icon material-icons">&#xE5D5;</i>

                                </div>
                                <h3 class="md-card-toolbar-heading-text">Define Zones
                                    
                                </h3>
                            </div>
                            <div class="uk-grid" data-uk-grid-margin="">


                                
                                <div class="uk-margin-bottom uk-width-medium-1-6 uk-margin-left">
                                    <label for="TxtZone">Zone Name</label>
                                    <input type="text" class="md-input required" id="TxtZone" />

                                </div>
                                <div class="uk-margin-bottom uk-width-medium-1-6">
                                    <label for="TxtCode">Zone Code</label>
                                    <input type="text" class="md-input required" id="TxtCode" />

                                </div>
                                <div class="uk-margin-bottom uk-width-medium-1-6">
                                    <select id="ddlColor" class="md-input">

                                        <option value="#00FFFF" style="background: #00FFFF">Aqua</option>
                                        <option value="#7FFFD4" style="background: #7FFFD4">Aquamarine</option>
                                        <option value="#000000" style="background: #000000">Black</option>

                                        <option value="#0000FF" style="background: #0000FF">Blue</option>
                                        <option value="#8A2BE2" style="background: #8A2BE2">BlueViolet</option>
                                        <option value="#A52A2A" style="background: #A52A2A">Brown</option>
                                        <option value="#DEB887" style="background: #DEB887">BurlyWood</option>

                                        <option value="#5F9EA0" style="background: #5F9EA0">CadetBlue</option>
                                        <option value="#D2691E" style="background: #D2691E">Chocolate</option>
                                        <option value="#6495ED" style="background: #6495ED">CornflowerBlue</option>
                                        <option value="#00FFFF" style="background: #00FFFF">Cyan</option>

                                        <option value="#008B8B" style="background: #008B8B">DarkCyan</option>
                                        <option value="#B8860B" style="background: #B8860B">DarkGoldenRod</option>
                                        <option value="#006400" style="background: #006400">DarkGreen</option>
                                        <option value="#556B2F" style="background: #556B2F">DarkOliveGreen</option>

                                        <option value="#FF8C00" style="background: #FF8C00">DarkOrange</option>
                                        <option value="#8B0000" style="background: #8B0000">DarkRed</option>
                                        <option value="#2F4F4F" style="background: #2F4F4F">DarkSlateGray</option>
                                        <option value="#00BFFF" style="background: #00BFFF">DeepSkyBlue</option>

                                        <option value="#696969" style="background: #696969">DimGray</option>
                                        <option value="#B22222" style="background: #B22222">FireBrick</option>
                                        <option value="#FFD700" style="background: #FFD700">Gold</option>
                                        <option value="#DAA520" style="background: #DAA520">GoldenRod</option>

                                        <option value="#808080" style="background: #808080">Gray</option>
                                        <option value="#008000" style="background: #008000">Green</option>
                                        <option value="#F0E68C" style="background: #F0E68C">Khaki</option>
                                        <option value="#90EE90" style="background: #90EE90">LightGreen</option>

                                        <option value="#20B2AA" style="background: #20B2AA">LightSeaGreen</option>
                                        <option value="#FFB6C1" style="background: #FFB6C1">LightPink</option>
                                        <option value="#87CEFA" style="background: #87CEFA">LightSkyBlue</option>
                                        <option value="#32CD32" style="background: #32CD32">LimeGreen</option>

                                        <option value="#9370DB" style="background: #9370DB">MediumPurple</option>
                                        <option value="#3CB371" style="background: #3CB371">MediumSeaGreen</option>
                                        <option value="#808000" style="background: #808000">Olive</option>
                                        <option value="#6B8E23" style="background: #6B8E23">OliveDrab</option>

                                        <option value="#9ACD32" style="background: #9ACD32">YellowGreen</option>
                                        <option value="#FFFF00" style="background: #FFFF00">Yellow</option>
                                        <option value="#008080" style="background: #008080">Teal</option>
                                        <option value="#D2B48C" style="background: #D2B48C">Tan</option>
                                    </select>


                                </div>

                                

                                <div class="uk-margin-bottom uk-width-medium-1-6">
                                    <label for="ddlTariff">Tariff <small style="color:#9e9e9e;font-size:11px">(optional)</small></label>
                                    <select id="ddlTariff" class="md-input">
                                        <option value="">— No tariff —</option>
                                    </select>
                                </div>

                                <div class="uk-margin-top uk-width-medium-1-6">
                                  
                                        <button id="btnSave" class="md-btn md-btn-primary">Save Record</button>
                                 
                                   
                                </div>
                                 <div class="uk-margin-top uk-width-medium-1-6">

                                        <a class="md-btn md-btn-primary" id="btndelete">Delete Shape</a>
                                    </div>

                            </div>
                           
                                <div class="md-card">

                                    <div class="uk-grid" data-uk-grid-margin="">
                                        <div class="uk-width-medium-1-1"  style="height: 600px">
                                            <div id="map-canvas"></div>
                                        </div>
                                        <div class="uk-width-medium-1-1">
                                            <div class="md-card uk-margin-medium-bottom">

                                                <table id="TblZones" class="uk-table">
                                                    <thead class="md-btn-primary">
                                                        <tr>

                                                            <th>Zone Id</th>
                                                            <th>Zone Name</th>
                                                            <th>Code</th>
                                                            <th>Color</th>
                                                            <th>Tariff</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                    </tbody>
                                                </table>
                                            </div>

                                        </div>

                                    </div>
                                </div>

                         
                        </div>
                    </div>

                </div>
            </div>

        </div>

    </form>
    <div class="uni-delete-form"></div>
    <script async defer
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAg5Q5LyM2Bv0xpeHz4gPRG1MwMh71klis&callback=GetAllRecords&libraries=drawing"></script>



    <!-- common functions -->
    <script src="assets/js/common.min.js"></script>

    <!-- uikit functions -->
    <script src="assets/js/uikit_custom.min.js"></script>
    <!-- altair common functions/helpers -->
    <script src="assets/js/altair_admin_common.min.js"></script>


    <script src="bower_components/chartist/dist/chartist.min.js"></script>
    <!-- peity (small charts) -->
    <script src="bower_components/peity/jquery.peity.min.js"></script>

    <!-- handlebars.js -->
    <script src="bower_components/handlebars/handlebars.min.js"></script>
    <script src="assets/js/custom/handlebars_helpers.min.js"></script>


    <!--  dashbord functions -->
       
    <script>
        // load parsley config (altair_admin_common.js)
        if (typeof altair_forms !== 'undefined') {
            altair_forms.parsley_validation_config();
            altair_forms.parsley_extra_validators();
        }
    </script>
     <script src="assets/js/pages/plugins_datatables.min.js"></script>
    <script src="bower_components/parsleyjs/dist/parsley.min.js"></script>
    <!-- jquery steps -->
    <script src="assets/js/custom/wizard_steps.js"></script>
    <script src="JsScripts/Masterjs.js"></script>
    <!--  forms wizard functions -->
    <script src="assets/js/pages/forms_wizard.js"></script>
    <script src="bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
    <script src="bower_components/dataTables.buttons.js"></script>

    <!-- datatables custom integration -->
    <script src="assets/js/custom/datatables_uikit.min.js"></script>

    <!--  datatables functions -->

    <script src="bower_components/buttons.bootstrap.min.js"></script>
    <script src="bower_components/buttons.flash.js"></script>
    <script src="bower_components/buttons.html5.js"></script>
    <script src="bower_components/buttons.print.js"></script>
    <script src="assets/DeletePopup/Delete.js"></script>
    


    <script>
        $(function () {
            // enable hires images
            altair_helpers.retina_images();
            // fastClick (touch devices)
            if (Modernizr.touch) {
                FastClick.attach(document.body);
            }
            var d = new Date();
            var month = d.getMonth() + 1;
            var date = d.getDate();
            var output = d.getFullYear() + '-' +
                (('' + month).length < 2 ? '0' : '') +
                month + '-' +
                (('' + date).length < 2 ? '0' : '') + date;
            $("input[type=date]").val(output);
        });
    </script>

    

    <div id="style_switcher">
        <div id="style_switcher_toggle"><i class="material-icons">&#xE8B8;</i></div>
        <div class="uk-margin-medium-bottom">
            <h4 class="heading_c uk-margin-bottom">Colors</h4>
            <ul class="switcher_app_themes" id="theme_switcher">
                <li class="app_style_default active_theme" data-app-theme="">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_a" data-app-theme="app_theme_a">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_b" data-app-theme="app_theme_b">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_c" data-app-theme="app_theme_c">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_d" data-app-theme="app_theme_d">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_e" data-app-theme="app_theme_e">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_f" data-app-theme="app_theme_f">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
                <li class="switcher_theme_g" data-app-theme="app_theme_g">
                    <span class="app_color_main"></span>
                    <span class="app_color_accent"></span>
                </li>
            </ul>
        </div>
        <div class="uk-visible-large uk-margin-medium-bottom">
            <h4 class="heading_c">Sidebar</h4>
            <p>
                <input type="checkbox" name="style_sidebar_mini" id="style_sidebar_mini" data-md-icheck />
                <label for="style_sidebar_mini" class="inline-label">Mini Sidebar</label>
            </p>
        </div>
        <div class="uk-visible-large">
            <h4 class="heading_c">Layout</h4>
            <p>
                <input type="checkbox" name="style_layout_boxed" id="style_layout_boxed" data-md-icheck />
                <label for="style_layout_boxed" class="inline-label">Boxed layout</label>
            </p>
        </div>
    </div>
    <script>
        $(function () {
            var $switcher = $('#style_switcher'),
                $switcher_toggle = $('#style_switcher_toggle'),
                $theme_switcher = $('#theme_switcher'),
                $mini_sidebar_toggle = $('#style_sidebar_mini'),
                $boxed_layout_toggle = $('#style_layout_boxed'),
                $body = $('body');


            $switcher_toggle.click(function (e) {
                e.preventDefault();
                $switcher.toggleClass('switcher_active');
            });

            $theme_switcher.children('li').click(function (e) {
                e.preventDefault();
                var $this = $(this),
                    this_theme = $this.attr('data-app-theme');

                $theme_switcher.children('li').removeClass('active_theme');
                $(this).addClass('active_theme');
                $body
                    .removeClass('app_theme_a app_theme_b app_theme_c app_theme_d app_theme_e app_theme_f app_theme_g')
                    .addClass(this_theme);

                if (this_theme == '') {
                    localStorage.removeItem('altair_theme');
                } else {
                    localStorage.setItem("altair_theme", this_theme);
                }

            });

            // hide style switcher
            $(document).on('click keyup', function (e) {
                if ($switcher.hasClass('switcher_active')) {
                    if (
                        (!$(e.target).closest($switcher).length)
                        || (e.keyCode == 27)
                    ) {
                        $switcher.removeClass('switcher_active');
                    }
                }
            });

            // get theme from local storage
            if (localStorage.getItem("altair_theme") !== null) {
                $theme_switcher.children('li[data-app-theme=' + localStorage.getItem("altair_theme") + ']').click();
            }


            // toggle mini sidebar

            // change input's state to checked if mini sidebar is active
            if ((localStorage.getItem("altair_sidebar_mini") !== null && localStorage.getItem("altair_sidebar_mini") == '1') || $body.hasClass('sidebar_mini')) {
                $mini_sidebar_toggle.iCheck('check');
            }

            $mini_sidebar_toggle
                .on('ifChecked', function (event) {
                    $switcher.removeClass('switcher_active');
                    localStorage.setItem("altair_sidebar_mini", '1');
                    location.reload(true);
                })
                .on('ifUnchecked', function (event) {
                    $switcher.removeClass('switcher_active');
                    localStorage.removeItem('altair_sidebar_mini');
                    location.reload(true);
                });


            // toggle boxed layout

            // change input's state to checked if mini sidebar is active
            if ((localStorage.getItem("altair_layout") !== null && localStorage.getItem("altair_layout") == 'boxed') || $body.hasClass('boxed_layout')) {
                $boxed_layout_toggle.iCheck('check');
                $body.addClass('boxed_layout');
                $(window).resize();
            }

            // toggle mini sidebar
            $boxed_layout_toggle
                .on('ifChecked', function (event) {
                    $switcher.removeClass('switcher_active');
                    localStorage.setItem("altair_layout", 'boxed');
                    location.reload(true);
                })
                .on('ifUnchecked', function (event) {
                    $switcher.removeClass('switcher_active');
                    localStorage.removeItem('altair_layout');
                    location.reload(true);
                });


        });
    </script>
     
       
 
 <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script> 
<script defer src="https://static.cloudflareinsights.com/beacon.min.js/v8c78df7c7c0f484497ecbca7046644da1771523124516" integrity="sha512-8DS7rgIrAmghBFwoOTujcf6D9rXvH8xm8JQ1Ja01h9QX8EzXldiszufYa4IFfKdLUKTTrnSFXLDkUEOTrZQ8Qg==" data-cf-beacon='{"version":"2024.11.0","token":"6855be97295b455e994f24411d610193","r":1,"server_timing":{"name":{"cfCacheStatus":true,"cfEdge":true,"cfExtPri":true,"cfL4":true,"cfOrigin":true,"cfSpeedBrain":true},"location_startswith":null}}' crossorigin="anonymous"></script>
</body>
</html>



