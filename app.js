require('dotenv').config();
var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require("body-parser");

var app = express();

app.set('view engine','ejs');

//gestione della sessione 
app.use(cookieParser());

app.use(expressSession({
    secret: 'provaciao',
    resave: false,
    saveUninitialized: true
}));

app.use(function(req,res,next) {
    res.locals.session = req.session;
    next();
});

app.use(bodyParser.urlencoded({ extended: false }));

//VARIABILI FB
var FBappId = process.env.APPIDFB;
var FBlogin = "https://www.facebook.com/v7.0/dialog/oauth?client_id="+FBappId+"&auth_type=rerequest&scope=user_hometown,user_location,user_photos&redirect_uri=http://localhost:8888/token";
var FBsecretKey = process.env.SECRETKEYFB;

app.get("/", function(req, res){
    res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google"});
});

app.get("/loginFB", function(req, res){
    if(req.session.FBtoken==null)
        res.redirect(FBlogin);
    else
    {
        res.render('login.ejs',{accessoFb: "Accesso Effettuato",accessoGG: "Entra con Google"});
    }
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
                req.session.FBtoken = JSON.parse(body).access_token;
                console.log("Ottenuto il token per il cliente\n");

                //Verifico che mi ha garantito tutti i permessi
                request({
                    url: "https://graph.facebook.com/me/permissions?access_token="+req.session.FBtoken,
                    method: 'GET',
                }, function(error, response, body) {
                    if(error)
                        console.log("Errore: non sono riuscito a verificare i permessi");
                    else 
                    {
                        var data = JSON.parse(body).data;
                        
                        data.forEach(el => {
                            if(el.status=="declined"){
                                console.log('Per accedere al servizio è necessario autorizzare tutti i permessi richiesti!');
                                res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google"});
                            }
                                
                        });
                        console.log("Permessi garantiti");
                        //per ora
                        //res.render('home.ejs',{accesso: "facebook"});
                        //res.sendFile("views/home.html", {"root" : __dirname});
                        if(req.session.GGtoken!=null)
                            res.sendFile("views/home.html", {"root" : __dirname});
                        else
                            res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google"});
                    }
                });
            }
        });
	}
	else
	{
        req.session.FBtoken=null;
        //Quando clicca CANCEL
        console.log("Cliccato Cancel\n");
        if(req.session.GGtoken==null)
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google"});
        else
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Accesso Effettuato"});
	}
});

//prova stampa sessione
app.get('/session', function(req, res){
    res.send(req.session);
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