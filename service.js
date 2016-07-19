const {timeout, logErrors} = require('./utils');
const {Publisher} = require('./publisher');

class Service {
    constructor(conn) {
        this._destroyed = false;
        this._conn = conn;
    }

    start() {
        return this._conn.createChannel()
            .then(ch => {
                const publisher = new Publisher(ch);
                this._init(ch, publisher);
            });
    }

    _init(ch, publisher) {
        return Promise.all([
            ch.assertQueue('reconnect_in', {durable: false}),
            ch.assertQueue('reconnect_out', {durable: false})
        ]).then(() =>
            ch.consume('reconnect_in', logErrors(msg => {
                console.log(' [Service] Message received:', msg.content.toString());

                timeout(10000)
                    .then(() => {
                        if (this._destroyed) {
                            console.log(' [Service] Message won\'t be sent because service is destroyed.');
                            return;
                        }

                        try {
                            publisher.sendToQueue('reconnect_out', msg.content);
                            ch.ack(msg);

                            console.log(' [Service] Message sent', msg.content.toString());
                        } catch (err) {
                            console.error(' [Service] Message wasn\'t sent due to error', err);
                        }
                    });
            }, ' [Service] Consume error:'))
        ).then(() => {
            console.log(' [Service] Started');
        }).catch(err => {
            console.error(' [Service] Error:', err);

            return Promise.reject(err);
        })
    }

    destroy() {
        this._destroyed = true;
    }
}

module.exports = Service;
