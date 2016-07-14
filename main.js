var App = require('./app');
var Service = require('./service');

function startService(conn) {
    var service = new Service(conn);
    service.start();
    return service;
}

//var app = new App(startService);
//var app = new App(startService, 3000, 10);
var app = new App(startService, attempt => attempt * 2000, 5);

app.run();
