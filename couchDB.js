require('dotenv').config();
var request = require('request');

function updateDB(req, arr_viaggi)
{
    if(req.session.rev==null)
    {
        //vedo se il mio documento è presente nel db
        request({
            url: "http://admin:Elena2412@127.0.0.1:5984/travel_diary/"+req.session.id_client,
            method: 'GET',
            json: true,
        }, function(error, response, body){
            if(error)
            {
                if(response.statusCode==404)
                {
                    //doc non esistente --> lo creo
                    request({
                        url: "http://admin:Elena2412@127.0.0.1:5984/travel_diary/"+id_client,
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
                            return "Success!";
                        }
                    });
                }
            }
            else
            {
                req.session.rev=body._rev;

                //doc esistente --> lo modifico
                request({
                    url: "http://admin:Elena2412@127.0.0.1:5984/travel_diary/"+req.session.id_client,
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
                        return "Success!";
                    }
                });
            }
        });
    }
    else
    {
        request({
            url: "http://admin:Elena2412@127.0.0.1:5984/travel_diary/"+req.session.id_client,
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
                return "Success!";
            }
        });
    }
}

module.exports.updateDB = updateDB;

