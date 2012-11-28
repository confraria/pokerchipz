var player = require('./player');

var games = {},
    BLINDS = [10  ,15  ,20  ,25  ,50  ,75  ,100 ,150 ,200 ,300 ,400 ,500 ,600 ,800 ,1000],
    BETROUNDS = 4,
    BLINDINCREMENT = 4,
    SETUP = 1,
    READYTOBET = 2,
    BETTING = 3,
    FINNISHED = 4;


var Game = function(cfg) {
    this.id = cfg.id;
    this.players = {};
    this.playersStack = [];
    this.initCredits = cfg.initCredits || 1000;
    this.nrhands = 0;
    this.blindLevel = 0;
    this.status = SETUP;
}

Game.prototype.getOrCreatePlayer = function(cfg) {
    var cPlayer = this.players[cfg.id];
    if (!cPlayer) {
        cPlayer = this.addPlayer(cfg);
    }
    return cPlayer;
}

Game.prototype.getGameState = function() {
    var state = {};
    state.smallblind = BLINDS[this.blindLevel];
    state.bigblind = BLINDS[this.blindLevel]*2;
    state.bet = (this.currentHand && this.currentHand.better) ? this.currentHand.better.id : null;
    state.dealer = (this.dealer && this.dealer.id) || null;
    state.gamestatus = this.status;
    state.nrhands = this.nrhands;
    state.players = this.playersStack.map(function(p) {
        return {
            id : p.id,
            name : p.name,
            credits : p.credits,
            totalBet : p.totalBet,
            fold : p.folded
        }
    });
    state.pot = (this.currentHand && this.currentHand.pot) || null;
    state.maxbet = (this.currentHand && this.currentHand.maxbet) || null;
    
    return state;
};

Game.prototype.startBet = function() {
    if (this.currentHand) {
        this.currentHand.startBet();
        return;
    }
    this.nextHand(true);
};

Game.prototype.addPlayer = function(cfg) {
    cfg.credits = this.initCredits;
    var currentPlayer = player.createPlayer(cfg);
    this.players[cfg.id] = currentPlayer;
    this.playersStack.push(currentPlayer);
    if (this.playersStack.length == 1) {
        this.dealer = currentPlayer;
    }

    if (this.playersStack.length >= 3) {
        if (this.status === SETUP) {
            this.status = READYTOBET;
        }
    }
    this.sendUpdate()
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

Game.prototype.notify = function(msg) {
    this.sio.sockets.in(this.id).emit('notify', msg);
}

Game.prototype.sendUpdate = function(io) {
    this.sio.sockets.in(this.id).emit('update', this.getGameState());
}

Game.prototype.nextHand = function(startnow) {
    this.prevHand = this.currentHand;
    this.dealer = this.prevHand ? this.getNextActivePlayer(this.prevHand.dealer) : this.dealer;
    this.status = READYTOBET;
    if ((this.nrhands % BLINDINCREMENT === 0) && this.nrhands) this.blindLevel++;
    if (this.blindLevel >= BLINDS.length) this.blindLevel = BLINDS.length-1;
    this.currentHand = new Hand({game:this});
    if (startnow) this.currentHand.startBet();
    this.sendUpdate();
};

var Hand = function(cfg) {
    this.game = cfg.game;
    this.cleanPlayers();
    this.pot = 0;
    this.maxbet = 0;
    this.betRound = 0;
    this.players = this.game.getActivePlayers();
    this.sblind = this.game.getNextActivePlayer(this.game.dealer);
    this.bblind = this.game.getNextActivePlayer(this.sblind);
    this.dealer =  this.game.dealer;
    this.game.nrhands++;
}

Hand.prototype.cleanPlayers = function() {
    this.game.playersStack.forEach(function(p) {
        p.totalBet = undefined;
        p.folded = undefined;
    });
};

Hand.prototype.placeBlinds = function(first_argument) {
    var sblindValue = BLINDS[this.game.blindLevel],
        bblindValue = sblindValue*2;

    this.sblind.bet(sblindValue, true);
    this.bblind.bet(bblindValue, true);
}

Hand.prototype.notifyBet = function() {
    this.better && this.better.socket.emit('notify', 'Your turn to bet');
    this.game.sendUpdate();
}

Hand.prototype.bet = function(player, val, force) {
    if (!force && (player != this.better)) {
        player.socket.emit('notify', 'Not your turn to bet');
        return;
    }
    if (player.totalBet === undefined) player.totalBet = 0;
    console.log("HANDBET", val);
    console.log((player.totalBet + val) >= this.maxbet);
    if ((player.totalBet + val) >= this.maxbet) {
        player.credits -= val;
        player.totalBet += val;
        this.pot += val;
        this.maxbet = player.totalBet;
        this.game.notify(player.name + ' placed a bet for '+val);
        if (!force) this.setupNextBet();
    } else {
        player.socket.emit('notify', 'That bet is not valid. Bet again.');
    }
}

Hand.prototype.startBet = function() {
    this.game.status = BETTING;
    if (this.betRound == 0) {
        this.better = this.game.getNextActivePlayer(this.bblind);
        this.placeBlinds();
        this.notifyBet();
    } else {
        this.better = this.game.getNextActivePlayer(this.dealer);
        this.notifyBet();
    }
};

Hand.prototype.fold = function(player, force) {
    if (!force && (player != this.better)) {
        player.socket.emit('notify', 'Not your turn to bet');
        return;
    }
    player.folded = true
    player.notify('You folded');
    this.game.notify(player.name +" folded");
    this.game.sendUpdate();
    this.setupNextBet();
};

Hand.prototype.setupNextBet = function() {
    if (this.game.status === BETTING && this.allBetsBalanced()) {
        this.game.status = READYTOBET;
        this.betRound++;
        
        if ((this.betRound === BETROUNDS) || (this.getPlayersInHand().length === 1)) {
            this.close();
            return;
        }

        this.better = null;
    } else {
        this.better = this.game.getNextActivePlayer(this.better);
    }
    this.notifyBet();
};

Hand.prototype.getPlayersInHand = function() {
    var players = this.game.getActivePlayers();
    return players.filter(function(player) {
        return !player.folded;
    });
};

Hand.prototype.allBetsBalanced = function() {
    var players = this.getPlayersInHand(),
        balanced = true,
        maxbet = this.maxbet;

    players.forEach(function(item) {
        if (item.totalBet !== maxbet) {
            balanced = false;
            return false;
        }
    });

    return balanced;
};

Hand.prototype.close = function() {
    this.game.status = SETUP;
    var players = this.getPlayersInHand();
    if (players.length == 1) {
        this.win(players[0]);
    } else {
        players = players.map(function(p) {
            return {
                id : p.id,
                name : p.name
            }
        });
        this.dealer.socket.emit('endhand', {players: players});
    }
};

Hand.prototype.win = function(player) {
    player.credits += this.pot;
    player.socket.emit('notify', 'You won the pot');
    player.notify(player.name + " won the pot");
    this.cleanPlayers();
    this.game.sendUpdate();
    this.game.nextHand();
}


exports.getGame = function(id) {
    return games[id];
}

exports.createGame = function(id) {
    var game = new Game({id:id});
    games[id] = game;
    return game;
}