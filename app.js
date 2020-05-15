require('dotenv').config();
var express = require('express');
var app = express();

//variabili facebook
var fbappId=process.env.APPIDFB;
var redirect='home.html';
var fblogin="https://www.facebook.com/v7.0/dialog/oauth?client_id="+fbappId+"&auth_type=rerequest&scope=user_hometown,user_photos,user_location&redirect_uri=http://localhost:8888/home";

app.get("/", function(req, res){
    res.redirect(fblogin);
});

app.get("/home", function(req, res){
    res.end(redirect);
});


app.listen(8888, function(){
    console.log("Server in ascolto sulla porta: %s", this.address().port);
});
