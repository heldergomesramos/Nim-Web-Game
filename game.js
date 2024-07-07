module.exports.Game = class {
	constructor(size, player1, player2, gameId) {
        this.size = size;
        this.player1 = player1;
        this.player2 = player2;
        this.gameId = gameId;
        this.player1Turn = true;
        this.remaining = 0;
        this.pieces = size;
        this.rack = [];
        this.stack = 0;
        this.winner = null;
        for(let i = 0; i < size; i++) {
            this.rack[i] = i + 1;
            this.remaining += i + 1;
        }
    }

    play(column, line) {
        console.log("PLAY (game.js)");
        this.remaining -= (this.rack[column] - line);
        this.rack[column] = line;
        this.pieces = line;
        this.stack = column;
        if(this.isOver())
            this.winner = this.getTurnNick();
        this.player1Turn = !this.player1Turn;
    }

    getTurnNick() {
        return this.player1Turn ? this.player1 : this.player2;
    }

    isOver() {
        return this.remaining <= 0;
    }

    otherNick(nick) {
        return nick == this.player1 ? this.player2 : this.player1;
    }
}