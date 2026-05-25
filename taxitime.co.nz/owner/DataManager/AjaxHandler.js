var  ret;
function Selector(param, proc) {
    var url = "DataManager/Data.aspx/DataSelector";
   
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            ret = data;
        },
        async:true,
        error: errorFn
    });
    
}
function Selector1(param, proc) {
    var url = "DataManager/Data.aspx/DataSelectorLess";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            ret = data;
            
        },
        async: true,
        error: errorFn
    });

}
function ActionSignUp(param, Password, proc, Status) {
    var url = "DataManager/Data.aspx/DataProcessorSignUp";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "Password": Password,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed" && Status == "Retrieve") {

                FnNewRecord();

            }

            Result(data.d);

        },
        error: errorFn

    });
}
function FnLogin(param, proc, Password) {
    var url = "DataManager/Data.aspx/LoginSelector";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc,
            "Password": Password

        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            console.log(data);
            ret = data;

        },
        async: true,
        error: errorFn
    });

}
function Action(param,proc) {
    var url = "DataManager/Data.aspx/DataProcessor";
   return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
           
        },
        error: errorFn
       
   });
}
function ActionCheck(param, proc) {
    var url = "DataManager/Data.aspx/DataProcessor";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
           
            Result(data.d);

        },
        error: errorFn

    });
}
function ActionDelete(param, proc)
{
    var url = "DataManager/Data.aspx/DataProcessor";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed") {
                FnRowDelete();

            }
        },
        error: errorFn

    });
}
function FnGeneral(param, proc) {
    var url = "DataManager/Data.aspx/GeneralSelector";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            ret = data;

        },
        async: true,
        error: errorFn
    });

}
function Actionperform(param, proc) {
    var url = "DataManager/Data.aspx/DataProcessor";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed") {
                AfterUpdate();

            }
        },
        error: errorFn

    });
}
function ActionUpdate22(param, proc) {
    var url = "DataManager/Data.aspx/DataProcessor22";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed") {
                AfterUpdate();

            }
        },
        error: errorFn

    });
}
function ActionUpdate(param, proc) {
    var url = "DataManager/Data.aspx/DataProcessor";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
         
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed") {
                AfterUpdate();

            }
        },
        error: errorFn

    });
}
function ActionNewRecord(param, proc,Status) {
    var url = "DataManager/Data.aspx/DataProcessor";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "action": proc
        }), 
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
                if (data.d == "Operation Successfully Performed" && Status == "Retrieve") {

                    FnNewRecord();

                }
                if (data.d == "Operation Successfully Performed" && Status == "Retrieve2") {
                    FnNewRecord2();
                }
                //if (data.d == "Success" && Status == "adddata") {
                //    FnNewRecord2();
                //}
        },
        error: errorFn

    });
}

function Action1(param,col,arry,proc,FnName) {
    var url = "DataManager/Data.aspx/DataProcessor1";
    return $.ajax({
        url: url,
        type: "POST",
        datatype: "json",
        data: JSON.stringify({
            "data": param,
            "colms": col,
            "Details":arry,
            "action": proc
        }),
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            SuccMessage(data.d);
            if (data.d == "Operation Successfully Performed" && FnName == "Retrieve")
            {
                FnNewScedule();
            }
            else if (data.d == "Operation Successfully Performed" && FnName == "UpdatedRetrieve")
            {
                AfterUpdate();
            }
           

        },
        error: errorFn
    });
}
function errorFn(err, status, xhr) {
    if (err && err.status === 404) {
        console.warn("Backend not available (demo mode): " + (err.responseURL || ''));
    } else {
        ErrMessage("Error, Contact the adminstration for the correction");
    }
}

//function Once(fn, context) {
//    var result;
//    return function () {
//        if (fn) {
//            result = fn.apply(context || this, arguments);
//            fn = null;
//        }
//        return result;
//    };
//}

//var toast = Once(function (cl1, cl2, text) {
//    $toast = "<div class='container " + cl1 + "'>" +
//         "<button type='button' class='close cl-toast' style='margin-top:5px'>&times;</button>" +
//        "<h4 class='" + cl2 + "'>" + text + "</h4>" +
//    "</div>";

//    return $toast;
//});
