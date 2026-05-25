$(function () {
    $("#form1").submit(function () {
        return false;
    });
});

function Logout() {
    if (confirm('Are you sure you want to log out?')) {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(function () {
                window.location.href = 'OwnerLogin.aspx';
            }).catch(function () {
                window.location.href = 'OwnerLogin.aspx';
            });
        } else {
            window.location.href = 'OwnerLogin.aspx';
        }
    }
}

function errorfn() {
    console.warn("Server unavailable");
}
