var player = require('./player');

var games = {},
    sblinds = [10  ,15  ,20  ,25  ,50  ,75  ,100 ,150 ,200 ,300 ,400 ,500 ,600 ,800 ,1000];


var Game = function(cfg) {
    this.id = cfg.id;
    this.players = {};
    this.playersStack = [];
    this.initCredits = cfg.initCredits || 1000;
    this.nrhands = 0;
    this.blindLevel = 0;
}

Game.prototype.getOrCreatePlayer = function(cfg) {
    var cPlayer = this.players[cfg.id];
    if (!cPlayer) {
        cPlayer = this.addPlayer(cfg);
    }
    return cPlayer;
}

Game.prototype.addPlayer = function(cfg) {
    cfg.credits = this.initCredits;
    var currentPlayer = player.createPlayer(cfg);
    this.players[cfg.id] = currentPlayer;
    this.playersStack.push(currentPlayer);
    console.log("Added user id " + cfg.id);
    console.log('Existem '+ Object.keys(this.players).length + " jogadores");
    return currentPlayer;
}

Game.prototype.getActivePlayers = function() {
    return this.playersStack.filter(function(player) {
        return (player.credits > 0);
    });
}

Game.prototype.getNextActivePlayer = function(player) {
    var ix = this.playersStack.indexOf(player),
        t = this.playersStack.length,
        possibleNextPlayer,
        nextPlayer;

    while (!nextPlayer) {
        ix = (++ix < t) ? ix : 0;
        possibleNextPlayer = this.playersStack[ix];
        if (!possibleNextPlayer.folded && (possibleNextPlayer.credits > 0)) {
            nextPlayer = possibleNextPlayer;
        }
    }
    return ((nextPlayer === player) ? null : nextPlayer);
};

Game.prototype.notify = function(io, msg) {
    this.sio.socket.in(this.id).emit('notify', msg);
}

Game.prototype.sendUpdate = function(io) {
    this.sio.socket.in(this.id).emit('update', this.getGameState());
}

Game.prototype.startPlay = function() {
    var dealer = 0;
    this.currentPlay = new Play({
        dealer : dealer,
        bblind : dealer + 1,
        sblind : dealer + 2
    });
}

var Play = function(cfg) {
    var NROUNDS = 4;
    this.game = cfg.game;
    this.players = this.game.getActivePlayers();
}





exports.getGame = function(id) {
    return games[id];
}

exports.createGame = function(id) {
    var game = new Game({id:id});
    games[id] = game;
    return game;
}