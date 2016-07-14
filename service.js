const {timeout, logErrors} = require('./utils');

class Service {
    constructor(conn) {
        this._conn = conn;
    }

    start() {
        this._conn.createChannel()
            .then(this._init);
    }

    _init(ch) {
        Promise.all([
            ch.assertQueue('reconnect_in', {durable: false}),
            ch.assertQueue('reconnect_out', {durable: false})
        ]).then(() =>
            ch.consume('reconnect_in', logErrors(msg => {
                console.log(' [Service] Message received:', msg.content.toString());

                timeout(5000)
                    .then(() => {
                        ch.sendToQueue('reconnect_out', msg.content);
                        ch.ack(msg);
                    });
            }, ' [Service] Consume error:'))
        ).then(() => {
            console.log(' [Service] Started');
        }).catch(err => {
            console.error(' [Service] Error:', err);
        })
    }

    destroy() {

    }
}

module.exports = Service;
