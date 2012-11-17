$(function() {
    //Ugly shit is ugly...
    var usertpl = Hogan.compile('{{#players}}'+
        '<li class="player {{#fold}}fold{{/fold}}" data-id="{{id}}">'+
        '<span class="totalbet">{{totalBet}}</span>'+
        '<span class="name">{{name}}</span>'+
        '<span class="credits">{{credits}}</span>'+
        '</li>'+
        '{{/players}}'),
        notifytpl = Hogan.compile('<div class="notify">{{msg}}</div>'),
        gametpl = Hogan.compile('<ul class="gameinfo">'+
            '<li><span class="descr">Hands Played</span><span class="nr">{{nrhands}}</span></li>'+
            '<li><span class="descr">Players</span><span class="nr">{{nrplayers}}</span></li>'+
            '<li><span class="descr">Small Blind</span><span class="nr">{{smallblind}}</span></li>'+
            '<li><span class="descr">Big Blind</span><span class="nr">{{bigblind}}</span></li>'+
            '<li><span class="descr">Current Pot</span><span class="nr">{{pot}}</span></li>'+
            '</ul>');

        socket = io.connect('/');
    
    socket.emit('init', {gameid: gameid});
    function updatePlayers(data) {
        var html = usertpl.render({players:data});
        $('.listplayers').html(html);
        if (!data.length) {
            $('.qrcode').addClass('highlight');
        }
    }

    socket.on('update', function (data) {
        updatePlayers(data.players);
        $('[data-id="'+data.dealer+'"]').append('<span class="info dealer">DEALER</span>');
        $('[data-id="'+data.bet+'"]').addClass('betting');
        $('.fold').append('<span class="info fold">FOLDED</span>');
        if (data.nrhands) {
            $('.hidesplash').trigger('click');
            data.nrplayers = data.players.length;
            var gamehtml = gametpl.render(data);
            if ($('.gameinfo').length) {
                $('.gameinfo').replaceWith(gamehtml);
            } else {
                $('.splash').after(gamehtml);
            }    
        }
        

    });

    socket.on('notify', function (data) {
        $('.notify').remove();
        $(notifytpl.render({msg:data})).prependTo('body').fadeIn().delay(3000).fadeOut();
    });

    $('.hidesplash').on('click', function(e) {
        e.preventDefault();

        var qrcode = $('.qrcode').clone().removeClass('highlight').addClass('.openSplash').on('click', function() {
            $('.splash').show();
            $(this).remove();
        });
        qrcode.prependTo('body');
        qrcode.css({
            position : 'fixed',
            top      : '20px',
            right    : '0',
            height    : '40px',
            width     : '40px',
            cursor   : 'pointer'
        });
        $('.splash').hide();

    });
});

var connBucket = {};
function simulatePlayer(ix) {
    var socket = io.connect('/',{
        'force new connection' : true
    });
    socket.emit('init', {gameid: gameid, id: '4242424424242424'+ix, name: 'Cantinflas ' + ix});
    connBucket['4242424424242424'+ix] = socket;
}
function simulateStartBet(ix) {
    var socket = connBucket['4242424424242424'+ix];
    socket.emit('startbet');
}

function simulateBet(ix, val) {
    var socket = connBucket['4242424424242424'+ix];
    socket.emit('action', {fold:false, bet: val});
}

function simulateFold(ix, val) {
    var socket = connBucket['4242424424242424'+ix];
    socket.emit('action', {fold:true, bet: null});
}

function TestingBatch() {

    var count = 0;
        cint = setInterval(function() {
            simulatePlayer(count);
            count++;
            if (count > 5) {
                clearInterval(cint);
            }
        },400);
}