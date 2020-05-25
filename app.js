require('dotenv').config();
var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require("body-parser");

var rpc=require('./rpc_client');

var app = express();

app.set('view engine','ejs');

//gestione della sessione 
app.use(cookieParser());

app.use(expressSession({
    secret: 'TravelDiary',
    resave: false,
    saveUninitialized: false
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
    res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
});

app.get("/loginFB", function(req, res){
    if(req.session.FBtoken==null)
        res.redirect(FBlogin);
    else
    {
        res.render('login.ejs',{accessoFb: "Accesso Effettuato",accessoGG: "Entra con Google", errore:""});
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
                        console.log(data);
                        var count=0;
                        if(data!=undefined){
                            for(i=0;i<data.length;i++){
                                if(data[i].status!="declined"){
                                    count++;
                                } 
                            }
                        }
                        console.log(count);
                        if(count<4){
                            console.log('Per accedere al servizio è necessario autorizzare tutti i permessi richiesti!');
                            res.locals.session.FBtoken=null;
                            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                        }
                        else{
                            console.log("Permessi garantiti");
                            //getAlbum(req.session.FBtoken);
                            res.render('home.ejs');
                            //res.render('home.ejs',{accesso: "Accesso Effettuato con successo"});
                            /*
                            if(req.session.GGtoken!=null)
                                res.redirect('/diario');
                                //res.render('home.ejs',{accesso: "Accesso Effettuato con successo"});
                            else
                                res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google",errore:""});
                            */
                        }    
                    }
                });
            }
        });
	}
	else
	{
        req.session.FBtoken=null;
        console.log("Annullato o Errore\n");
        if(req.session.GGtoken==null)
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
        else
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Accesso Effettuato", errore:""});
	}
});

app.get('/diario', function(req,res){
    request({
        url: "https://graph.facebook.com/me?fields=id,hometown&access_token="+req.session.FBtoken,
        method: 'GET',
    }, function(error,response,body){
        if(error){
            console.log(error);
        } else{
            var info=JSON.parse(body);
            console.log(info);
            var id_client=info.id;
            var hometown;
            if(info.hometowhn!=undefined)
                hometown=info.hometown.name;
            else
                hometown="";
            console.log("Ottenuti dati utente!");
            console.log(id_client);
            console.log(hometown);

            request({
            url: "https://graph.facebook.com/me/photos?limit=500&type=uploaded&fields=place,created_time,images.limit(1)&access_token="+req.session.FBtoken,
            method: 'GET',
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    var data=JSON.parse(body).data;
                    console.log("Ottenute foto utente!");
                    
                    //console.log(data);
                    //creo oggetto da passare alla rpc
                    var utente={
                        id: id_client,
                        hometown: hometown,
                        photos: data,
                    }
                    rpc.creaDiario(utente).then(
                        function(resp){
                            console.log("Funzione eseguita con: ");
                            console.log(resp);
                            res.send(resp);
                        }).catch(
                        function(err){
                            console.log("Si è verificato un errore nella creazione del diario!");
                            console.log(err);
                            res.send("errore");
                            //che errore mando e quando?
                        }
                    );
                }
            })
        }
    })
});

//prova stampa sessione
app.get('/session', function(req, res){
    res.send(req.session);
});

/*
app.get('/diario',function(req,res){
    request({
        url: "https://graph.facebook.com/me/photos?limit=500&type=uploaded&fields=place,created_time,images.limit(1)&access_token="+req.session.FBtoken,
        method: 'GET',
    }, function(error, response, body){
        if(error) {
            console.log(error);
        } else {
            var data=JSON.parse(body).data;
            //res.send(response.statusCode+" "+body)
            console.log(data);
            console.log("NUM FOTO:");
            console.log(data.length);
            res.send(data);
        }
    })
});*/

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