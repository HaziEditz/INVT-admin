function deleteFn(element,col)
{
    var column = col - 1;
    $(".uni-delete-form").empty();
    $(".uni-delete-form").append('<div class="delete-dialog">' +
            '<div class="row">' +
                '<div class="col-sm-12 has-feedback" style="padding:2px">' +
                    '<input type="text" name="Id" id="Id" hidden="hidden" value=' + $(element).closest("tr").find("td:eq(" + column + ")").text() + '>' +
                    '<h5 style="display:inline">Are You Sure To Delete?</h5>' +
                    '<button type="button" class="md-btn-primary md-btn-small text-right close-del-dialog btn-sm">No</button>' +
                    '<input type="submit" class="md-btn-primary md-btn-small text-right" id="Submit3" onclick="DeleteRow(this)" value="Yes"/>' +
                '</div>' +
            '</div>' +
    '</div>');
    if ($(window).width() <= 350) {
        $(".delete-dialog").css({
            top: $(element).closest("tr").offset().top - 110,
            left: $(element).closest("tr").offset().left - 78
        });
    } else {
        $ww = $(window).width();
        $eleOff = $(element).closest("tr").find(".clsdelete").offset().left;
        $dia_box = $(".delete-dialog").width();
        $total = $eleOff + $dia_box;
        $left = $total > $ww ? ($total - $ww)  : 0;
        console.log(($eleOff - $left));
        $(".delete-dialog").css({
            top: $(element).closest("tr").offset().top - 55,
            left: ($eleOff - ( $left + 100 ))
        });
    }
    $(".delete-dialog").removeClass("animated fadeOutOutDown").addClass("animated bounceIn").show();
}
function deleteFn2(element, col) {
    var column = col - 1;
    $(".uni-delete-form").empty();
    $(".uni-delete-form").append('<div class="delete-dialog">' +
            '<div class="row">' +
                '<div class="col-sm-12 has-feedback" style="padding:2px">' +
                    '<input type="text" name="Id" id="Id" hidden="hidden" value=' + $(element).closest("tr").find("td:eq(" + column + ")").text() + '>' +
                    '<h5 style="display:inline">Are You Sure To Delete?</h5>' +
                    '<button type="button" class="md-btn-primary md-btn-small text-right close-del-dialog btn-sm">No</button>' +
                    '<input type="submit" class="md-btn-primary md-btn-small text-right" id="Submit3" onclick="DeleteRow2(this)" value="Yes"/>' +
                '</div>' +
            '</div>' +
    '</div>');
    if ($(window).width() <= 350) {
        $(".delete-dialog").css({
            top: $(element).closest("tr").offset().top - 110,
            left: $(element).closest("tr").offset().left - 78
        });
    } else {
        $ww = $(window).width();
        $eleOff = $(element).closest("tr").find(".clsdelete").offset().left;
        $dia_box = $(".delete-dialog").width();
        $total = $eleOff + $dia_box;
        $left = $total > $ww ? ($total - $ww) : 0;
        console.log(($eleOff - $left));
        $(".delete-dialog").css({
            top: $(element).closest("tr").offset().top - 55,
            left: ($eleOff - ($left + 100))
        });
    }
    $(".delete-dialog").removeClass("animated fadeOutOutDown").addClass("animated bounceIn").show();
}

$(function () {
    $(document).on("click", ".close-del-dialog", function () {
        $(".delete-dialog").removeClass("animated bounceIn").fadeOut();
    });
});
function previewimg(url) {
    var ext = $('#uploadfile').val().split('.').pop().toLowerCase();
    if ($.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) == -1) {
        alert('Only Images are Allowed!');
    }
   
    else
    {
        var file_size = $('#uploadfile')[0].files[0].size;
        if (file_size > 1048576) {

            alert("Image size is greater than 1MB");


            return false;
        }
      else if (url.files && url.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                $("#img").attr('src', e.target.result);
            }
            reader.readAsDataURL(url.files[0]);
      }
      
    }
    
}
function Editpreviewimg(url) {
    var file_size = $('#Edituploadfile')[0].files[0].size;
    if (file_size > 1048576) {

        alert("Image size is greater than 1MB");


        return false;
    }
    else {
        if (url.files && url.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                $("#Editimg").attr('src', e.target.result);
            }
            reader.readAsDataURL(url.files[0]);
        }

    }

}

function previewPortal(url) {
    if (url.files && url.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            $("#img").attr('src', e.target.result);
        }
        reader.readAsDataURL(url.files[0]);
    }
}
//function validateImage(url) {
   
//    var file_size = $('#uploadfile')[0].files[0].size;
//    if (file_size > 1048576) {
//        alert("Image is greater than 1MB");
//        return false;
//    }
//    else {
//         previewimg();
         
//    }
    
//}

//function limitCheck(uploadfile) {
//    //var files = uploadfile;
//    //var file = files.file[0];
//    var size = uploadfile.files[0];
//    if (size > 200000) {
//        alert("Picture size is very large only 200 KB size is allowed");
//        files.value('');
//    }
//    else {
//        previewimg();
//    }
//}