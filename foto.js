var request = require('request');
var fs = require('fs');
require('dotenv').config();

function aggiungiAlbum(a_t,req,res,titolo){
    return new Promise((resolve,reject) => {
        //get degli album caricati da noi
        var options={
            url:'https://photoslibrary.googleapis.com/v1/albums?excludeNonAppCreatedData=true&pageSize=50',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer '+a_t,
            }
        };
        request(options, function(error, response, body){
            if(error){
                reject(error);
            }
            else{
                var listaAlbum=new Array();
                var info=JSON.parse(body);
                var albums=info.albums;
                if(albums!=undefined){
                    for(var i=0; i<albums.length;i++){
                        listaAlbum[albums[i].title]= albums[i].id;
                    }
                    if(listaAlbum[titolo]==undefined){
                        console.log("Album non esistente... lo creo!")
                        //se non esiste crealo
                        var url = 'https://photoslibrary.googleapis.com/v1/albums';
                        var headers= {
                            'Content-type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': 'Bearer '+a_t,  
                        };
                        var body1= {
                            'album' : {
                                'title' : titolo,
                            }
                        };
                        request({headers:headers, url:url, method:'POST', body:JSON.stringify(body1)}, function(error, response, body){
                            if(error){
                                reject(error);
                            }
                            else{
                                var info=JSON.parse(body);
                                resolve(titolo+"SPLITTER"+info.id);
                            }
                        });
                    }
                    else{
                        console.log("Album esistente");
                        resolve(titolo+"SPLITTER"+listaAlbum[titolo]);
                    }
                }else{
                    console.log("album non esistente...lo creo");
                    //se non esiste crealo
                    var url = 'https://photoslibrary.googleapis.com/v1/albums';
                    var headers= {
                        'Content-type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer '+a_t,  
                    };
                    var body1= {
                        'album' : {
                            'title' : titolo,
                        }
                    };
                    request({headers:headers, url:url, method:'POST', body:JSON.stringify(body1)}, function(error, response, body){
                        if(error){
                            reject(error);
                        }
                        else{
                            var info=JSON.parse(body);
                            resolve(titolo+"SPLITTER"+info.id);
                        }
                    });
                }
            }
        });
    });
}

function creaFoto(a_t, req, res, foto, id_album, titolo){
    return new Promise((resolve,reject) =>{
        console.log("CREA FOTO!"+id_album+" "+foto+" "+titolo);
        var fotobin = Buffer.from(fs.readFileSync("fbimages/"+req.session.id_client+"/"+titolo+"/"+foto, 'binary'), 'binary');
        //dobbiamo creare l'item da inserire nell'album
        var url='https://photoslibrary.googleapis.com/v1/uploads';
        var headers= {
            'Authorization': 'Bearer '+a_t,
            'Content-type': 'application/octet-stream',
            'X-Goog-Upload-File' : foto,
            //'X-Goog-Upload-Content-Type' : "image/jpeg",
            'X-Goog-Upload-Protocol' : 'raw'
        };
        request({ method:'POST', headers: headers, url:url, rejectUnauthorized: false, body: fotobin}, function(error, response, body){
            if(error){
                console.log(error);
            }
            else{
                var up_token=body;
                var url= 'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate';
                var headers={
                    'Authorization': 'Bearer '+a_t,
                    'content-type' :'application/json'
                };
                var body1={
                    'albumId' : id_album,
                    'newMediaItems':[
                        {
                            'simpleMediaItem':{
                                'fileName': foto,
                                'uploadToken' : up_token
                            }
                        }
                    ]
                };
                request({headers:headers, url:url, method:'POST', rejectUnauthorized: false,body:JSON.stringify(body1)}, function(error,response,body){
                    if(error)
                        reject(error);
                    else{
                        //console.log(response.body);
                        resolve("Foto ok: "+foto);
                    }
                });
            }
        });
    });
}

function caricaFoto(a_t,req,res){
    var files = fs.readdirSync("fbimages/"+req.session.id_client);
    var num_dir = files.length;
    for(var i=0; i<num_dir; i++){
        var titolo = files[i];
        if(titolo == '.DS_Store') continue;

        aggiungiAlbum(a_t,req,res,titolo).then(
            function(resp){
                var response=resp.split("SPLITTER");
                var title=response[0];
                var id_album=response[1];
                //aggiungo le foto all'Album
                var photos = fs.readdirSync("fbimages/"+req.session.id_client+"/"+title);
                var num_photo = photos.length;

                async function process(){
                    for(var j=0; j<num_photo; j++){
                        var photo=photos[j];
                        if(photo=='.DS_Store') continue;
    
                        await creaFoto(a_t,req,res, photo, id_album, title).then(
                            function(resp){
                                console.log(resp);
                            }
                        ).catch( 
                            function(err){
                                console.log(err);
                            }
                        );
                    }
                }
                process();
            }).catch(
                function(err){
                    console.log(err);
        });
    }
}
module.exports.caricaFoto = caricaFoto;