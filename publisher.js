const EventEmitter = require('events').EventEmitter;

class ReadyState {
    constructor(context) {
        this._context = context;
    }

    publish(message) {
        const shouldGoPendingState = this._context.publish(message);

        if (!shouldGoPendingState) {
            this._goPendingState();
        }
    }

    publishMany(messages) {
        for (let i = 0; i < messages.length; i++) {
            const shouldGoPendingState = this._context.publish(messages[i]);

            if (!shouldGoPendingState) {
                messages.splice(0, i + 1);
                this._goPendingState(messages);
                return;
            }
        }
    }

    _goPendingState(buffer = []) {
        this._context.setState(new PendingState(this._context, buffer));
        console.log(` [Publisher] Switched to PendingState (buffer size: ${buffer.length})`);
    }
}

class PendingState {
    constructor(context, buffer = []) {
        this._context = context;
        this._buffer = buffer;

        this._context.ch.once('drain', () => {
            console.log(` [Publisher] Channel 'drain' event (buffer size: ${this._buffer.length})`);
            const state = new ReadyState(this._context);
            this._context.setState(state);
            console.log(` [Publisher] Switched to ReadyState`);
            state.publishMany(this._buffer);
        });
    }

    publish(message) {
        this._buffer.push(message);
    }
}

class Publisher extends EventEmitter {
    constructor(ch) {
        super();
        this._ch = ch;
        this._state = new ReadyState(this._context());
    }

    publish(exchange, routingKey, content, options) {
        this._state.publish({exchange, routingKey, content, options});
    }

    sendToQueue(queue, content, options) {
        this.publish('', queue, content, options);
    }

    _publish({exchange, routingKey, content, options}) {
        return this._ch.publish(exchange, routingKey, content, options);
    }

    _setState(state) {
        this._state = state;
    }

    _context() {
        return {
            ch: this._ch,
            setState: state => {
                this._setState(state);
            },
            publish: message => {
                return this._publish(message);
            }
        };
    }
}

class ConfirmPublisher extends Publisher {
    publish(exchange, routingKey, content, options) {
        return new Promise((res, rej) => {
            const callback =
                err => {
                    if (err) {
                        rej(err);
                    } else {
                        res();
                    }
                };

            this._state.publish({exchange, routingKey, content, options, callback});
        })
    }

    sendToQueue(queue, content, options) {
        return this.publish('', queue, content, options);
    }

    _publish({exchange, routingKey, content, options, callback}) {
        return this._ch.publish(exchange, routingKey, content, options, callback);
    }
}

module.exports = {
    Publisher,
    ConfirmPublisher
};
