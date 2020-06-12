require('dotenv').config();
var request = require('request');

function updateDB(req, arrviaggi){
    if(req.session.rev==null){
        //vedo se il mio documento è presente nel db
        request({
            url: "http://admin:ringo@127.0.0.1:5984/travel_diary/"+req.session.id_client,
            methond: 'GET',
            json: true
        }, function(error,response,body){
            if(error){
                if(response.statusCode==404){
                    //doc non esistente --> lo creo
                    console.log(req.session.id_client);
                    request({
                        url: "http://admin:ringo@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                        method: 'PUT',
                        body: {viaggi: arrviaggi},
                        json: true,
                    },function(error,response,body){
                        if(error){
                            console.log(error);
                        } else{
                            req.session.rev=body.rev;
                            console.log("Aggiunto al database");
                            req.session.caricato=true;
                            res.send("Success");
                        }
                    });
                }
            } 
            else{
                req.session.rev=body._rev;
                console.log("doc esistente");
                //aggiorno il doc esistente
                request({
                    url: "http://admin:ringo@127.0.0.1:5984/travel_diary/"+req.session.id_client,
                    method: 'PUT',
                    body: {_rev:req.session.rev, viaggi: arrviaggi},
                    json: true,
                },function(error,response,body){
                    if(error){
                        console.log(error);
                    } else{
                        req.session.rev=body.rev;
                        console.log("Aggiornato database");
                        req.session.caricato=true;
                        res.send("Success");
                    }
                }); 
            }
        });
    }
    else{
        request({
            url: "http://admin:ringo@127.0.0.1:5984/travel_diary/"+req.session.id_client,
            method: 'PUT',
            body: {_rev:req.session.rev, viaggi: arrviaggi},
            json: true,
        },function(error,response,body){
            if(error){
                console.log(error);
            } else{
                req.session.rev=body.rev;
                console.log("Aggiornato database");
                req.session.caricato=true;
                res.send("Success");
            }
        });
    }
}

module.exports.updateDB = updateDB;