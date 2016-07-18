var App = require('./app');
var Service = require('./service');
var ConfirmService = require('./confirmService');

function startService(conn) {
    var service = new ConfirmService(conn);
    return service.start()
        .then(() => {
            conn.createChannel()
                .then(ch => {
                    for (var i = 0; i < 10; i++) {
                        ch.sendToQueue('reconnect_in', new Buffer('hello'));
                    }
                })
        })
        .then(() => service);
}

//var app = new App(startService);
//var app = new App(startService, 3000, 10);
var app = new App(startService, attempt => attempt * 2000, 5);

app.run();
