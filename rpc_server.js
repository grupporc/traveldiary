#!/usr/bin/env node
var fs=require('fs');
var request=require("request");
var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    //creo il canale e dichiaro la coda
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }
        var queue = 'rpc_queue';

        channel.assertQueue(queue, {
            durable: false
        });
        channel.prefetch(1);
        console.log('Aspetto RPC requests');
        channel.consume(queue, function reply(msg) {
            var utente=JSON.parse(msg.content.toString());

            console.log("Ricevuta richiesta da Utente id: ", utente.id);

            var r=scaricafoto(utente);

            channel.sendToQueue(msg.properties.replyTo,
                Buffer.from(r), {
                    correlationId: msg.properties.correlationId
                });

            channel.ack(msg);
        });
    });
});

function scaricafoto(utente)
{   
    var dir = './fbimages/'+utente.id;
    
    if(!fs.existsSync(dir))
    {
        fs.mkdirSync(dir);
    }

    const download = (url,path,callback) => {
        request.head(url, (err,res,body) => {
            request(url).pipe(fs.createWriteStream(path)).on('close',callback);
        });
    };

    var len = utente.photos.length;
    var viaggi="";
    for(i=0; i<len; i++)
    {
        var photo =utente.photos[i]; 
        var url=photo.images[0].source;

        if(photo.place!=undefined && photo.place.location!=undefined)
        {
            var citta=photo.place.location.city;
            if(citta==undefined || citta==utente.hometown)
                continue;
            else
            {
                var data=photo.created_time+"_"+i;

                var newdir = dir+'/'+citta;
                if(!fs.existsSync(newdir))
                {
                    viaggi+=citta+"-";
                    fs.mkdirSync(newdir);
                }

                var path = newdir+'/'+data+'.jpg';
        
                download(url,path, () => {
                    console.log("Done!");
                });
            }
        }
    }

    return viaggi;
}