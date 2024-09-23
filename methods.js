const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const updater = require("./updater");
const configs = require("./configs");
const game = require("./game");

let rankingList = [];
let playerList = [];
let playersInQueue = [null, null, null, null, null, null, null];
let playerToGame = new Map();
let activeGames = [];

module.exports.postRequest = function (json, path, response) {
  switch (path) {
    case "/register": {
      let nick = json.nick;
      let pass = json.password;

      if (
        nick == undefined ||
        nick == null ||
        pass == undefined ||
        pass == null
      ) {
        response.writeHead(400);
        response.end("Invalid request");
      }

      const crypto_pass = crypto.createHash("md5").update(pass).digest("hex");

      let isUser = false;
      fs.readFile("players.json", function (err, data) {
        if (!err) {
          let storedText = data.toString();
          if (storedText.length == 0 || storedText == null) {
            registerUser(response, nick, crypto_pass);
            return;
          }
          playerList = JSON.parse(data.toString());
          for (let i = 0; i < playerList.length; i++) {
            if (playerList[i].nick == nick) {
              isUser = true;
              if (playerList[i].password == crypto_pass) {
                response.writeHead(200, configs.headers.plain);
                response.write("{}");
                response.end();
                return;
              } else {
                response.writeHead(401, configs.headers.plain);
                response.write("Wrong password");
                response.end();
                return;
              }
            }
          }
          if (!isUser) {
            registerUser(response, nick, crypto_pass);
          }
        } else console.trace(err);
      });
      break;
    }
    case "/ranking": {
      fs.readFile("ranking.json", function (err, data2) {
        if (!err) {
          let storedText = data2.toString();
          let size = json.size;
          let arrayOfData = JSON.parse(storedText);
          let arrayOfRankings = [];
          for (let i = 0; i < arrayOfData.length; i++) {
            if (arrayOfData[i].size == size) {
              arrayOfRankings = arrayOfData[i].ranking;
              break;
            }
          }

          arrayOfRankings.sort(function (a, b) {
            return b.victories - a.victories;
          });

          let answer = { ranking: arrayOfRankings };

          response.writeHead(200, configs.headers.plain);
          response.write(JSON.stringify(answer));
          response.end();
          return;
        }
      });
      break;
    }
    case "/join": {
      let nick = json.nick;
      let pass = json.password;
      let size = json.size;

      if (
        nick == undefined ||
        nick == null ||
        pass == undefined ||
        pass == null
      ) {
        response.writeHead(400);
        response.end("Invalid request");
        return;
      }

      pass = crypto.createHash("md5").update(pass).digest("hex");
      let gameId = "";
      fs.readFile("players.json", function (err, data) {
        if (err) {
          response.writeHead(500);
          response.end("Internal server error");
          return;
        }

        let players = JSON.parse(data.toString());
        for (let i = 0; i < players.length; i++) {
          if (players[i].nick == nick) {
            if (players[i].password == pass) {
              break; // Valid login
            } else {
              response.writeHead(401);
              response.end("Unauthorized");
              return;
            }
          }
        }

        let boardIndex = size - 3;
        if (playersInQueue[boardIndex] == null) {
          gameId = crypto
            .createHash("md5")
            .update("game" + new Date().getTime())
            .digest("hex");
          playersInQueue[boardIndex] = nick;
          playerToGame.set(nick, gameId);
        } else {
          let player1 = playersInQueue[boardIndex];
          gameId = playerToGame.get(player1);
          playersInQueue[boardIndex] = null;
          let newGame = new game.Game(size, player1, nick, gameId);
          activeGames.push(newGame);
          updater.start(newGame.rack, newGame.getTurnNick(), gameId);
        }

        response.writeHead(200, configs.headers.plain);
        response.write(JSON.stringify({ game: gameId }));
        response.end();
      });
      break;
    }

    case "/leave": {
      //Not tested yet because game needs to exist
      let nick = json.nick;
      let pass = json.password;
      let gameId = json.game;

      pass = crypto.createHash("md5").update(pass).digest("hex");

      fs.readFile("players.json", function (err, data) {
        if (!err) {
          let players = JSON.parse(data.toString());
          for (let i = 0; i < players.length; i++) {
            if (players[i].nick == nick) {
              if (players[i].password == pass) {
                break;
              } else {
                response.writeHead(401);
                response.end();
                return;
              }
            }
          }
          let g = getGameFromId(gameId);
          response.writeHead(200, configs.headers.plain);
          response.end();
          if (g == null) {
            let i = playersInQueue.indexOf(nick);
            playersInQueue[i] = null;
          } else {
            writeOnRanking(g.otherNick(nick), nick, g.size);
          }
          updater.leave(gameId, g, nick);
        }
      });
      break;
    }
    case "/notify": {
      let nick = json.nick;
      let pass = json.password;
      let gameId = json.game;
      let stack = json.stack;
      let pieces = json.pieces;
      pass = pass = crypto.createHash("md5").update(pass).digest("hex");
      fs.readFile("players.json", function (err, data) {
        if (!err) {
          let players = JSON.parse(data.toString());
          for (let i = 0; i < players.length; i++) {
            if (players[i].nick == nick) {
              if (players[i].password == pass) {
                break;
              } else {
                response.writeHead(401);
                response.end();
                return;
              }
            }
          }

          response.writeHead(200, configs.headers.plain);
          response.end();

          let curGame = getGameFromId(gameId);
          curGame.play(stack, pieces);
          if (curGame.winner == null) {
            updater.updateBoard(
              gameId,
              curGame.stack,
              curGame.pieces,
              curGame.rack,
              curGame.getTurnNick()
            );
          } else {
            updater.broadcastWinner(curGame.winner, gameId);
            writeOnRanking(
              curGame.winner,
              curGame.otherNick(curGame.winner),
              curGame.size
            );
            activeGames.splice(gameId);
          }
        }
      });
      break;
    }
    default:
      response.writeHead(403);
      response.end();
      break;
  }
};

module.exports.getRequest = function (request, pathurl, response, query) {
  switch (pathurl) {
    case null:
      response.writeHead(403);
      response.end();
      break;

    case "/update": {
      let nick = query.nick;
      let gameId = query.game;
      if (nick == null || gameId == null) {
        response.writeHead(400);
        response.end();
        return;
      }
      updater.remember(response, gameId);
      request.on("close", () => {
        updater.forget(response);
      });
      response.writeHead(200, configs.headers.sse);
      break;
    }
    default:
      const sanitizePath = path
        .normalize(pathurl)
        .replace(/^(\.\.[\/\\])+/, "");
      let pathnam = path.join(__dirname, sanitizePath);
      response.setHeader("Content-Type", getMediaType(pathnam));
      fs.readFile(pathnam, function (error, data) {
        if (error) {
          response.writeHead(404);
          response.end(pathnam);
        } else {
          response.writeHead(200);
          response.end(data);
        }
      });
      break;
  }
};

class Ranking {
  constructor(nick, victories, games) {
    this.nick = nick;
    this.victories = victories;
    this.games = games;
  }
}

function getGameFromId(gameId) {
  for (let curGame of activeGames) if (curGame.gameId == gameId) return curGame;
  return null;
}

function registerUser(response, nick, crypto_pass) {
  let user = { nick: nick, password: crypto_pass };
  playerList.push(user);

  fs.writeFile("players.json", JSON.stringify(playerList), function (err) {
    if (err) {
      console.trace(err);
    } else {
      response.writeHead(200, configs.headers.plain);
      response.write("{}");
      response.end();
    }
  });
}

function writeOnRanking(winner, loser, size) {
  fs.readFile("ranking.json", function (err, data) {
    if (!err) {
      rankingList = JSON.parse(data.toString());
      let rankingOfSize = {};
      let dataToWrite = [];
      for (let r of rankingList) {
        if (r.size == size) {
          rankingOfSize = r.ranking;
        } else {
          dataToWrite.push(r);
        }
      }
      let newRanking = [];
      let winnerFound = false;
      let loserFound = false;
      for (let r of rankingOfSize) {
        if (r.nick == winner) {
          newRanking.push(new Ranking(r.nick, r.victories + 1, r.games + 1));
          winnerFound = true;
        } else if (r.nick == loser) {
          newRanking.push(new Ranking(r.nick, r.victories, r.games + 1));
          loserFound = true;
        } else {
          newRanking.push(new Ranking(r.nick, r.victories, r.games));
        }
      }
      if (!winnerFound) {
        newRanking.push(new Ranking(winner, 1, 1));
      }
      if (!loserFound) {
        newRanking.push(new Ranking(loser, 0, 1));
      }
      dataToWrite.push({ size: size, ranking: newRanking });
      fs.writeFile("ranking.json", JSON.stringify(dataToWrite), function (err) {
        if (err) console.trace(err);
      });
    }
  });
}

function getMediaType(pathname) {
  const pos = pathname.lastIndexOf(".");
  let mediaType;

  if (pos !== -1) mediaType = mediaTypes[pathname.substring(pos + 1)];

  if (mediaType === undefined) mediaType = "text/plain";
  return mediaType;
}

documentRoot = "localhost:8001";
defaultIndex = "index.html";
mediaTypes = {
  txt: "text/plain",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  png: "image/png",
  ico: "image/x-icon",
  otf: "application/x-font-opentype",
};
