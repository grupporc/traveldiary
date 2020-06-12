var amqp = require('amqplib/callback_api');
var foto= require('./foto');

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        var queue = 'fotoqueue';

        channel.assertQueue(queue, {
            durable: false
        });

        console.log("In attesa di messaggi\n");

        channel.consume(queue, function(msg) {
            var info=JSON.parse(msg.content.toString());
            var tok=info.tok;
            var id_client=info.id_client;
            foto.caricaFoto(tok,id_client);
        }, {
            noAck: true
        });
    });
});