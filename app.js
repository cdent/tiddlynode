var sys = require('sys'),
    http = require('http'),
    url = require('url');
    fs = require('fs');

var front_page = "<html> <head> <title>Welcome</title> </head> <body> <ul> <li><a href='/bags'>bags</a></li> <li><a href='/recipes'>recipes</a></li> </ul> </body> </html> ";

var handlers = {
    get_root: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(front_page);
    },
    get_bags: function(req, res) {
        fs.readdir('.', function(err, files) {
            var bags = [];
            files.forEach(function(file) {
                if (/.bag$/.test(file)) {
                    bags.push(file.replace(/.bag$/, ''));
                }
            });
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(bags));
        });
    },
    get_recipes: function(req, res) {
        fs.readdir('.', function(err, files) {
            var recipes = [];
            files.forEach(function(file) {
                if (/.recipe$/.test(file)) {
                    recipes.push(file.replace(/.recipe$/, ''));
                }
            });
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(recipes));
        });
    },
    get_recipe: function(req, res) {
        var recipe_name = RegExp.$1;
        fs.readFile(recipe_name + '.recipe', 'utf8', function(err, data) {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('No recipe ' + recipe_name + '\n');
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(data);
            }
        });
    },
    put_recipe: function(req, res) {
        var body = '';
        req.setEncoding('utf8');
        req.addListener('data', function(chunk) {
            body += chunk;
        });
        req.addListener('end', function() {
            var recipe_name = RegExp.$1;
            if (body) {
                fs.writeFile(recipe_name + '.recipe', body, function(err) {
                    if (err) throw err;
                    res.writeHead(204, {'Location': '/recipes/' + recipe_name} );
                    res.end('');
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            } 
        });
    },
    get_bag: function(req, res) {
        var bag_name = RegExp.$1;
        var bag_dir = bag_name + '.bag';
        fs.readFile(bag_dir + '/description', 'utf8', function(err, data) {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('No bag ' + bag_name + '\n');
            } else {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end(JSON.stringify({'description': data}));
            }
        });
    },
    put_bag: function(req, res) {
        var body = '';
        req.setEncoding('utf8');
        req.addListener('data', function(chunk) {
            body += chunk;
        });
        req.addListener('end', function() {
            body = JSON.parse(body);
            var bag_name = RegExp.$1;
            var bag_dir = bag_name + '.bag';
            if (body) {
                fs.mkdir(bag_dir, 0755, function(err) {
                    sys.puts(err);
                    var description = body.description ? body.description : '';
                    description = description.replace(/\s*$/, "\n")
                    fs.writeFile(bag_dir + '/description', description, function(err) {
                    if (err) throw err;
                    fs.mkdir(bag_dir + '/tiddlers', 0755, function(err) {
                        sys.puts(err);
                        res.writeHead(204, {
                            'Location': '/bags/' + bag_name} );
                        res.end('');
                        }
                        );
                    }
                    );
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            } 
        });
    },
    put_bag_tiddler: function(req, res) {
        var body = '';
        req.setEncoding('utf8');
        req.addListener('data', function(chunk) {
            body += chunk;
        });
        req.addListener('end', function() {
            var bag_name = RegExp.$1;
            var tiddler_name = RegExp.$2;
            var bag_dir = bag_name + '.bag';
            var tiddler_file = bag_dir + '/tiddlers/' + tiddler_name;
            if (body) {
                fs.writeFile(tiddler_file, body, function(err) {
                    if (err) {
                        res.writeHead(400, {'Content-Type': 'text/plain'});
                        res.end('unable to write tiddler: ' + err);
                    } else {
                        res.writeHead(204, {'Location':
                            '/bags/' + bag_name + '/tiddlers/' + tiddler_name});
                        res.end('');
                    }
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            }
        });
    },
    put_recipe_tiddler: function(req, res) {
        var body = '';
        req.setEncoding('utf8');
        req.addListener('data', function(chunk) {
            body += chunk;
            });
        req.addListener('end', function(chunk) {
            var recipe_name = RegExp.$1;
            var tiddler_name = RegExp.$2;
            var recipe_file = recipe_name + '.recipe';
            if (body) {
                fs.readFile(recipe_file, 'utf8', function(err, data) {
                    var recipe = JSON.parse(data);
                    var bag_name = recipe.recipe.slice(-1)[0][0];
                    sys.puts('bag_name ' + bag_name);
                    var tiddler_file = bag_name + '.bag' + '/tiddlers/' + tiddler_name;
                    fs.writeFile(tiddler_file, body, function(err) {
                        if (err) {
                            res.writeHead(400, {'Content-Type': 'text/plain'});
                            res.end('unable to write tiddler: ' + err);
                        } else {
                            res.writeHead(204, {'Location':
                                '/bags/' + bag_name + '/tiddlers/' + tiddler_name});
                            res.end('');
                        }
                    });
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            }
        });
    },
    search: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        // XXX: this is a fakey for to see if tests are working
        res.end('tiddlerurlmap1');
    }
};

var routes = {
    '\/': { GET: handlers.get_root },
    '\/bags\/?': { GET: handlers.get_bags },
    '\/recipes\/?': { GET: handlers.get_recipes },
    '\/recipes\/(\\w+)\/?': {
        GET: handlers.get_recipe,
        PUT: handlers.put_recipe,
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
        PUT: handlers.put_recipe_tiddler,
    },
    '\/bags\/(\\w+)\/?': {
        GET: handlers.get_bag,
        PUT: handlers.put_bag,
    },
    '\/bags\/(\\w+)\/tiddlers\/?': {
        GET: function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('/bags/' + RegExp.$1 + '/tiddlers' + '\n');
         },
    },
    '\/bags\/(\\w+)\/tiddlers\/(\\w+)\/?': {
        PUT: handlers.put_bag_tiddler,
        GET: function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('/bags/' + RegExp.$1 + '/tiddlers/' + RegExp.$2+ '\n');
         },
    },
    '\/search': { GET: handlers.search },
};

// configure and start the server
http.createServer(function (req, res) {
    var parsed_url = url.parse(req.url, true);
    var path = parsed_url.pathname;
    var method = req.method;

    // find a matching route
    var route = undefined;
    for (pattern in routes) {
        if (path.match('^' + pattern + '$')) {
            route = routes[pattern];
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
