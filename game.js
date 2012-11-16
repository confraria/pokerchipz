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
    state.bet = (this.currentHand && this.currentHand.bet) ? this.currentHand.bet.id : null;
    state.dealer = (this.dealer && this.dealer.id) || null;
    state.gamestatus = this.status;
    state.players = this.getActivePlayers().map(function(p) {
        return {
            id : p.id,
            name : p.name,
            credits : p.credits,
            totalBet : p.totalBet
        }
    });
    state.pot = (this.currentHand && this.currentHand.pot) || null;
    
    return state;
};

Game.prototype.startBet = function() {
    if (this.currentHand) {
        this.currentBet.startBet();
        return;
    }

    this.currentHand = new Hand({ game: this });
};

Game.prototype.addPlayer = function(cfg) {
    cfg.credits = this.initCredits;
    var currentPlayer = player.createPlayer(cfg);
    this.players[cfg.id] = currentPlayer;
    this.playersStack.push(currentPlayer);
    console.log("Added user id " + cfg.id);
    console.log('Existem '+ Object.keys(this.players).length + " jogadores");
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

Game.prototype.notify = function(io, msg) {
    this.sio.socket.in(this.id).emit('notify', msg);
}

Game.prototype.sendUpdate = function(io) {
    this.sio.sockets.in(this.id).emit('update', this.getGameState());
}

Game.prototype.startPlay = function() {
    var dealer = 0;
    this.currentPlay = new Play({
        dealer : dealer,
        bblind : dealer + 1,
        sblind : dealer + 2
    });
}

Game.prototype.nextHand = function() {
    this.prevHand = this.currentHand;
    this.dealer = this.prevHand ? this.getNextActivePlayer(this.prevHand.dealer) : this.getActivePlayers()[0];
    this.status = READYTOBET;
    if (this.nrhands % BLINDINCREMENT === 0) this.blindLevel++;
    if (blindLevel >= BLINDS.length) this.blindLevel = BLINDS.length-1;
    this.sendUpdate();
};

var Hand = function(cfg) {
    this.pot = 0;
    this.maxbet = 0;
    this.betRound = 0;
    this.game = cfg.game;
    this.players = this.game.getActivePlayers();
    this.sblind = this.game.getNextActivePlayer(this.game.dealer);
    this.bblind = this.game.getNextActivePlayer(this.sblind);
    this.game.nrhands++;
    this.cleanPlayers();
}

Hand.prototype.cleanPlayers = function() {
    this.game.playersStack.forEach(function(p) {
        p.totalBet = undefined;
    });
};

Hand.prototype.placeBlinds = function(first_argument) {
    var sblindValue = BLINDS[this.game.blindLevel],
        bblindValue = sblindValue*2;

    this.pot += this.sblind.bet(sblindValue);
    this.pot += this.bblindValue.bet(bblindValue);
    this.maxbet = bblindValue;
}

Hand.prototype.notifyBet = function() {
    this.bet.socket.send('msg', 'Your turn to bet');
    this.game.sendUpdate();
}

Hand.prototype.bet = function(player, val) {
    if (player.totalBet === undefined) player.totalBet = 0;

    if ((player.totalBet + val) >= this.maxbet) {
        this.pot += val;
        this.maxbet = (player.totalBet + val);
        this.setupNextBet();
        return val;
    } else {
        player.socket.send('notify', 'That bet is not valid. Bet again.');
        return 0;
    }
}

Hand.prototype.startBet = function() {
    if (this.betRound == 0) {
        this.bet = this.game.getNextActivePlayer(this.bblind);  
        this.placeBlinds();
        this.notifyBet();
    } else {
        this.notifyBet();
    }
};

Hand.prototype.fold = function() {
    this.gameSendUpdate();
    this.setupNextBet();
};

Hand.prototype.setupNextBet = function() {
    if (this.games.status === BETTING && this.allBetsBalanced()) {
        this.games.status = READYTOBET;
        this.betRound++;
        
        if (this.betRound == BETROUNDS || (this.game.getActivePlayers() > 1)) {
            this.close();
            return;
        }

        this.bet = this.game.getNextActivePlayer(this.dealer);
    } else {
        this.bet = this.game.getNextActivePlayer(this.bet);
        this.notifyBet();
    }
};

Hand.prototype.allBetsBalanced = function() {
    var players = this.game.getActivePlayers(),
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
    var players = this.game.getActivePlayers();
    if (players.length == 1) {
        this.win(player);
    } else {
        players.map
        this.dealer.socket.emit('endhand', {players: players});
    }
};

Hand.prototype.win = function(player) {
    player.credits += this.pot;
    player.socket.emit('notify', 'You won the pot');
    player.socket.notify(player.name + " won the pot");
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