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

            //var r = fibonacci(n);
            //funzione che mette le cartelle

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

    const download = (url,path,callback) => {
        request.head(url, (err,res,body) => {
            request(url).pipe(fs.createWriteStream(path)).on('close',callback);
        });
    };

    const url=utente.photos[0].images[0].source;
    const path = './fbimages/image.png';

    download(url,path, () => {
        console.log("Done!");
    });
    return "Success";
    //return "errore";
    //capire dove vanno i return

}
