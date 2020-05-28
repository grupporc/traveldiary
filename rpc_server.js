#!/usr/bin/env node

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

function scaricafoto(utente){
    var fs=require('fs');
    var request=require("request");

    var IDutente=utente.id;
    var dir='./fbimages/'+IDutente;

    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    const download = (url,path,callback) => {
        request.head(url, (err,res,body) => {
            request(url).pipe(fs.createWriteStream(path)).on('close',callback);
        });
    };

    var len=utente.photos.length;
    console.log("Lunghezza: "+len);
    var viaggi="";
    for(i=0;i<len;i++){
        var foto=utente.photos[i];
        var url= foto.images[0].source;
        if(foto.place!=undefined && foto.place.location!=undefined){
            var city=foto.place.location.city;
            if(city==undefined || city==utente.hometown) continue;
            var data=foto.created_time+"_"+i;
            var newdir=dir+"/"+city;
            if(!fs.existsSync(newdir)){
                viaggi+=city+"-";
                fs.mkdirSync(newdir);
            }
            var path=newdir+"/"+data+".png";
            download(url,path, () => {
                console.log("Done!");
            });
        }   
    }
    return viaggi;
}
