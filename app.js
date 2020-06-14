require('dotenv').config();
var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require("body-parser");
var fs=require("fs");
const swaggerUI= require('swagger-ui-express');
const swaggerDocument= require('./swagger.json');

var rpc=require('./rpc_client');
var eventi = require('./eventi');
var db = require('./couchDB');

var sender=require('./sender');

var app = express();

//tutta la directory accedibile
app.use('/', express.static(__dirname));

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

app.use('/api-docs',swaggerUI.serve ,swaggerUI.setup(swaggerDocument));

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
        if(req.session.GGtoken!=null)
            res.redirect('/home');
        res.render('login.ejs',{accessoFb: "Accesso Effettuato",accessoGG: "Entra con Google", errore:""});
    }
});

app.get("/loginGG", function(req, res){
    if(req.session.GGtoken==null)
        res.redirect(GGlogin);
    else
    {
        if(req.session.FBtoken!=null)
            res.redirect('/home');
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
                                res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Accesso Effettuato", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
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
        request({
            url: "https://oauth2.googleapis.com/token?client_id="+GGappId+"&client_secret="+GGsecretKey+"&code="+autcode+"&redirect_uri=http://localhost:8888/tokenGG&grant_type=authorization_code",
            method: 'POST',
        },function(error, response, body){
            if(error) {
                console.log("ERRORE: Fallita la richiesta del token google: "+errore);
            }
            else{
                var info=JSON.parse(body);
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
    //se avevo già caricato il diario
    if(req.session.caricato==true) res.send("Success");
    else{
        request({
            url: "https://graph.facebook.com/me?fields=id,hometown&access_token="+req.session.FBtoken,
            method: 'GET',
        }, function(error,response,body){
            if(error){
                console.log(error);
            } else{
                var info=JSON.parse(body);
                var id_client=info.id;
                req.session.id_client=id_client;
                var hometown;
                if(info.hometown!=undefined)
                    hometown=info.hometown.name;
                else
                    hometown="";
                console.log("Ottenuti dati utente!");
                console.log(id_client);
                console.log(hometown);

                request({
                url: "https://graph.facebook.com/me/photos?limit=500&type=uploaded&fields=place,created_time,images&access_token="+req.session.FBtoken,
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
                                var arrviaggi = resp.split('-');
                                //se vuoto non aggiorno il database
                                if(arrviaggi[0]!=""){
                                    //carico sul database 
                                    res.send(db.updateDB(req, arrviaggi));
                                }
                                else{
                                    req.session.caricato=true;
                                    res.send("Success");
                                }
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
    }
});


app.get('/home',function(req,res){
    res.render('home.ejs');
});

app.get('/paginaDiario',function(req,res){
    if(req.session.caricatefoto!=true){
        //carico le foto su google photos
        var msg={
            tok: req.session.GGtoken,
            id_client: req.session.id_client,
        };
        sender.sendFoto(msg);
        //carico gli eventi su google calendar
        var files = fs.readdirSync("fbimages/"+req.session.id_client);
        var num_dir = files.length;
        for(var i=0; i<num_dir; i++){
            var locations = files[i];
            if(locations == '.DS_Store') continue;
            console.log("locations: "+locations);

            photos = fs.readdirSync("fbimages/"+req.session.id_client+"/"+locations);
            var num_photo = photos.length;

            async function iterafoto(){
                for(var j=0; j<num_photo; j++){
                    if(photos[j]!='.DS_Store'){
                        var data= photos[j].split('T')[0];
                        console.log("data "+data);
                        await eventi.controllaEvento(req.session.GGtoken, locations, data);
                    }
                }
            }
            iterafoto();
        }
    }
    var options={
        url:'https://www.googleapis.com/calendar/v3/calendars/primary',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+req.session.GGtoken,
        }
    };
    request(options, function(error, response, body){
        if(error){
            console.log(error);
        }
        else{
            var id_calendar=JSON.parse(body).id;
            req.session.caricatefoto=true;

            //inserimento slideshow foto
            var files = fs.readdirSync("fbimages/"+req.session.id_client);
        
            var num_dir = files.length;
            var num_photo_totali = 0;

            //array dove metterò tutte le foto
            var array_photo = new Array();

            //array che contiene location di tutte le foto
            var loc = new Array();

            for(var i=0; i<num_dir; i++)
            {
                var locations = files[i];
                if(locations == '.DS_Store') continue;

                var photos = fs.readdirSync("fbimages/"+req.session.id_client+"/"+locations);
                
                var num_photo = photos.length;
                num_photo_totali += parseInt(num_photo);

                function process()
                {
                    for (var i=0; i<num_photo; i++)
                    {
                        var photo=photos[i];
                        if(photo=='.DS_Store')
                            continue;
                        else
                        {
                            var srt = "fbimages/"+req.session.id_client+"/"+locations+"/"+photos[i];
                            array_photo.push(srt);
                            loc.push(locations);
                        }
                    }
                }
                process();
            }
            res.render('diario.ejs', {idCal : id_calendar, num_photo_totali : num_photo_totali, array_photo : array_photo, loc : loc});
        }
    });
});

app.post('/attrazioni',function(req,res){
    var citta=req.body.search;
    request({
        url: "https://maps.googleapis.com/maps/api/place/textsearch/json?query="+citta+"+point+of+interest&key="+process.env.GGAPIKEY,
        method: 'GET',
    }, function(error, response, body) {
        if(error){
            console.log(error);
        }
        else{
            var luoghi=JSON.parse(body).results;

            if(luoghi.length==0){
                var errore="<br><br><h4> Nessuna attrazione trovata per la città inserita!</h4>";
                errore+="<img src='img/noresult.png' style='height: 300px; width: 500px;'>";
                res.render('attrazioni.ejs',{attrazioni: errore});
            }
            else{
                var results="";
                for(var i=0; i<luoghi.length;i++){
                    var luogo=luoghi[i];
                    var nome=luogo.name;
                    var address=luogo.formatted_address;
                    var punteggio=luogo.rating;
                    results+="<b>"+nome+"</b><br>"+address+"<br>Punteggio dei visitatori: "+punteggio+"<i class='fa fa-star' style='color: goldenRod;'></i><br><br>";
                }
                res.render('attrazioni.ejs', {attrazioni: results});
            }
        }
    });    
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
            if(info.Places[0]==undefined) 
                res.render('voli.ejs',{voli: "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><img src='img/noresult.png' style='height: 300px; width: 500px;'<br><br>", data: "", luogo: "", button: "Torna alla Home"});
            
            else{
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
                        if(info.Places[0]==undefined) 
                            res.render('voli.ejs',{voli: "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><img src='img/noresult.png' style='height: 300px; width: 500px;'<br><br>", data: "", luogo: "", button: "Torna alla Home"});
                        else{
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
                                    var info=JSON.parse(body);var voloOK = false;

                                    for ( var i = 0; i < info.Quotes.length; i++){
                                        if (data == info.Quotes[i].OutboundLeg.DepartureDate.split('T')[0]){
                                            voloOK = true;
                                        }
                                    }

                                    if(info==undefined || info.Quotes==undefined || info.Quotes.length==0 || voloOK == false){
                                        res.render('voli.ejs',{voli: "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><img src='img/noresult.png' style='height: 300px; width: 500px;'<br><br>", data: "", luogo: "", button: "Torna alla Home"});
                                    }
                                    else{
                                        res.render('voli.ejs',{voli: parseHTML(info,data), data: data, luogo: arrivo, button: "Aggiungi evento al calendario"});
                                    }
                                }
                            });
    
                        }
                    }
                });
            }
        }
    });    
});

app.get('/voloCalendario',function(req,res){
    var data=req.query.data;
    var luogo=req.query.luogo;
    if(data!="" && luogo!=""){
        eventi.controllaEvento(req.session.GGtoken, luogo, data);
        res.render('voli.ejs',{voli: "<br><br><br><br><br><h3>Aggiunto evento al calendario!</h3><br><br>", data: "", luogo: "", button: "Torna alla Home"});
    }
    else{
        res.redirect('/home');
    } 
});

function parseHTML(json,d) {
    var quotes=json.Quotes;
    var places=json.Places;
    var compagnie=json.Carriers;
    var risultato="<h1> Voli trovati: </h1>";
    var num=quotes.length;
    
    for(var i=0; i<num; i++) 
    {
        var prezzo = quotes[i].MinPrice;
        var isdirect= quotes[i].Direct;
        var data=quotes[i].OutboundLeg.DepartureDate.split('T');
        var date=data[0].split('-');
        var gg=parseInt(date[2]);
        var mm=parseInt(date[1]);
        var y=parseInt(date[0]);

        var g=parseInt(d.split('-')[2]);
        if(g != gg) continue;

        risultato+="Prezzo: "+prezzo+" €<br> Data: "+gg+"/"+mm+"/"+y+"<br>";
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

app.get('/listaViaggi',function(req,res){
    //get da couch db
    request({
        url: "http://admin:"+process.env.PASSDB+"@127.0.0.1:5984/travel_diary/"+req.session.id_client,
        method: 'GET',
    },function(error,response,body){
        if(error){
            console.log(error);
        } else{
            var info=JSON.parse(body);
            var map = parseMap(12.496366, 41.902782);
            var viaggi = info.viaggi;
            var lista = info.viaggi.slice();
            
            for(var i=0; i<viaggi.length; i++)
            {
                var viaggio=viaggi[i];
                if(viaggio!="")
                {
                    console.log(viaggio);
                    var opt = {
                        url: 'http://api.openweathermap.org/data/2.5/weather?q='+viaggio+'&appid='+process.env.METEO_KEY,
                        method: 'GET',
                    };
                    request(opt, function(error, response, body){
                        lista.pop();
                        if (error){
                            console.log(error);
                        }
                        else if(response.statusCode==200)
                        {
                            var resp = JSON.parse(body);
                            map=map+`var marker = new mapboxgl.Marker()
                                .setLngLat([`+resp.coord.lon+`,`+resp.coord.lat+`])
                                .setPopup(new mapboxgl.Popup().setHTML("<b>`+resp.name+`</b>"))
                                .addTo(map);`
                        }
                        if(lista.length==1)
                        {
                            map=map+"</script>";
                            res.render('viaggi.ejs', {count: info.viaggi.length, viaggi: info.viaggi, mappa: map});
                        }
                    });
                }
            }
        }
    });
});

function parseMap(long, lat)
{
    return `<script>
        mapboxgl.accessToken = '`+process.env.MAP_KEY+`';
        var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [`+long+`, `+ lat+`],
        zoom: 1});
    `;
};

app.get('/logout',function(req,res){
    fs.rmdirSync('fbimages/'+req.session.id_client,{recursive: true});
    req.session.id_client=null;
    req.session.GGtoken=null;
    req.session.FBtoken=null;
    req.session.rev=null;
    req.session.caricato=false;
    req.session.caricatefoto=false;
    res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
});

//api fornite all'esterno della nostra app:
app.get("/travelapi/listaviaggi/:clientId", function(req,res){
    request({
        url: "http://admin:"+process.env.PASSDB+"@127.0.0.1:5984/travel_diary/"+req.params.clientId,
        method: 'GET',
    },function(error,response,body){
        if(error){
            res.status(404).send("Content NOT found");
        } else{
            var info=JSON.parse(body);
            var viaggi = info.viaggi;
            res.send(viaggi);
        }});
});

app.get("/travelapi/cercaViaggio/:partenza/:arrivo/:data", function(req,res){
    var partenza=req.params.partenza;
    var arrivo=req.params.arrivo;
    var data=req.params.data;
    
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
            res.status(404).send("Content NOT found: errore partenza");
        else{
            var info=JSON.parse(body);
            if(info.Places[0]==undefined) 
                res.status(404).send("Content NOT found: errore partenza");
            else{
                var aerP=info.Places[0].PlaceId;
    
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
                        res.status(404).send("Content NOT found: errore arrivo");
                    else{
                        var info=JSON.parse(body);
                        if(info.Places[0]==undefined) 
                            res.status(404).send("Content NOT found: errore arrivo");
                        else{
                            var aerA=info.Places[0].PlaceId;
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
                                    res.status(404).send("Content NOT found: errore voli");
                                else{
                                    var info=JSON.parse(body);
                                    if(info==undefined || info.Quotes==undefined || info.Quotes.length==0){
                                        res.status(204).send("Richiesta corretta ma nessun contenuto");
                                    }
                                    else{
                                        var result=new Array();
                                        var quotes=info.Quotes;
                                        var num=quotes.length;
                                        var places=info.Places;
                                        var compagnie=info.Carriers;
                                        for(var i=0; i<num; i++) {
                                            var prezzo = quotes[i].MinPrice;
                                            var isdirect= quotes[i].Direct;
                                            var d=quotes[i].OutboundLeg.DepartureDate.split('T');
                                            var date=d[0].split('-');
                                            var gg=parseInt(date[2]);
                                            var mm=parseInt(date[1]);
                                            var y=parseInt(date[0]);

                                            var g=parseInt(data.split('-')[2]);
                                            if(g != gg) continue;
                                            
                                            var compagnia;
                                            var carrierid=quotes[i].OutboundLeg.CarrierIds[0];
                                                for(j=0;j<compagnie.length;j++){
                                                    if(compagnie[j].CarrierId == carrierid){
                                                        compagnia=compagnie[j].Name;
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
                                            var volo={
                                                "partenza": partenza,
                                                "aeroportopar": orig,
                                                "arrivo": arrivo,
                                                "aeroportoarr": dest,
                                                "data":data,
                                                "compagnia": compagnia,
                                                "diretto": isdirect,
                                                "prezzo": prezzo,
                                            };
                                            result.push(volo);
                                        }
                                        res.send(result);
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    }); 
});

app.get("/travelapi/attrazioni/:citta", function(req,res){
    var citta=req.params.citta;
    request({
        url: "https://maps.googleapis.com/maps/api/place/textsearch/json?query="+citta+"+point+of+interest&key="+process.env.GGAPIKEY,
        method: 'GET',
    }, function(error, response, body) {
        if(error){
            res.status(400).send("BAD REQUEST");
        }
        else{
            var luoghi=JSON.parse(body).results;
            if(luoghi.length==0){
                res.status(204).send("Richiesta corretta ma nessun contenuto");
            }
            else{
                var results=new Array();
                for(var i=0; i<luoghi.length;i++){
                    var luogo=luoghi[i];
                    var nome=luogo.name;
                    var address=luogo.formatted_address;
                    var punteggio=luogo.rating;
                    var attrazione={
                        "nome":nome,
                        "indirizzo":address,
                        "punteggio": punteggio,
                    };
                    results.push(attrazione);
                }
                res.send(results);
            }
        }
    });    
});

//server in ascolto sulla porta 8888
app.listen(8888, function() {
    console.log("Server in ascolto sulla porta: %s", this.address().port);
});