const App = require('./app');
const Service = require('./service');
const ConfirmService = require('./confirmService');

function startService(conn) {
    const service = new ConfirmService(conn);
    return service.start()
        .then(() => {
            conn.createChannel()
                .then(ch => {
                    for (let i = 0; i < 10; i++) {
                        ch.sendToQueue('reconnect_in', new Buffer('hello'));
                    }
                })
        })
        .then(() => service);
}

//const app = new App(startService);
//const app = new App(startService, 3000, 10);
const app = new App(startService, attempt => attempt * 2000, 5);

app.run();
