const {timeout, logErrors} = require('./utils');
const Service = require('./Service');
const {ConfirmPublisher} = require('./publisher');

class ConfirmService extends Service {
    constructor(conn) {
        super(conn);
    }

    start() {
        return Promise.all([this._conn.createConfirmChannel(),
            this._conn.createChannel()])
            .then(([confirmCh, ch]) => {
                const publisher = new ConfirmPublisher(confirmCh);

                this._init(confirmCh, ch, publisher);
            });
    }

    _init(confirmCh, ch, publisher) {
        return Promise.all([
            ch.assertQueue('reconnect_in', {durable: false}),
            confirmCh.assertQueue('reconnect_out', {durable: false})
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
                            publisher.sendToQueue('reconnect_out', msg.content)
                                .then(() => {
                                    ch.ack(msg);
                                    console.log(' [Service] Message sent', msg.content.toString());
                                })
                                .catch(err => {
                                    console.log('Message sending failed!');
                                    console.error(err);
                                });

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


}

module.exports = ConfirmService;