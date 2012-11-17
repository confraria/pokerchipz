
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    io = require('socket.io'),
    game = require('./game'),
    nib = require('nib'),
    stylus = require('stylus');

var app = express();

function styluscompile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib());
}


app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'hjs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(stylus.middleware({
        src: __dirname + '/public',
        compile : styluscompile
    }));
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
    console.log("CONNECTION!!!");
    socket.on('init', function(playerCfg) {
        var currentGame = game.getGame(playerCfg.gameid),
            isPlayer = !!playerCfg.id;

        console.log(playerCfg);
        if (isPlayer && currentGame) {
            if (!currentGame.sio) currentGame.sio = sio;

            playerCfg.socket = socket;
            playerCfg.game = currentGame;
            socket.player = currentGame.getOrCreatePlayer(playerCfg);
            socket.on('startbet', function(data) {
                if (socket.player.isDealer()) {
                    currentGame.startBet();
                } else {
                    socket.emit('notify', "You're not the dealer");
                }
            });

            socket.on('setwinner', function(id) {
                if (socket.player.isDealer()) {
                    game.getGame(id).win();
                } else {
                    socket.emit('notify', "You're not the dealer");
                }
            });

            socket.on('action', function(data) {
                if (data.fold) {
                    socket.player.fold();
                }

                if (data.bet && !data.fold) {
                    socket.player.bet(data.bet);
                }
            });
            socket.player.socket = socket;
            socket.player.sendUpdate();
        } else {
            //dashboard
            if (currentGame) {
                socket.join(currentGame.id);
                socket.emit('update', currentGame.getGameState());
            }
            socket.emit('welcome', {data:1, datab:'ajsdhfkjad'});
        }
    });
});
