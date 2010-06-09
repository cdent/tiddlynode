var sys = require('sys'),
    http = require('http'),
    url = require('url');

var front_page = "<html> <head> <title>Welcome</title> </head> <body> <ul> <li><a href='/bags'>bags</a></li> <li><a href='/recipes'>recipes</a></li> </ul> </body> </html> ";

var application = {
    routes: {
                '\/': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(front_page);
                     },
                },
                '\/bags\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/bags\n');
                     },
                },
                '\/recipes\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes\n');
                     },
                },
                '\/recipes\/(\\w+)\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes/' + RegExp.$1 + '\n');
                     },
                },
                '\/recipes\/(\\w+)\/tiddlers\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes/' + RegExp.$1 + '/tiddlers' + '\n');
                     },
                },
                '\/recipes\/(\\w+)\/tiddlers\/(\\w+)\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/recipes/' + RegExp.$1 + '/tiddlers/' + RegExp.$2+ '\n');
                     },
                },
                '\/bags\/(\\w+)\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/bags/' + RegExp.$1 + '\n');
                     },
                },
                '\/bags\/(\\w+)\/tiddlers\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/bags/' + RegExp.$1 + '/tiddlers' + '\n');
                     },
                },
                '\/bags\/(\\w+)\/tiddlers\/(\\w+)\/?': {
                    GET: function(req, res) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('/bags/' + RegExp.$1 + '/tiddlers/' + RegExp.$2+ '\n');
                     },
                },
            },
};

// configure and start the server
http.createServer(function (req, res) {
        var parsed_url = url.parse(req.url, true);
        var path = parsed_url.pathname;
        var method = req.method;

        // find a matching route
        var route = undefined;
        for (pattern in application.routes) {
            if (path.match('^' + pattern + '$')) {
                route = application.routes[pattern];
                break;
            }
        }
        
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
