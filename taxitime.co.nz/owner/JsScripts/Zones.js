$(function () {
    FnZones();
    $("#form1").submit(function () {

        return false;
    });
    $("#btnSave").click(function () {
        //google.maps.event.trigger(bermudaTriangle, 'click');

    });



});
function initZonesTable() {
    if ($.fn.dataTable.isDataTable('#TblZones')) {
        table = $('#TblZones').DataTable();
    } else {
        var dtBtns = [];
        if ($.fn.dataTable && $.fn.dataTable.ext && $.fn.dataTable.ext.buttons) {
            if ($.fn.dataTable.ext.buttons.copyHtml5)  dtBtns.push({ extend: 'copy',  exportOptions: { columns: [0,1] } });
            if ($.fn.dataTable.ext.buttons.csvHtml5)   dtBtns.push({ extend: 'csv',   exportOptions: { columns: [0,1] } });
            if ($.fn.dataTable.ext.buttons.excelHtml5) dtBtns.push({ extend: 'excel', exportOptions: { columns: [0,1] } });
        }
        try {
            table = $('#TblZones').DataTable({
                'pageLength': 5,
                'lengthMenu': [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'All']],
                'ordering': false,
                'fnRowCallback': function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $(nRow).attr('id', aData[0]);
                    return nRow;
                },
                dom: dtBtns.length ? 'Bfrtip' : 'frtip',
                buttons: dtBtns
            });
        } catch(e) { console.warn('[Zones] DataTable error:', e.message); }
    }
}
function loadTariffsIntoDropdown() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
    firebase.database().ref('tariffZones').once('value').then(function(snap) {
        var sel = document.getElementById('ddlTariff');
        if (!sel) return;
        snap.forEach(function(child) {
            var t = child.val();
            if (!t) return;
            var name = t.TariffName || t.zoneName || t.name || child.key;
            var opt = document.createElement('option');
            opt.value = child.key;
            opt.textContent = name;
            sel.appendChild(opt);
        });
    }).catch(function() {});
}

function FnZones()
{
    if (typeof altair_helpers !== 'undefined') altair_helpers.content_preloader_show();

    loadTariffsIntoDropdown();

    function _done() {
        if (typeof altair_helpers !== 'undefined') altair_helpers.content_preloader_hide();
    }

    // Try Firebase first
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        firebase.database().ref('zones').once('value').then(function(snap) {
            $('#TblZones tbody').empty();
            snap.forEach(function(child) {
                var z = child.val();
                var id      = z.Id   || z.id   || child.key;
                var name    = z.ZoneName || z.name || z.zoneName || '';
                var code    = z.Code || z.code || '';
                var col     = z.Color|| z.color|| '#eee';
                var tariff  = z.tariffName || (z.tariffId ? z.tariffId : '—');
                $('#TblZones tbody').append(
                    "<tr style='background:" + col + "'><td>" + id + "</td><td>" + name +
                    "</td><td>" + code + "</td><td>" + col +
                    "</td><td style='font-size:12px'>" + tariff +
                    "</td><td><a class='md-icon material-icons' onclick='E(this)'></a>" +
                    "<a class='md-icon material-icons clsdelete' onclick='d(this)'></a></td></tr>");
            });
            initZonesTable();
            _done();
        }).catch(function(err) {
            console.warn('[Zones] Firebase read failed:', err.message);
            // fallback to ASP.NET handler (expected to 404 silently)
            var param = []; var proc = 'ProcGetAllZones';
            Selector1(param, proc).then(function(result) {
                try {
                    $res = JSON.parse(result.d);
                    $('#TblZones tbody').empty();
                    for ($i = 0; $i < $res.length; $i++) {
                        $('#TblZones tbody').append("<tr style='background:" + $res[$i].Color + "'><td>" + $res[$i].Id + "</td><td>" + $res[$i].ZoneName + "</td><td>" + $res[$i].Code + "</td><td>" + $res[$i].Color + "</td><td><a class='md-icon material-icons' onclick='E(this)'></a><a class='md-icon material-icons clsdelete' onclick='d(this)'></a></td></tr>");
                    }
                } catch(e) {}
                initZonesTable(); _done();
            }).fail(function() { initZonesTable(); _done(); });
        });
    } else {
        // No Firebase — try ASP.NET fallback
        var param = []; var proc = 'ProcGetAllZones';
        Selector1(param, proc).then(function (result) {
            try {
                $res = JSON.parse(result.d);
                $('#TblZones tbody').empty();
                for ($i = 0; $i < $res.length; $i++) {
                    $('#TblZones tbody').append("<tr style='background:" + $res[$i].Color + "'><td>" + $res[$i].Id + "</td><td>" + $res[$i].ZoneName + "</td><td>" + $res[$i].Code + "</td><td>" + $res[$i].Color + "</td><td><a class='md-icon material-icons' onclick='E(this)'></a><a class='md-icon material-icons clsdelete' onclick='d(this)'></a></td></tr>");
                }
            } catch(e) {}
            initZonesTable(); _done();
        }).fail(function () {
            console.warn('[Zones] Backend not available for zones table.');
            initZonesTable(); _done();
        });
    }
}
var allcodinit = [];
function initMapFallback() {
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 9,
        center: { lat: 33.7294, lng: 73.0931 },
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var drawingManager = new google.maps.drawing.DrawingManager({
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
            strokeColor: '#66a3ff', strokeOpacity: 0.8, strokeWeight: 3,
            fillOpacity: 0.35, editable: true, dragable: true,
            zIndex: 1, clickable: true, fillColor: '#66a3ff', suppressUndo: true
        }
    });
    drawingManager.addListener('overlaycomplete', function (e) {
        drawingManager.setDrawingMode(null);
        var newShape = e.overlay;
        newShape.type = e.type;
        google.maps.event.addListener(newShape, 'click', function () { setSelection(newShape); });
        setSelection(newShape);
    });
    google.maps.event.addDomListener(document.getElementById('btndelete'), 'click', deleteSelectedShape);
    google.maps.event.addDomListener(document.getElementById('btnSave'), 'click', InsertCoordinates);
    drawingManager.setMap(map);
}

function GetAllRecords() {

    var param = [];
    var proc = 'ProcZonesCordinates';
    Selector(param, proc).then(function (result) {
        var coordinatesArray = [], triangleCoords = [];
        $res = JSON.parse(result.d);
        allcodinit = $res["dt2"];
        //for ($i = 0; $i < $res["dt3"].length; $i++) {

        //    coordinatesArray.push(new google.maps.LatLng(parseFloat($res["dt3"][$i].Lat), parseFloat($res["dt3"][$i].Lng)));

        //}
        
       map = new google.maps.Map(document.getElementById('map-canvas'), {
            zoom: 9,
            center: {
                lat: parseFloat(33.7294), lng: parseFloat(73.0931)
            },
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });


        //triangleCoords = coordinatesArray.slice();
        //bermudaTriangle = new google.maps.Polygon({
        //    paths: triangleCoords,
        //    strokeColor: '#ffb600',
        //    strokeOpacity: 0.8,
        //    strokeWeight: 3,
        //    fillColor: '#fff',
        //    fillOpacity: 0.35,
        //    content: "Company Service Area"
           
        //});

        //bermudaTriangle.setMap(map);

        //bermudaTriangle.addListener('click', showArrays);
       console.log($res);

        if ($res["dt2"].length != []) {
            var arr = new Array();
            var polygons = [];
            var bounds = new google.maps.LatLngBounds();
            var markers = [];
            var a = 0;
            var xmlString = '<subdivisions>';
            for ($i = 0; $i < $res["dt1"].length; $i++) {
               
                xmlString += '<subdivision name="' + $res["dt1"][$i].ZoneName + '" Color="' + $res["dt1"][$i].Color + '">';

                for ($j = 0; $j < $res["dt1"][$i].Row_Count; $j++) {

                    xmlString += '<coord lat="' + $res["dt2"][a].Lat + '" lng="' + $res["dt2"][a].Lng + '"/>';
                    a++;
                }
                xmlString += '</subdivision>';

            }
            xmlString += '</subdivisions>';


            var xml = xmlParse(xmlString);
            console.log(xml)
            var subdivision = xml.getElementsByTagName("subdivision");
            for (var i = 0; i < subdivision.length; i++) {

                arr = [];
                var coordinates = xml.documentElement.getElementsByTagName("subdivision")[i].getElementsByTagName("coord");
                for (var j = 0; j < coordinates.length; j++) {
                    arr.push(new google.maps.LatLng(
                          parseFloat(coordinates[j].getAttribute("lat")),
                          parseFloat(coordinates[j].getAttribute("lng"))
                    ));

                    bounds.extend(arr[arr.length - 1]);
                }
                polygons.push(new google.maps.Polygon({
                    paths: arr,
                    strokeColor:   '#66a3ff',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: subdivision[i].getAttribute("Color"),
                    fillOpacity: 0.35, 
                    visible: true,
                    zIndex   :2000000000,
                    clickable: true,
                    editable: false,
                   geodesic : true

                }));
                google.maps.event.addListener(polygons[polygons.length - 1], "mouseover", function ( ) {
                    
                    this.setOptions({
                        strokeWeight: 6.0,
                        edge: 1,
                        path: 1,
                        vertex: 1,
                        strokeColor: '#66a3ff',
                        strokeOpacity: 0.8,
                      
                        fillOpacity: 0.35,
                        editable: true,
                        zIndex: 1,
                        clickable: true,
                
                        suppressUndo: true,

                        stop: null
                    });
                });

                google.maps.event.addListener(polygons[polygons.length - 1], "mouseout", function ( ) {
                    this.setOptions({
                        strokeWeight: 3.0,
                        edge: 0,
                        path: 0,
                        vertex: 0,
                    
                        strokeOpacity: 0.8,
                        strokeColor: '#66a3ff',
                        fillOpacity: 0.35, 
                        visible: true,
                  
                        clickable: true,
                        editable: false,
                        geodesic : true,
                        stop: null
                    });
                });
 
                //polygons[polygons.length - 1].addListener('click', showArrays);
                //var myLatlng =  bounds.getCenter();
                //console.log(myLatlng);
               
                //new google.maps.Marker({
                //    position: myLatlng,
                //    label: { text: $res["dt1"][i].ZoneName },
                //    map: map
                //});


                polygons[polygons.length - 1].setMap(map);
            }

            map.fitBounds(bounds);

          
      
        }

            // });
           
            var drawingManager = new google.maps.drawing.DrawingManager({

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
                    strokeColor: '#66a3ff',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    fillOpacity: 0.35,
                    editable: true,
                    dragable:true,
                    zIndex: 1,
                    clickable: true,
                    fillColor: '#66a3ff',
                    suppressUndo: true,
                    
                   
                },
              

            });
            var counter = 0;
            drawingManager.addListener('overlaycomplete', function (e) {
                drawingManager.setDrawingMode(null);
                 
                //var locations = e.overlay.getPath();
                //var contentString = '';

                //// Iterate over the vertices.
                //for (var i = 0; i < locations.getLength() ; i++) {
                //    var xy = locations.getAt(i);
                //    contentString += '<br>' + 'Coordinate ' + i + ':<br>' + xy.lat() + ',' +
                //        xy.lng();

                //    //coordinatesArray.push({ "LatId": xy.lat(), "LngId": xy.lng() });
                //}
                  
                var newShape = e.overlay;
                console.log(newShape);
                if (allcodinit.length == 0) {

                } else {
                    formatshape(newShape);

                }

 
                newShape.type = e.type;
                google.maps.event.addListener(newShape.getPath(), 'insert_at', function (index, obj) {
                    console.log(index);
                    if (allcodinit.length == 0) {

                    } else {
                        formatshape(newShape);

                    }

                    console.log(obj);
                });
                google.maps.event.addListener(newShape.getPath(), 'bounds_changed', function (index, obj) {
                    console.log(index);
                    if (allcodinit.length == 0) {

                    } else {
                        formatshape(newShape);

                    }
                    console.log(obj);
                });
                    
                google.maps.event.addListener(newShape, 'click', function () {
                 
     
                    setSelection(newShape);

                });

                setSelection(newShape);
                
            });

       

            //google.maps.event.addListener(drawingManager, "drawingmode_changed", function () {
            //    alert("select");
               
                     
            //});
            //map.addListener('click', addLatLng);
            //google.maps.event.addDomListener(map, 'mouseover', function () {
            //    pee = setInterval(function () {
                    
                     
            //    }, 1000);
            //});
            //google.maps.event.addDomListener(map, 'mouseout', function () {
            //    clearInterval(pee);
            //});
            // drawingManager.addListener('drawingmode_changed', clearSelection);
            google.maps.event.addDomListener(document.getElementById('btndelete'), 'click', deleteSelectedShape);
            google.maps.event.addDomListener(document.getElementById('btnSave'), 'click', InsertCoordinates);
            //drawingManager.addListener('drawingmode_changed', clearSelection);
            // google.maps.event.addListener(polygons, 'click', Delete);
            drawingManager.setMap(map);
       
    }).fail(function() {
        console.warn('Backend not available, initializing map in demo mode.');
        initMapFallback();
    });
    

    } 
function formatshape(newShape) {
    if (newShape) {
        var locations = newShape.getPath();
        for (var i = 0; i < locations.getLength() ; i++) {
            var xy = locations.getAt(i);
                  
            console.log(allcodinit.length);
            var minpoint = allcodinit[0] ;
            for (var p = 0 ; p < allcodinit.length; p++) {
 
                var diss =       distance(allcodinit[p]['Lat'],allcodinit[p]['Lng'] , xy.lat(), xy.lng() , "K");
                console.log(diss);
                minpointdistance = distance(minpoint['Lat'],minpoint['Lng'] , xy.lat(), xy.lng() , "K")
                if (diss < minpointdistance) {
                    minpoint = allcodinit[p];
                }
               
            }
            minpointdistance = distance(minpoint['Lat'], minpoint['Lng'], xy.lat(), xy.lng(), "K")

            if (minpointdistance <= 0.5) {
                console.log("true");
                flightPath = newShape;
                //flightPath.setEditable(false);
                // update the path
                var lato = minpoint['Lat'];
                var lngo = minpoint['Lng'];

                var path = flightPath.getPath();
                path.setAt(i, new google.maps.LatLng(lato, lngo));
                //path.setAt(e.vertex, new google.maps.LatLng(allcodinit[p]['Lat'], allcodinit[p]['Lng']));
                flightPath.setPath(path);
            }

                     
        }
    }
}    


    function distance(lat1, lon1, lat2, lon2, unit) {
        if ((lat1 == lat2) && (lon1 == lon2)) {
            return 0;
        }
        else {
            var radlat1 = Math.PI * lat1/180;
            var radlat2 = Math.PI * lat2/180;
            var theta = lon1-lon2;
            var radtheta = Math.PI * theta/180;
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
                dist = 1;
            }
            dist = Math.acos(dist);
            dist = dist * 180/Math.PI;
            dist = dist * 60 * 1.1515;
            if (unit=="K") { dist = dist * 1.609344 }
           
            return dist;
        }
    }
    function addLatLng(event) {
    alert("asdasd");
    //var path = polygonOptions.getPath();

    //// Because path is an MVCArray, we can simply append a new coordinate
    //// and it will automatically appear.
    //path.push(event.latLng);

    //// Add a new marker at the new plotted point on the polyline.
    //var marker = new google.maps.Marker({
    //    position: event.latLng,
    //    title: '#' + path.getLength(),
    //    map: map
    //});
}
function showArrays(event) {
    // Since this polygon has only one path, we can call getPath() to return the
    // MVCArray of LatLngs.
   var infoWindow = new google.maps.InfoWindow();
    var vertices = this.getPath();
    
    //var contentString = '<b>Bermuda Triangle polygon</b><br>' +
    //    'Clicked location: <br>' + event.latLng.lat() + ',' + event.latLng.lng() +
    //    '<br>';

    //// Iterate over the vertices.
    //for (var i =0; i < vertices.getLength(); i++) {
    //    var xy = vertices.getAt(i);
    //    contentString += '<br>' + 'Coordinate ' + i + ':<br>' + xy.lat() + ',' +
    //        xy.lng();
    //}
    //infoWindow.setContent("<div style='color:#0000;font-family:Garamond;font-size:larger;font-weight:bold'>" + this.content + "</div>");
    //infoWindow.setPosition(event.latLng);

    //infoWindow.open(map);
}
var map,  coordinates, bermudaTriangle, triangleCoords = [], coordinatesArray = [], companyLatLng = [];

function xmlParse(str) {
    if (typeof ActiveXObject != 'undefined' && typeof GetObject != 'undefined') {
        var doc = new ActiveXObject('Microsoft.XMLDOM');
        doc.loadXML(str);
        return doc;
    }

    if (typeof DOMParser != 'undefined') {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }

    return createElement('div', null);
}
var selectedShape;
function deleteSelectedShape() {
    if (selectedShape) {
        selectedShape.setMap(null);
    }
}
function clearSelection() {
    if (selectedShape) {
        selectedShape.setEditable(false);
        selectedShape = null;
    }
}
function setSelection(shape) {
    clearSelection();
    selectedShape = shape;
    shape.setEditable(true);
    
}

function InsertCoordinates() {
  
    var isValid = true;
    $('input[type="text"].required').each(function () {
        if ($.trim($(this).val()) == '') {
            isValid = false;
            $(this).css({
                "border": "1px solid red",

            });
            $.trim($(this).prop('placeholder', 'This filed is required'))
        }
        else {
            $(this).css({
                "border": "",
                "background": ""
            });
        }
    });
    if (isValid == false) {
        e.preventDefault();
    }
    else {
        altair_helpers.content_preloader_show();
        if (selectedShape) {

            // Handle polygon, rectangle, and circle shapes correctly
            var shapeType = selectedShape.type || (selectedShape.getPath ? 'polygon' : (selectedShape.getBounds ? 'rectangle' : 'circle'));

            if (shapeType === 'rectangle' || typeof selectedShape.getBounds === 'function' && typeof selectedShape.getPath !== 'function') {
                // Rectangle — extract the 4 corner coordinates from bounds
                var bounds = selectedShape.getBounds();
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var nw = new google.maps.LatLng(ne.lat(), sw.lng());
                var se = new google.maps.LatLng(sw.lat(), ne.lng());
                [ne, nw, sw, se].forEach(function(pt) {
                    coordinatesArray.push({ "parm1": pt.lat(), "parm2": pt.lng(), "parm3": "", "parm4": "" });
                });
            } else if (shapeType === 'circle' || typeof selectedShape.getCenter === 'function') {
                // Circle — approximate as polygon with 36 points
                var center = selectedShape.getCenter();
                var radius = selectedShape.getRadius(); // metres
                var steps = 36;
                for (var s = 0; s < steps; s++) {
                    var angle = (s / steps) * 2 * Math.PI;
                    var lat = center.lat() + (radius / 111320) * Math.cos(angle);
                    var lng = center.lng() + (radius / (111320 * Math.cos(center.lat() * Math.PI / 180))) * Math.sin(angle);
                    coordinatesArray.push({ "parm1": lat, "parm2": lng, "parm3": "", "parm4": "" });
                }
            } else {
                // Polygon (default)
                var locations = selectedShape.getPath();
                for (var i = 0; i < locations.getLength(); i++) {
                    var xy = locations.getAt(i);
                    coordinatesArray.push({ "parm1": xy.lat(), "parm2": xy.lng(), "parm3": "", "parm4": "" });
                    console.log(xy.lat());
                }
            }
            var selectedTariff = $("#ddlTariff").val() || '';
            var selectedTariffName = selectedTariff ? ($("#ddlTariff option:selected").text() || '') : '';
            var newZone = {
                Id:          Date.now(),
                ZoneName:    $("#TxtZone").val(),
                Code:        $("#TxtCode").val(),
                Color:       $("#ddlColor option:selected").val(),
                coordinates: coordinatesArray,
                tariffId:    selectedTariff,
                tariffName:  selectedTariffName
            };
            // Save to Firebase if available
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
                firebase.database().ref('zones/' + newZone.Id).set(newZone).then(function() {
                    altair_helpers.content_preloader_hide();
                    location.reload();
                }).catch(function(err) {
                    console.warn('[Zones] Firebase save failed:', err.message);
                    // Fall back to legacy backend
                    Action1([
                        { "name": "ZoneName", "Value": newZone.ZoneName },
                        { "name": "Code",     "Value": newZone.Code },
                        { "name": "Color",    "Value": newZone.Color },
                        { "name": "ZoneId",   "Value": "" }
                    ], "4", coordinatesArray, "[ProInsertZone]", "Retrieve");
                    location.reload();
                });
            } else {
                Action1([
                    { "name": "ZoneName", "Value": newZone.ZoneName },
                    { "name": "Code",     "Value": newZone.Code },
                    { "name": "Color",    "Value": newZone.Color },
                    { "name": "ZoneId",   "Value": "" }
                ], "4", coordinatesArray, "[ProInsertZone]", "Retrieve");
                location.reload();
            }
        }
        else {
            alert("Select Area for Zone");
        }
        altair_helpers.content_preloader_hide();
        }

       
}
function FnNewScedule()
{
    clearSelection();
    var param = [];
    var proc = '[ProcNewZone]';
    Selector1(param, proc).then(function (result) {
        $res = JSON.parse(result.d);
       $Newrow  =table.row.add([
              $res[0].Id,
             $res[0].ZoneName,
              $res[0].Code,
              $res[0].Color,
             "<i class='md-icon material-icons' onclick='E(this)'></i><i class='md-icon material-icons clsdelete' onclick='d(this)'></i>",



        ]).draw(false);
       
    });
  
}
var abc;
function d(hello) {

    abc = $(hello).closest("tr").find("td:eq(0)").text();
    deleteFn(hello, 1);
}
function DeleteRow() {
    altair_helpers.content_preloader_show();
    ActionDelete([
        { "name": "ZoneId", "Value": $("#Id").val() },
    ], "[ProcDeleteZone]");
    altair_helpers.content_preloader_hide();

}
function FnRowDelete() {
    GetAllRecords();
    table.row("#" + abc + "").remove().draw(false);
    $(".delete-dialog").removeClass("animated bounceIn").fadeOut();


}
function Result(reslt) {
    if (reslt == "Record Already Exists" || reslt == "Operation Not Successfully Performed") {
        window.location.href = "Define Zones.aspx?";
    }
    else if (reslt == "SessionNull") {
        window.location.href = "OnwerLogin.aspx?";
    }
}
function E(ele)
{
    alert();
}






