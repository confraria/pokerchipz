
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    io = require('socket.io'),
    game = require('./game');

var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'hjs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(require('stylus').middleware(__dirname + '/public'));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/newgame', routes.newgame);
app.get('/:id', routes.game);

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

//Socket io
var sio = io.listen(server);
sio.sockets.on('connection', function(socket){
    var playerCfg = socket.handshake.headers,
    currentGame = game.getGame(playerCfg.gameid),
    isPlayer = !!playerCfg.id;

    if (isPlayer && currentGame) {
        if (!currentGame.sio) currentGame.sio = sio;

        playerCfg.socket = socket;
        playerCfg.game = currentGame;
        socket.player = currentGame.getOrCreatePlayer(playerCfg);

        socket.on('startbet', function(data, fn) {
            if (socket.player.isDealer()) {
                fn("Betting Starting");
            } else {
                fn("You're not the dealer.")
            }
        });

        socket.on('setwinner', function(id, fn) {
            if (socket.player.isDealer()) {
                fn("Winner Set");
            } else {
                fn("You're not the dealer.");
            }
        });

        socket.on('action', function(data, fn) {
            if (data.fold) {
                fn('You folded');
            }

            if (data.bet && !data.fold) {
                fn('You betted '+data.bet);
            }
        });
    }
});
