var player = require('./player');

var games = {};

var Game = function(cfg) {
    this.id = cfg.id;
    this.players = {};
    this.initCredits = cfg.initCredits || 1000;
}

Game.prototype.addPlayer = function(cfg) {
    cfg.credits = this.initCredits;
    var currentPlayer = player.createPlayer(cfg);
    this.players[cfg.id] = currentPlayer;
    console.log("Added user id " + cfg.id);
    console.log('Existem '+ Object.keys(this.players).length + " jogadores");
    return currentPlayer;
}



exports.getGame = function(id) {
    return games[id];
}

exports.createGame = function(id) {
    var game = new Game({id:id});
    games[id] = game;
    return game;
}