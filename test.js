const amqp = require('amqplib');
const Publisher = require('./publisher');

const N = 300000;
const QUEUE_NAME_1 = 'spam_queue_1';

let str = '';

for (let i = 0; i < 100; i++) {
    str += 'hello ';
}

const buffer = new Buffer(str);
let connection;

amqp.connect('amqp://192.168.99.100')
    .then(conn => {
        connection = conn;
        return conn.createChannel();
    })
    .then(ch => ch.assertQueue(QUEUE_NAME_1, {durable: false})
        .then(() => ch.purgeQueue(QUEUE_NAME_1))
        .then(() => ch))
    .then(ch => {
        const publisher = new Publisher(ch);
        let t = process.hrtime();

        publisher.on('empty', () => {
            t = process.hrtime(t);
            console.log(` Publishing time: ${t} s`);

            setTimeout(() => {
                connection.close();
            }, 3000);
        });

        for (let i = 0; i < N; i++) {
            publisher.publish(QUEUE_NAME_1, buffer);
        }
    })
    .catch(err => {
        console.error(err);
    });