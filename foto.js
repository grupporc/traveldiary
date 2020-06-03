require('dotenv').config();
var request = require('request');
var fs = require('fs');

function aggiungiAlbum(token, req, res, titolo)
{
    return new Promise((resolve, reject) => {
        // 1- get album caricati da noi
        var options={
            url:'https://photoslibrary.googleapis.com/v1/albums?excludeNonAppCreatedData=true&pageSize=50',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer '+token,
            }
        };
        request(options, function(error, response, body){
            if(error)
                reject(error);
            else
            {
                var listaAlbum = [];
                var info = JSON.parse(body);
                var albums = info.albums;

                if(albums!=undefined)
                {
                    for(var i=0; i<albums.length; i++)
                    {
                        listaAlbum[albums[i].title] =  albums[i].id;
                    }

                    // 2- verifca se album con quel titolo esiste --> prendi id album
                    if(listaAlbum[titolo]!=undefined)
                    {
                        console.log("Album esistente");
                        resolve(titolo+"SPLITTER"+listaAlbum[titolo]);
                    }
                    else
                    {
                        // 3- se non esiste crealo --> prendi id album
                        console.log('Album non esistente ... creazione');
                        var url='https://photoslibrary.googleapis.com/v1/albums';
                        var headers= {
                            'Authorization': 'Bearer '+token,
                        };
                        var body= {
                            'album' : {
                                'title' : titolo,
                            }
                        };
                    
                        request({
                            url: url,
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(body)
                        }, function(error, response, body){
                            if(error)
                                reject(error);
                            else
                            {
                                var id = JSON.parse(body).id;
                                console.log('Album creato');
                                resolve(titolo+"SPLITTER"+id);
                            }
                        });
                    }
                }
                else
                {
                    console.log('Album non esistente ... creazione');
                    var url='https://photoslibrary.googleapis.com/v1/albums';
                    var headers= {
                        'Authorization': 'Bearer '+token,
                    };
                    var body= {
                        'album' : {
                            'title' : titolo,
                        }
                    };
                    
                    request({
                        url: url,
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(body)
                    }, function(error, response, body){
                        if(error)
                            reject(error);
                        else
                        {
                            var id = JSON.parse(body).id;
                            console.log('Album creato');
                            resolve(titolo+"SPLITTER"+id);
                        }
                    });
                }
            }
        });
    });
}

function creaFoto(token, req, res, foto, id_album, titolo)
{
    return new Promise((resolve, reject) => {
        var file = fs.readFileSync("fbimages/"+req.session.id_client+"/"+titolo+"/"+foto, 'binary');
        var photo = Buffer.from(file, 'binary');

        var url= 'https://photoslibrary.googleapis.com/v1/uploads';
        var headers= {
            'Authorization': 'Bearer '+token,
            'Content-type': 'application/octet-stream',
            'X-Goog-Upload-Content-Type': 'image/png image/jpg',
            'X-Goog-Upload-Protocol': 'raw',
            'X-Goog-Upload-File-Name': foto,
        };

        request({
            url: url,
            method:'POST',
            headers: headers,
            rejectUnauthorized: false,
            body: photo
        }, function(error, response, body1){
            if(error)
            {
                reject(error);
            }
            else
            {
                var upToken = body1.toString();

                var url= 'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate';
                var headers= {
                    'Authorization' : 'Bearer '+token,
                    'Content-type': 'application/json',
                };
                var body= {
                    'albumId': id_album,
                    'newMediaItems': [
                        {
                            'description': 'Prague',
                            'simpleMediaItem': {
                                'fileName': foto,
                                'uploadToken': upToken,
                            }
                        }
                    ]
                };
                request({
                    url: url,
                    method: 'POST',
                    headers: headers,
                    rejectUnauthorized: false,
                    body: JSON.stringify(body),
                }, function(error, response, body){
                    if(error)
                    {
                        reject(error);
                    }
                    else
                    {
                        resolve("Foto ok: "+foto);
                    }
                });
            }
        });
    });
}

function caricaFoto(token, req, res) 
{
    var files = fs.readdirSync("fbimages/"+req.session.id_client);
    var num_dir = files.length;
    for(var i=0; i<num_dir; i++)
    {
        var titolo = files[i];

        if(titolo == '.DS_Store') continue;

        aggiungiAlbum(token, req, res, titolo)
        .then(function(resp){
            var risp=resp.split("SPLITTER");
            var title=risp[0];
            var id_album=risp[1];
            
            var photos=fs.readdirSync("fbimages/"+req.session.id_client+"/"+title);
            var num_photo = photos.length;
            
            async function process()
            {
                for(var j=0; j<num_photo; j++)
                {
                    var photo = photos[j];
                    if(photo == ".DS_Store") continue;
                    
                    await creaFoto(token, req, res, photo, id_album, title)
                    .then(function(resp){
                        console.log(resp);
                    }).catch(function(error){
                        console.log(error);
                    });
                }
            }

            process();
        }).catch(function(err){
            console.log("Si è verificato un errore nella creazione del diario!");
            console.log(err);
        });
    }
}

module.exports.caricaFoto = caricaFoto;