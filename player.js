var Player = function(cfg) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.credits = cfg.credits;
    this.socket = cfg.socket;
}

exports.createPlayer = function(data) {
    return new Player(data);
}

