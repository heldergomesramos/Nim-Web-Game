const configs = require('./configs');

let responses = new Map();

module.exports.remember = function(response, gameId) {
    responses.set(response, gameId);
}

module.exports.forget = function(removeThis) {
    removeThis.end();
}

module.exports.leave = function(gameId, gameFound, nick) {
    let responsesToDelete = [];
    for(let response of responses)
        if(response[1] == gameId)
            responsesToDelete.push(response[0]);
    for(let i = 0; i < responsesToDelete.length; i++) {
        let winner = gameFound == null ? null : gameFound.otherNick(nick);
        responsesToDelete[i].write('data: '+ JSON.stringify({"winner":winner}) +'\n\n');
    }
}

module.exports.start = function(rack, turn, gameId) {
    for(let response of responses) {
        if(response[1] == gameId) {
            response[0].writeHead(200, configs.headers.sse);
            response[0].write('data: '+ JSON.stringify({"rack": rack, "turn": turn}) +'\n\n');
        }
    }
}

module.exports.updateBoard = function(gameId, stack, pieces, rack, turn) {
    for(let response of responses)
        if(response[1] == gameId)
            response[0].write('data: '+ JSON.stringify({"stack": stack, "pieces": pieces, "rack": rack, "turn": turn}) +'\n\n');
}

module.exports.broadcastWinner = function(winner, gameId) {
    for(let response of responses)
        if(response[1] == gameId)
            response[0].write('data: '+ JSON.stringify({"winner": winner}) +'\n\n');
}