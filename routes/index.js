/*
 * GET home page.
 */
var uuid = require('node-uuid'),
    games = require('../game');


exports.index = function(req, res){
    res.render('index', { title: 'Poker chipz' });
};


exports.newgame = function(req, res) {
    var id = uuid.v4()
    games.createGame(id);
    res.redirect("/"+id);
}

exports.game = function(req, res) {
    var id = req.params.id;
    if (games.getGame(id)) {
        res.render('index', { title: 'Poker chipz', gameid: id });
    } else {
        res.send(404, 'No game for you.');
    }
}