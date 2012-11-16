
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    io = require('socket.io'),
    game = require('./game')

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
    var headers = socket.handshake.headers,
        currentGame = game.getGame(headers.gameid),
        isPlayer = !!headers.id;

    if (isPlayer && currentGame) {
      headers.socket = socket;
      var currentPlayer = currentGame.addPlayer(headers);
      socket.emit('welcome', 'welcome currentPlayer > ' + currentPlayer.name );
    }
  
});
