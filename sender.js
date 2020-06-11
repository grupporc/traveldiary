#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

function sendFoto(msg)
{
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }

            var queue = 'fotoQueue';

            channel.assertQueue(queue, {
                durable: false
            });
            channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
        });
        setTimeout(function() {
            connection.close();
        }, 800);
    });
}

module.exports.sendFoto = sendFoto;