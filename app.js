const amqp = require('amqplib');
const {timeout} = require('./utils');

const DEFAULT_ATTEMPT_LIMIT = 5;
const DEFAULT_TIMEOUT = 5000;
const MIN_TIMEOUT = 1000;

class App {
    constructor(startService, timeoutOrTimeoutProvider = DEFAULT_TIMEOUT, attemptLimit = DEFAULT_ATTEMPT_LIMIT) {
        this._startService = startService;
        this._attemptLimit = attemptLimit;

        this._getTimeout = typeof timeoutOrTimeoutProvider === 'function' ?
            timeoutOrTimeoutProvider :
            () => Math.max(timeoutOrTimeoutProvider, MIN_TIMEOUT);
    }

    run() {
        this._connectAndStartService();
    }

    _connectAndStartService() {
        this._connect()
            .then(conn => {
                let reconnecting = false;
                let isConnectionClosed = false;

                conn.on('error', err => {
                    console.error(` [App] Connection error.`, err);

                    this._destroyService();

                    if (!App._isCriticalError(err)) {
                        reconnecting = true;
                        this._connectAndStartService();
                    }
                });

                conn.on('close', err => {
                    console.log(' [App] Connection closed.', err);

                    isConnectionClosed = true;
                });

                this._startService(conn)
                    .then(service => {
                        console.log(' [App] Service started.');

                        this._service = service;
                    })
                    .catch(err => {
                        if (reconnecting) {
                            console.log(' [App] Service start failed.', err);
                        } else {
                            console.log(' [App] Service start failed with critical error. Connection will be closed.', err);
                        }

                        if (!isConnectionClosed) {
                            conn.close();
                        }
                    });
            })
            .catch(err => {
                console.error(' [App]', err);
            });
    }

    _destroyService() {
        if (this._service && this._service.destroy) {
            this._service.destroy();
            this._service = null;
        }
    }

    _connect(attempt = 1) {
        console.log(` [App] Connecting... (attempt ${attempt})`);

        return amqp.connect('amqp://192.168.99.100')
            .then(conn => {
                console.log(' [App] Connected');

                return conn;
            })
            .catch(err => {
                console.error(` [App] Connecting failed (attempt ${attempt})`, err);

                if (attempt >= this._attemptLimit) {
                    return Promise.reject('Reconnect attempt limit exceeded');
                }

                const ms = this._getTimeout(attempt);

                console.log(` [App] Next attempt in ${ms} ms`);

                return timeout(ms)
                    .then(() => {
                        return this._connect(attempt + 1);
                    });
            })
    }

    static _isCriticalError(err) {
        return err.code !== 'ECONNRESET';
    }
}

module.exports = App;
