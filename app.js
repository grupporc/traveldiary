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

//VARIABILI GOOGLE
var GGappId= process.env.APPIDGG;
var GGsecretKey = process.env.SECRETKEYGG;
var scopefoto = 'https://www.googleapis.com/auth/photoslibrary';
var scopeCal='https://www.googleapis.com/auth/calendar';
var GGlogin="https://accounts.google.com/o/oauth2/v2/auth?client_id="+GGappId+"&scope="+scopefoto+" "+scopeCal+"&response_type=code&redirect_uri=http://localhost:8888/tokenGG";

//VAR RAPIDAPI SKYSCANNER
var rapidkey=process.env.RAPIDAPIKEY;

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
    if(req.session.GGtoken==null)
        res.redirect(GGlogin);
    else
    {
        res.render('login.ejs',{accessoFb: "Entra con Facebook",accessoGG: "Accesso Effettuato", errore:""});
    }
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
                console.log("ERRORE: Fallita la richiesta del token facebook: "+errore);
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
                        if(data!=undefined && count<4){
                            console.log('Per accedere al servizio è necessario autorizzare tutti i permessi richiesti!');
                            req.session.FBtoken=null;
                            if(req.session.GGtoken==null)
                                res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                            else
                                res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                        }
                        else{
                            console.log("Permessi garantiti");
                            if(req.session.GGtoken!=null)
                                res.redirect('/home');
                            else
                                res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google",errore:""});
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

app.get("/tokenGG", function(req, res){
    //andato a buon fine
    if (req.query.code){
        var autcode=req.query.code;
        console.log(autcode);
        request({
            url: "https://oauth2.googleapis.com/token?client_id="+GGappId+"&client_secret="+GGsecretKey+"&code="+autcode+"&redirect_uri=http://localhost:8888/tokenGG&grant_type=authorization_code",
            method: 'POST',
        },function(error, response, body){
            if(error) {
                console.log("ERRORE: Fallita la richiesta del token google: "+errore);
            }
            else{
                var info=JSON.parse(body);
                console.log(info);
                if(info.scope.length<2)
                {
                    //non ha garantito tutti i permessi
                    console.log('Per accedere al servizio è necessario autorizzare tutti i permessi richiesti!');
                    req.session.GGtoken=null; 
                    if(req.session.FBtoken==null)
                        res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                    else
                        res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                }
                else{
                    req.session.GGtoken = info.access_token;
                    console.log("Permessi garantiti");
                    if(req.session.FBtoken!=null)
                        res.redirect('/home');
                    else
                        res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Accesso Effettuato",errore:""});
                }
            }
        });            
    }
    else{
        req.session.GGtoken=null;
        console.log("Annullato o Errore\n");
        if(req.session.FBtoken==null)
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
        else
            res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google", errore:""});
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
            var id_client=info.id;
            req.session.id=id_client;
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
                            console.log("Funzione eseguita con Successo!");
                            //mi ritorna i viaggi come stringa separata da -
                            console.log(resp);
                            res.send(resp);
                        }).catch(
                        function(err){
                            console.log("Si è verificato un errore nella creazione del diario!");
                            console.log(err);
                            res.send("errore");
                        }
                    );
                }
            })
        }
    })
});


app.get('/home',function(req,res){
    res.render('home.ejs');
});

app.get('/paginaDiario',function(req,res){
    //temporaneo... poi sicuramente cambierà ma la pagina è quella 
    res.render('diario.ejs');
});

app.post('/cercaViaggio',function(req,res){
    var partenza=req.body.partenza;
    var arrivo=req.body.arrivo;
    var data=req.body.data;
    
    //cerco l'aeroporto della città partenza
    request({
        url: "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/IT/EUR/en-GB/?query="+partenza,
        method: 'GET',
        headers: {
            "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
            "x-rapidapi-key": rapidkey,
            "useQueryString": true
        }
    }, function(error,response,body){
        if(error)
            console.log(error);
        else{
            var info=JSON.parse(body);
            var aerP=info.Places[0].PlaceId;
            console.log(aerP);

            //cerco l'aeroporto della città di arrivo
            request({
                url: "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/IT/EUR/en-GB/?query="+arrivo,
                method: 'GET',
                headers: {
                    "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
                    "x-rapidapi-key": rapidkey,
                    "useQueryString": true
                }
            }, function(error,response,body){
                if(error)
                    console.log(error);
                else{
                    var info=JSON.parse(body);
                    var aerA=info.Places[0].PlaceId;
                    console.log(aerA);
                    //cerco voli
                    request({
                        url: "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browseroutes/v1.0/IT/EUR/en-GB/"+aerP+"/"+aerA+"/"+data,
                        method: 'GET',
                        headers: {
                            "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
                            "x-rapidapi-key": rapidkey,
                            "useQueryString": true
                        }
                    }, function(error,response,body){
                        if(error)
                            console.log(error);
                        else{
                            var info=JSON.parse(body);
                            res.render('voli.ejs',{voli: parseHTML(info)});
                        }
                    });
                }
            });
        }
    });    
});

function parseHTML(json) {

    var quotes=json.Quotes;
    var places=json.Places;
    var compagnie=json.Carriers;
    var risultato="<h1> Voli trovati: </h1>";
    var num=quotes.length;
    if(num==0)
        return "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>";
    for(var i=0; i<num; i++) 
    {
        var prezzo = quotes[i].MinPrice;
        var isdirect= quotes[i].Direct;
        var data=quotes[i].QuoteDateTime.split('T');
        var date=data[0].split('-');
        var gg=parseInt(date[2]);
        var mm=parseInt(date[1]);
        var y=parseInt(date[0]);
        var ora=data[1];

        risultato+="Prezzo: "+prezzo+" €<br> Data: "+gg+"/"+mm+"/"+y+" Ora: "+ora+"<br>";
        if(isdirect=="true")
            risultato+="volo diretto <br>";
        var carrierid=quotes[i].OutboundLeg.CarrierIds[0];
        for(j=0;j<compagnie.length;j++){
            if(compagnie[j].CarrierId == carrierid){
                risultato+="Compagnia: "+compagnie[j].Name+"<br>";
                j=compagnie.length;
            }
        }
        var originid=quotes[i].OutboundLeg.OriginId;
        var destid=quotes[i].OutboundLeg.DestinationId;
        var orig;
        var dest;
        for(j=0;j<places.length;j++){
            if(places[j].PlaceId == originid)
                orig=places[j].Name;
            else if(places[j].PlaceId == destid)
                dest=places[j].Name;
        }
        risultato+="Aeroporto di Partenza: "+orig+"<br> Aeroporto di Arrivo: "+dest+"<hr>";
    }
    return risultato+"<br><br>";
};

app.get('listaViaggi',function(req,res){
    //get da couch db

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