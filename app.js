require('dotenv').config();
var express = require('express');
var request = require('request');

var app = express();

//VARIABILI FB
var FBappId = process.env.APPIDFB;
var FBlogin = "https://www.facebook.com/v7.0/dialog/oauth?client_id="+FBappId+"&auth_type=rerequest&scope=user_hometown,user_location,user_photos&redirect_uri=http://localhost:8888/token";
var FBtoken;
var FBsecretKey = process.env.SECRETKEYFB;

app.get("/", function(req, res){
    res.sendFile("login.html", {"root": __dirname});
});

app.get("/loginFB", function(req, res){
    res.redirect(FBlogin);
});

app.get("/loginGG", function(req, res){

});

app.get("/token", function(req, res){
    // Ottengo il codice (OAUTH FB) dalla querystring
    if (req.query.code)  //!=null se clicco OK
	{
        request({
            url: "https://graph.facebook.com/v7.0/oauth/access_token?client_id="+FBappId+"&redirect_uri=http://localhost:8888/token&client_secret="+FBsecretKey+"&code="+req.query.code, //URL to hit
            method: 'GET',
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                FBtoken = JSON.parse(body).access_token;
                console.log("Ottenuto il token per il cliente\n");

                //Verifico che mi ha garantito tutti i permessi
                request({
                    url: "https://graph.facebook.com/me/permissions?access_token="+FBtoken,
                    method: 'GET',
                }, function(error, response, body) {
                    if(error)
                        console.log("Errore: non sono riuscito a verificare i permessi");
                    else 
                    {
                        var data = JSON.parse(body).data;
                        var neg = [];
                        
                        data.forEach(el => {
                            if(el.status=="declined")
                                neg.push(el.permission);
                        });

                        if(neg.length==0)
                            res.sendFile("home.html", {"root" : __dirname});
                        else
                        {
                            //DA FINIRE --> gestire la situazione in cui qualcosa non è garantita
                            console.log("Non ci ha garantito tutti i permessi\n");
                        }
                    }
                });
            }
        });
	}
	else
	{
        //Quando clicca CANCEL
        console.log("Cliccato\n");
        res.sendFile("login.html", {"root" : __dirname});
	}
});

app.listen(8888, function() {
    console.log("Server in ascolto sulla porta: %s", this.address().port);
});


//Per visualizzare le immagini
app.get("/img/Logo.png", function(req, res){
    res.sendFile("img/Logo.png", {"root" : __dirname});
});

app.get("/img/sfondo.gif", function(req, res){
    res.sendFile("img/sfondo.gif", {"root" : __dirname});
});