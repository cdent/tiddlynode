var sys = require('sys'),
    http = require('http'),
    url = require('url');
    fs = require('fs');

var Emitter = require('events').EventEmitter;

var front_page = "<html> <head> <title>Welcome</title> </head> <body> <ul> <li><a href='/bags'>bags</a></li> <li><a href='/recipes'>recipes</a></li> </ul> </body> </html> ";

/*
 * The Store is the set of routines which read and write data to the
 * disk. This is like, but not the same as, the Store in
 * PyTiddlyWeb. There is a hybrid between accepting success and
 * error callbacks and in make the methods be emitters. The latter
 * is probably the preferred way.
 */
var Store = {
    get_bag: function(bag_name, success, error) {
        var bag_dir = bag_name + '.bag';
        fs.readFile(bag_dir + '/description', 'utf8', function(err, data) {
            if (err) {
                error(err);
            } else {
                success(data);
            }
        });
    },
    get_bags: function(bag_name) {
        var emitter = new Emitter();
        fs.readdir('.', function(err, files) {
            if (err) {
                emitter.emit('error', err);
            } else {
                if (files) {
                    while (files.length > 0) {
                        file = files.shift();
                        if (/.bag$/.test(file)) {
                            emitter.emit('data', file.replace(/.bag$/, ''));
                        }
                        if (files.length == 0) {
                            emitter.emit('end');
                        }
                    }
                } else {
                    emitter.emit('end');
                }
            }
        });
        return emitter;
    },
    delete_recipe: function(recipe_name) {
        var recipe_file = recipe_name + '.recipe';
        var emitter = new Emitter();
        fs.unlink(recipe_file, function(err) {
            if (err) {
                emitter.emit('error', err);
            } else {
                emitter.emit('end');
            }
        });
        return emitter;
    },
    get_recipe: function(recipe_name, success, error) {
        var recipe_file = recipe_name + '.recipe';
        fs.readFile(recipe_file, 'utf8', function(err, data) {
            if (err) {
                error(err);
            } else {
                success(data);
            }
        });
    },
    get_recipes: function() {
        var emitter = new Emitter();
        fs.readdir('.', function(err, files) {
            if (err) {
                emitter.emit('error', err);
            } else {
                if (files) {
                    while (files.length > 0) {
                        file = files.shift();
                        if (/.recipe$/.test(file)) {
                            emitter.emit('data', file.replace(/.recipe$/, ''));
                        }
                        if (files.length == 0) {
                            emitter.emit('end');
                        }
                    }
                } else {
                    emitter.emit('end');
                }
            }
        });
        return emitter;
    },
    delete_bag: function(bag_name) {
        var bag_dir = bag_name + '.bag';
        var tiddlers_dir = bag_dir + '/tiddlers';
        var emitter = new Emitter();
        var delete_tiddlers = function(dir, tiddler_success) {
            sys.puts('gonna read ' + dir);
            fs.readdir(dir, function(err, files) {
                if (err) {
                    emitter.emit('error', err);
                } else {
                    // XXX redundant?
                    if (files.length > 0) {
                        while (files.length > 0) {
                            file = files.shift();
                            sys.puts('gonna delete ' + file);
                            var tiddler_emitter = Store.delete_tiddler(
                                file, bag_name);
                            tiddler_emitter.addListener('end', function() {
                                if (files.length == 0) {
                                    tiddler_success(bag_dir, tiddlers_dir);
                                }
                            });
                            tiddler_emitter.addListener('error', function(err) {
                                emitter.emit('error', err);
                            });
                        }
                    } else {
                        tiddler_success(bag_dir, tiddlers_dir);
                    }
                }
            });
        };
        var delete_this_bag = function(bagdir, tiddlerdir) {
            fs.rmdir(tiddlerdir, function(err) {
                if (err) {
                    emitter.emit('error', err);
                } else {
                    fs.unlink(bagdir + '/description', function(err) {
                        if (err) {
                            emitter.emit('error', err);
                        } else {
                            fs.rmdir(bagdir, function(err) {
                                if (err) {
                                    emitter.emit('error', err);
                                } else {
                                    emitter.emit('end');
                                }
                            });
                        }
                    });
                }
            });
        };
        delete_tiddlers(tiddlers_dir, delete_this_bag);
        return emitter;
    },
    get_bag_tiddlers: function(bag_name) {
        var tiddlers_dir = bag_name + '.bag' + '/tiddlers';
        var emitter = new Emitter();
        fs.readdir(tiddlers_dir, function(err, files) {
            sys.puts('tiddlers_dir ' + tiddlers_dir);
            if (err) {
                emitter.emit('error', err);
            } else {
                var counter = files.length;
                function check() {
                    counter--;
                    if (counter === 0) {
                        sys.puts('last tiddler read');
                        emitter.emit('end');
                    }
                }
                sys.puts('files ' + files);
                if (files.length > 0) {
                    while (files.length > 0) {
                        file = files.shift();
                        var tiddler_emitter = Store.get_tiddler(file, bag_name);
                        var new_tiddler = null;
                        // XXX: the data/end combo here is fiddly
                        tiddler_emitter.addListener('data', function(tiddler) {
                            delete tiddler.text; // XXX unless FAT
                            new_tiddler = tiddler;
                        });
                        tiddler_emitter.addListener('end', function() {
                            emitter.emit('data', new_tiddler);
                            check();
                        });
                        tiddler_emitter.addListener('error', function(err) {
                            emitter.emit('error', err);
                        });
                    }
                } else {
                    sys.puts('emitting no tiddler');
                    emitter.emit('data', null);
                    sys.puts('ending no tiddler');
                    emitter.emit('end');
                }
            }
        });
        return emitter;
    },
    delete_tiddler: function(tiddler_title, bag_name) {
        var tiddler_file = bag_name + '.bag' + '/tiddlers/' + tiddler_title;
        var emitter = new Emitter();
        fs.unlink(tiddler_file, function(err) {
            if (err) {
                emitter.emit('error', err);
            } else {
                emitter.emit('end');
            }
        });
        return emitter;
    },
    get_tiddler: function(tiddler_title, bag_name) {
        var tiddler_file = bag_name + '.bag' + '/tiddlers/' + tiddler_title;
        var emitter = new Emitter();
        fs.readFile(tiddler_file, 'utf8', function(err, data) {
            sys.puts('tiddler file ' + tiddler_file);
            if (err) {
                emitter.emit('error', err);
            } else {
                var tiddler = JSON.parse(data);
                tiddler.title = tiddler_title;
                emitter.emit('data', tiddler);
                emitter.emit('end');
            }
        });
        return emitter;
     },
}

/* Handlers are functions that take HTTP Request and Response
 * objects and write data down the response socket. They "handle"
 * requests to the routes described below.
 */
var Handlers = {
    get_root: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(front_page);
    },
    get_bags: function(req, res) {
        var emitter = Store.get_bags();
        var bags = [];
        emitter.addListener('data', function(bag) {
            bags.push(bag);
        });
        emitter.addListener('end', function() {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(bags));
        });
        emitter.addListener('error', function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Unalbe to get bags ' + err);
        });
    },
    get_recipes: function(req, res) {
        var emitter = Store.get_recipes();
        var recipes = [];
        emitter.addListener('data', function(recipe) {
            recipes.push(recipe);
        });
        emitter.addListener('end', function() {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(recipes));
        });
        emitter.addListener('error', function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Unalbe to get recipes ' + err);
        });
    },
    delete_recipe: function(req, res) {
        var recipe_name = RegExp.$1;
        var emitter = Store.delete_recipe(recipe_name);
        emitter.addListener('end', function() {
            res.writeHead('204', {});
            res.end('');
        });
        emitter.addListener('error', function(err) {
            res.writeHead('404', {'Content-Type': 'text/plain'});
            res.end(err);
        });
    },
    get_recipe: function(req, res) {
        var recipe_name = RegExp.$1;
        var success = function(data) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(data);
        }
        var error = function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('No recipe ' + recipe_name + ':' + err + '\n');
        }
        Store.get_recipe(recipe_name, success, error);
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
                    res.writeHead(204,
                        {'Location': '/recipes/' + recipe_name});
                    res.end('');
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            } 
        });
    },
    delete_bag: function(req, res) {
        var bag_name = RegExp.$1;
        var emitter = Store.delete_bag(bag_name);
        emitter.addListener('end', function() {
            res.writeHead('204', {});
            res.end('');
        });
        emitter.addListener('error', function(err) {
            res.writeHead('404', {'Content-Type': 'text/plain'});
            res.end('Unable to delete bag ' + bag_name + ':' + err + '\n');
        });
    },
    get_bag: function(req, res) {
        var bag_name = RegExp.$1;
        var error = function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('No bag ' + bag_name + ': ' + err + '\n');
        }
        var success = function(data) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify({'description': data}));
        }
        Store.get_bag(bag_name, success, error);
    },
    get_bag_tiddlers: function(req, res) {
        var bag_name = RegExp.$1;
        var emitter = Store.get_bag_tiddlers(bag_name);
        var tiddlers = [];
        emitter.addListener('data', function(tiddler) {
            if (tiddler && tiddler.title) {
                sys.puts('got a tiddler ' + tiddler.title);
                tiddlers.push(tiddler);
            }
        });
        emitter.addListener('end', function() {
            tiddlers.forEach(function(tiddler) {
                sys.puts('tiddlers are' + tiddler.title);
            });
            res.writeHead(200, {'Content-Type': 'application/json'});
            var foo = JSON.stringify(tiddlers);
            //sys.puts(foo);
            res.end(foo);
        });
        emitter.addListener('error', function(err) {
            res.writeHead('404', {'Content-Type': 'text/plain'});
            res.end('something went wrong with bag ' + bag_name + ', ' + err);
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
                    fs.writeFile(bag_dir + '/description',
                        description, function(err) {
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
    delete_bag_tiddler: function(req, res) {
        var bag_name = RegExp.$1;
        var tiddler_name = RegExp.$2;
        var emitter = Store.delete_tiddler(tiddler_name, bag_name);
        emitter.addListener('end', function() {
            res.writeHead('204', {});
            res.end('');
        });
        emitter.addListener('error', function(err) {
            res.writeHead('404', {'Content-Type': 'text/plain'});
            res.end(err);
        });
    },
    get_bag_tiddler: function(req, res) {
        var bag_name = RegExp.$1;
        var tiddler_name = RegExp.$2;
        var emitter = Store.get_tiddler(tiddler_name, bag_name);
        var new_tiddler = null;
        emitter.addListener('data', function(tiddler) {
            new_tiddler = tiddler;
        });
        emitter.addListener('end', function() {
            res.writeHead('200', {'Content-Type': 'application/json'});
            res.end(JSON.stringify(new_tiddler));
        });
        emitter.addListener('error', function(err) {
            res.writeHead('404', {'Content-Type': 'text/plain'});
            res.end(err);
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
            sys.puts('gonna put to ' + tiddler_file);
            if (body) {
                fs.writeFile(tiddler_file, body, function(err) {
                    if (err) {
                        res.writeHead(400, {'Content-Type': 'text/plain'});
                        res.end('unable to write tiddler: ' + err);
                    } else {
                        res.writeHead(204,
                            {'Location': '/bags/' + bag_name +
                            '/tiddlers/' + tiddler_name});
                        res.end('');
                    }
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('No body content\n');
            }
        });
    },
    get_recipe_tiddlers: function(req, res) {
        var recipe_name = RegExp.$1;
        var error = function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('No recipe ' + recipe_name + ':'  + err + '\n');
        }
        var success = function(data) {
            var recipe = JSON.parse(data).recipe;
            var bags = [];
            recipe.forEach(function(recipe_line) {
                var bag = recipe_line[0];
                var filter = recipe_line[1]; // discard for now
                bags.push(bag); // in reverse order
            });
            var check_for_tiddler = function(bags) {
                var bag = bags.pop();
                var bagerror = function(err) {
                    res.writeHead('404', {'Content-Type': 'text/plain'});
                    res.end('No bag ' + bag + ': ' + err + '\n');
                }
                if (bag) {
                    var tiddlers = {};
                    var emitter = Store.get_bag_tiddlers(bag);
                    emitter.addListener('data', function(tiddler) {
                        sys.puts('adding tiddler ' + tiddler.title);
                        tiddlers[tiddler.title] = tiddler;
                    });
                    emitter.addListener('end', function() {
                        sys.puts(bags.length);
                        if (bags.length) {
                            check_for_tiddler(bags);
                        } else {
                            res.writeHead('200',
                                {'Content-Type': 'application/json'});
                            var outputs = [];
                            for (tiddler in tiddlers) {
                                sys.puts(tiddler);
                                outputs.push(tiddlers[tiddler]);
                            }
                            res.end(JSON.stringify(outputs));
                        }
                    });
                } else {
                    res.writeHead('404', {'Content-Type': 'text/plain'});
                    res.end('No bags for recipe: ' + recipe_name + '\n');
                }
            }
            check_for_tiddler(bags);
        }
        Store.get_recipe(recipe_name, success, error);
    },
    get_recipe_tiddler: function(req, res) {
        var recipe_name = RegExp.$1;
        var tiddler_name = RegExp.$2;
        var error = function(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('No recipe ' + recipe_name + ':'  + err + '\n');
        }
        var success = function(data) {
            var recipe = JSON.parse(data).recipe;
            var bags = [];
            recipe.forEach(function(recipe_line) {
                var bag = recipe_line[0];
                var filter = recipe_line[1]; // discard for now
                bags.push(bag); // in reverse order
            });
            var check_for_tiddler = function(bags) {
                var bag = bags.pop();
                var bagerror = function(err) {
                    res.writeHead('404', {'Content-Type': 'text/plain'});
                    res.end('No bag ' + bag + ': ' + err + '\n');
                }
                if (bag) {
                    var emitter = Store.get_bag_tiddlers(bag);
                    emitter.addListener('data', function(tiddler) {
                         if (tiddler.title == tiddler_name) {
                            res.writeHead(200, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify(tiddler));
                        }
                    });
                    emitter.addListener('end', function() {
                        if (bags) {
                            check_for_tiddler(bags);
                        }
                    });
                } else {
                    res.writeHead('404', {'Content-Type': 'text/plain'});
                    res.end('No recipe or bag for tiddler: ' + recipe_name +
                            ':' + tiddler_name + '\n');
                }
            }
            check_for_tiddler(bags);
        }
        Store.get_recipe(recipe_name, success, error);
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
    '\/': { GET: Handlers.get_root },
    '\/bags\/?': { GET: Handlers.get_bags },
    '\/recipes\/?': { GET: Handlers.get_recipes },
    '\/recipes\/([\\w\.-]+)\/?': {
        GET: Handlers.get_recipe,
        PUT: Handlers.put_recipe,
        DELETE: Handlers.delete_recipe,
    },
    '\/recipes\/([\\w\.-]+)\/tiddlers\/?': {
        GET: Handlers.get_recipe_tiddlers,
    },
    '\/recipes\/([\\w\.-]+)\/tiddlers\/(\\w+)\/?': {
        GET: Handlers.get_recipe_tiddler,
        PUT: Handlers.put_recipe_tiddler,
    },
/*'\/recipes\/(\\w+)\/tiddlers\/(\\w+)\/revisions\/?': {
        GET: Handlers.get_recipe_tiddler_revisions,
    }, */
    '\/bags\/([\\w\.-]+)\/?': {
        GET: Handlers.get_bag,
        PUT: Handlers.put_bag,
        DELETE: Handlers.delete_bag,
    },
    '\/bags\/([\\w\.-]+)\/tiddlers\/?': {
        GET: Handlers.get_bag_tiddlers,
    },
    '\/bags\/([\\w\.-]+)\/tiddlers\/([\\w\.-]+)\/?': {
        PUT: Handlers.put_bag_tiddler,
        GET: Handlers.get_bag_tiddler,
        DELETE: Handlers.delete_bag_tiddler,
    },
/*    '\/bags\/(\\w+)\/tiddlers\/(\\w+)\/revisions\/?': {
        GET: Handlers.get_bag_tiddler_revisions,
    },*/
    '\/search': { GET: Handlers.search },
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
            sys.puts(pattern);
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
