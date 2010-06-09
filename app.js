var sys = require('sys'),
    http = require('http'),
    url = require('url');

application = {
    routes: {
                '/': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/\n');
                     },
                },
                '/bags': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/bags\n');
                     },
                },
                '/recipes': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes\n');
                     },
                },
                '/recipes/foobar': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes\n');
                     },
                },
            },
};

http.createServer(function (req, res) {
        var parsed_url = url.parse(req.url, true);
        var path = parsed_url.pathname;
        var method = req.method;

        route = application.routes[path];

        if (route == undefined) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end(path + ' not found' + '\n');
        } else {
            route_for_method = route[method];
            if (route_for_method == undefined) {
                res.writeHead(405, {'Content-Type': 'text/plain'});
                res.end(method + ' not allowed' + '\n');
            } else {
                route_for_method(req, res);
            }
        }
    }).listen(8000);
sys.puts('Server running at http://127.0.0.1:8000/');
