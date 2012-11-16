var Player = function(cfg) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.credits = cfg.credits;
    this.socket = cfg.socket;
    this.game = cfg.game;

    this.socket.join(this.game.id);
}

Player.prototype.notify = function(msg) {
    this.socket.broadcast.to(this.game.id).emit('notify', msg);
}

Player.prototype.getNextActivePlayer = function() {
    return this.game.getNextActivePlayer(this);
};

Player.prototype.bet = function(val) {
    this.credits -= this.game.currentHand.bet(val, this);
    return val;
};

Player.prototype.fold = function() {
    this.game.currentHand.fold(this);
    return val;
};

Player.prototype.win = function() {
    this.game.currentHand.win(this);
};

Player.prototype.sendUpdate = function() {
    this.socket.emit('update', this.game.getGameState());
};

exports.createPlayer = function(data) {
    return new Player(data);
}

