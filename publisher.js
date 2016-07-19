const EventEmitter = require('events').EventEmitter;

class ReadyState {
    constructor(publisher, ch) {
        this._ch = ch;
        this._publisher = publisher;
    }

    publish(message) {
        const nextMessageWillBeSent = this._send(message);

        if (!nextMessageWillBeSent) {
            this._goPendingState();
        }
    }

    publishMany(messages) {
        for (let i = 0; i < messages.length; i++) {
            const nextMessageWillBeSent = this._send(messages[i]);

            if (!nextMessageWillBeSent) {
                messages.splice(0, i + 1);
                this._goPendingState(messages);
                return;
            }
        }

        this._publisher.emit('empty');
    }

    _send({exchangeName, queueName, content, options, callback}) {
        return this._ch.publish(exchangeName, queueName, content, options, callback);
    }

    _goPendingState(buffer = []) {
        this._publisher._setState(new PendingState(this._publisher, this._ch, buffer));
        console.log(` [Publisher] Switched to PendingState (buffer size: ${buffer.length})`);
    }
}


class PendingState {
    constructor(publisher, ch, buffer = []) {
        this._ch = ch;
        this._publisher = publisher;
        this._buffer = buffer;

        this._ch.once('drain', () => {
            console.log(` [Publisher] Channel 'drain' event (buffer size: ${this._buffer.length})`);
            const state = new ReadyState(this._publisher, this._ch);
            this._publisher._setState(state);
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
        this._state = new ReadyState(this, ch);
    }

    publish(exchangeName, queueName, content, options, callback) {
        this._state.publish({exchangeName, queueName, content, options, callback});
    }

    sendToQueue(queueName, content, options, callback) {
        this.publish('', queueName, content, options, callback);
    }

    _setState(state) {
        this._state = state;
    }
}


class ConfirmPublisher extends Publisher {
    publish(exchangeName, queueName, content, options) {
        return new Promise((res, rej) => {
            super.publish(
                exchangeName,
                queueName,
                content,
                options,
                err => {
                    if (err) {
                        rej(err);
                    } else {
                        res();
                    }
                }
            )
        });
    }

    sendToQueue(queueName, content, options) {
        return this.publish('', queueName, content, options);
    }
}

module.exports = {
    Publisher,
    ConfirmPublisher
};
