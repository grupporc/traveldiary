require('dotenv').config();
var express = require('express');
var request = require('request');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require("body-parser");
var fs = require('fs');

var rpc=require('./rpc_client');
var eventi = require('./eventi');
var foto = require('./foto');

var app = express();

//per visualizzare le immagini
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
            if(error) 
                console.log("ERRORE: Fallita la richiesta del token facebook: "+errore);
            else 
            {
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
                        if(data!=undefined)
                        {
                            for(i=0;i<data.length;i++)
                            {
                                if(data[i].status!="declined")
                                    count++;
                            }
                        }
                        
                        if(data!=undefined && count<4)
                        {
                            console.log('Per accedere al servizio è necessario autorizzare tutti i permessi richiesti!');
                            req.session.FBtoken=null;
                            if(req.session.GGtoken==null)
                                res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                            else
                                res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google", errore:"ERRORE: sono necessari tutti i permessi richiesti"});
                        }
                        else
                        {
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
    if (req.query.code)
    {
        var autcode=req.query.code;
        request({
            url: "https://oauth2.googleapis.com/token?client_id="+GGappId+"&client_secret="+GGsecretKey+"&code="+autcode+"&redirect_uri=http://localhost:8888/tokenGG&grant_type=authorization_code",
            method: 'POST',
        },function(error, response, body){
            if(error)
            {
                console.log("ERRORE: Fallita la richiesta del token google: "+errore);
            }
            else
            {
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
                else
                {
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
    else
    {
        req.session.GGtoken=null;
        console.log("Annullato o Errore\n");
        if(req.session.FBtoken==null)
            res.render('login.ejs',{accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
        else
            res.render('login.ejs',{accessoFb: "Accesso Effettuato", accessoGG: "Entra con Google", errore:""});
    }
});

app.get('/diario', function(req,res){
    if(req.session.caricato==true)
        res.send("Success!");
    else
    {
        request({
            url: "https://graph.facebook.com/me?fields=id,hometown&access_token="+req.session.FBtoken,
            method: 'GET',
        }, function(error,response,body){
            if(error)
                console.log(error);

            else
            {
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
                    url: "https://graph.facebook.com/me/photos?limit=100&type=uploaded&fields=place,created_time,images.limit(1)&access_token="+req.session.FBtoken,
                    method: 'GET',
                }, function(error, response, body){
                    if(error)
                    {
                        console.log(error);
                    } 
                    else 
                    {
                        var data=JSON.parse(body).data;
                        console.log("Ottenute foto utente!");
                        
                        //console.log(data);
                        //creo oggetto da passare alla rpc
                        var utente={
                            id: id_client,
                            hometown: hometown,
                            photos: data,
                        }
                        rpc.creaDiaro(utente).then(
                            function(resp){
                                console.log("Funzione eseguita con: ");
                                var arr_viaggi = resp.split('-');
                                
                                if(arr_viaggi[0]!="")
                                {
                                    if(req.session.rev==null)
                                    {
                                        //vedo se il mio documento è presente nel db
                                        request({
                                            url: "http://admin:admin@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                                            method: 'GET',
                                            json: true,
                                        }, function(error, response, body){
                                            if(error)
                                            {
                                                if(response.statusCode==404)
                                                {
                                                    //doc non esistente --> lo creo
                                                    request({
                                                        url: "http://admin:admin@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                                                        method: 'PUT',
                                                        body: { viaggi: arr_viaggi },
                                                        json: true,
                                                    },function(error,response,body){
                                                        if(error)
                                                            console.log(error); 
                                                        else
                                                        {
                                                            req.session.rev=info._rev;
                                                            console.log("Aggiunto a database");
                                                            
                                                            req.session.caricato=true;
                                                            res.send("Success!");
                                                        }
                                                    });
                                                }
                                            }
                                            else
                                            {
                                                req.session.rev=body._rev;

                                                //doc esistente --> lo modifico
                                                request({
                                                    url: "http://admin:admin@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                                                    method: 'PUT',
                                                    body: { _rev: req.session.rev, viaggi: arr_viaggi},
                                                    json: true,
                                                },function(error,response,body){
                                                    if(error)
                                                        console.log(error);
                                                    else
                                                    {
                                                        req.session.rev=info._rev;
                                                        console.log("Aggiornato database");
                        
                                                        req.session.caricato=true;
                                                        res.send("Success!");
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else
                                    {
                                        request({
                                            url: "http://admin:admin@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                                            method: 'PUT',
                                            body: { _rev: req.session.rev, viaggi: arr_viaggi},
                                            json: true,
                                        },function(error,response,body){
                                            if(error)
                                                console.log(error);
                                            else
                                            {
                                                req.session.rev=info._rev;
                                                console.log("Aggiornato database");

                                                req.session.caricato=true;
                                                res.send("Success!");
                                            }
                                        });
                                    }
                                }
                                else
                                {
                                    res.send("Success!");
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
        });
    }
});

app.get('/home',function(req,res){
    res.render('home.ejs');
});

app.get('/listaViaggi',function(req,res){
    //get da couch db
    request({
        url: "http://admin:admin@127.0.0.1:5984/travel_diary/"+req.session.id_client,
        method: 'GET',
    },function(error,response,body){
        if(error)
            console.log(error);
        else
        {
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
                        if(response.statusCode==200)
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

app.get('/paginaDiario',function(req,res){

    if(req.session.caricateFoto!=true)
    {
        foto.caricaFoto(req.session.GGtoken, req, res);

        var files = fs.readdirSync("fbimages/"+req.session.id_client);
        var num_dir = files.length;
        for(var i=0; i<num_dir; i++)
        {
            var locations = files[i];
            if(locations == '.DS_Store') continue;

            var photos = fs.readdirSync("fbimages/"+req.session.id_client+"/"+locations);
            
            var num_photo = photos.length;
            async function process()
            {
                for (var i=0; i<num_photo; i++)
                {
                    var photo=photos[i];
                    if(photo=='.DS_Store')
                        continue;
                    else
                    {
                        var data = photo.split('T')[0];
                        await eventi.controllaEvento(req.session.GGtoken, req, res, locations, data);
                    }
                }
            }

            process();
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
        if(error)
            console.log(error);
        else
        {
            var id_calendar = JSON.parse(body).id;
            req.session.caricateFoto = true;
            var nomi_album = fs.readdirSync("fbimages/"+req.session.id_client);

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

                async function process()
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
        else
        {
            var info=JSON.parse(body);
            if(info.Places[0]==undefined)
                res.render('voli.ejs', {voli: '<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>', data: "", luogo: "", button: "Torna alla home"});
            else
            {
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
                    else
                    {
                        var info=JSON.parse(body);
                        if(info.Places[0]==undefined)
                            res.render('voli.ejs', {voli: '<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>', data: "", luogo: "", button: "Torna alla home"});
                        else
                        {
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
                                else
                                {
                                    var info=JSON.parse(body);
                                    if(info==undefined || info.Quotes==undefined || info.Quotes.length==0)
                                    {
                                        res.render('voli.ejs', {voli: parseHTML(info, data), data: "", luogo: "", button: "Torna alla home"})
                                    }
                                    else
                                    {
                                        res.render('voli.ejs',{voli: parseHTML(info, data), data: data, luogo: arrivo, button: "Aggiungi evento al calendario"});
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
        eventi.controllaEvento(req.session.GGtoken, req, res, luogo, data);
        res.render('voli.ejs',{voli: "<br><br><br><br><br><h3>Aggiunto evento al calendario!</h3><br><br>", data: "", luogo: "", button: "Home"});
    }
    else{
        res.redirect('/home');
    } 
});

function parseHTML(json, d) {
    if(json==undefined) 
        return "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>";
    var quotes=json.Quotes;
    if(quotes==undefined)
        return "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>";
    var places=json.Places;
    var compagnie=json.Carriers;
    var risultato="<h1> Voli trovati: </h1>";
    var num=quotes.length;
    if(num==0)
        return "<br><br><hr>Nessun volo disponibile con le opzioni da lei richieste!<hr><br><br>";
    else
    {
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

            if(gg!=g) 
                continue; 
            
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
    }
};

app.get('/logout', function(req, res){
    fs.rmdirSync('fbimages/'+req.session.id_client, {
        recursive: true,
    });
    console.log("Cartella client: "+req.session.id_client+" rimossa");

    req.session.FBtoken=null;
    req.session.GGtoken=null;
    req.session.id_client=null;
    req.session.caricato=false;
    req.session.caricateFoto=false;
    req.session.rev=null;

    res.render('login.ejs', {accessoFb: "Entra con Facebook", accessoGG: "Entra con Google", errore:""});
});

app.listen(8888, function() {
    console.log("Server in ascolto sulla porta: %s", this.address().port);
});




