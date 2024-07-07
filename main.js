const COLOR_GREEN_DARK = getCSSVariable('--COLOR_GREEN_DARK');
const COLOR_RED_DARK = getCSSVariable('--COLOR_RED_DARK');
const COLOR_BLACK = getCSSVariable('--COLOR_BLACK');
const ANIMATION_DESTROY_TIME = 500;
const ANIMATION_TOGGLE_TIME = 260;
const MAX_DIFFICULTY = 4;
const MAX_BITS = 4;

let game;
let playerStats;
let themeSong = new Audio("res/audio/GTA_Vice_City_Theme.ogg");
let vsAi = true;
let playFirst = true;
let playFirstChanging = false;
let loggedIn = false;
let inGame = false;

const host = 'twserver.alunos.dcc.fc.up.pt';
const port = '8008';
const localTestUrl = 'http://' + "localhost" + ':' + 8001 + '/';
const url = 'http://' + host + ':' + port + '/';
const group = '01';

let uname = null;
let psw = null;
let eventSource = null;
let curGameId = null;

window.addEventListener("load", function() {
    playerStats = new Stats("guest");
    playerStats.loadStats();
    const loginForm = document.getElementById("loginScript");
    const loginButton = document.getElementById("loginButton");
    addButtonHover(loginButton, "Login_Button");
    loginButton.addEventListener("click", function() {
        loginForm.style.display="block";
    }, false);

    const statsTab = document.getElementById("statsDiv");
    const statsButton = document.getElementById("statsButton");
    addButtonHover(statsButton, "Stats_Button");
    statsButton.addEventListener("click", function() {
        statsTab.style.display="block";
    }, false);

    const rankingTab = document.getElementById("rankingDiv");
    const rankingButton = document.getElementById("rankingButton");
    addButtonHover(rankingButton, "Ranking_Button");
    rankingButton.addEventListener("click", function() {
        rankingTab.style.display="block";
        myFetch('ranking', {"group": group, "size": document.getElementById("boardSize").value})
        .then(response => response.json())
        .then(showRankings)
        .catch(console.log);
    }, false);

    const closeRankingScript = document.getElementById("closeRankingScript");
    closeRankingScript.addEventListener("click", function() {
        rankingTab.style.display="none";
        document.getElementById("rankingTable").innerHTML="<tr><th class=\"tableBorder\">Nick</th><th class=\"tableBorder\">Wins</th><th class=\"tableBorder\">Games</th></tr>"
    }, false);

    const closeStatsScript = document.getElementById("closeStatsScript");
    closeStatsScript.addEventListener("click", function() {
        statsTab.style.display="none";
    }, false);

    const closeLoginScript = document.getElementById("closeLoginScript");
    closeLoginScript.addEventListener("click", function() {
        loginForm.style.display="none";
    }, false);

    const cancelLoginScript = document.getElementById("cancelLoginScript");
    cancelLoginScript.addEventListener("click", function() {
        loginForm.style.display="none";
    }, false);

    const startButton = document.getElementById("startButton");
    addButtonHover(startButton, "Start_Button");
    startButton.addEventListener("click", function() {
        startGame();
    }, false);

    const tryAgainButton = document.getElementById("tryAgainButton");
    addButtonHover(tryAgainButton, "Try_Again_Button");
    tryAgainButton.addEventListener("click", function() {
        document.getElementById("endGameObjects").style.display="none";
        startGame();
    })

    const backButton = document.getElementById("backButton");
    addButtonHover(backButton, "Back_Button");
    backButton.addEventListener("click", function() {
        document.getElementById("endGameObjects").style.display="none";
        showSettings();
    })

    const cancelButton = document.getElementById("cancelButton");
    addButtonHover(cancelButton, "Back_Button");
    cancelButton.addEventListener("click", function() {
        exitQueue();
        leave();
    });

    const playFirstToggle = document.getElementById("playFirstToggle");
    playFirstToggle.addEventListener("click", function() {
        if(playFirstChanging)
            return;
        playFirstChanging = true;
        if(!playFirst) {
            playFirst = true;
            playFirstToggle.src="res/img/Toggle_Off_to_On.gif";
            setTimeout(function() {
                playFirstToggle.src="res/img/Toggle_On.png";
                playFirstChanging = false;
            }, ANIMATION_TOGGLE_TIME);
        }
        else {
            playFirst = false;
            playFirstToggle.src="res/img/Toggle_On_to_Off.gif";
            setTimeout(function() {
                playFirstToggle.src="res/img/Toggle_Off.png";
                playFirstChanging = false;
            }, ANIMATION_TOGGLE_TIME);
        }
    })

    const pcButton = document.getElementById("pcButton");
    const humanButton = document.getElementById("humanButton");
    pcButton.addEventListener("click", function() {
        if(!vsAi) {
            vsAi = true;
            pcButton.src="res/img/PC_On.png";
            humanButton.src="res/img/Human_Off.png";
            document.getElementsByClassName("square")[0].style.display = "none";
            document.getElementById("difficultyDiv").userSelect = "auto";
        }
    })
    humanButton.addEventListener("click", function() {
        if(vsAi) {
            vsAi = false;
            pcButton.src="res/img/PC_Off.png";
            humanButton.src="res/img/Human_On.png";
            document.getElementsByClassName("square")[0].style.display = "flex";
            document.getElementById("difficultyDiv").userSelect = "none";
        }
    })

    const logoutButton = document.getElementById("logoutButton");
    addButtonHover(logoutButton, "Logout_Button");
    logoutButton.addEventListener("click", function() {
        loggedIn = false;
        logoutButton.style.display="none";
        document.getElementById("loginName").style.display="none";
        loginButton.style.display="block";
        playerStats = new Stats("guest");
    }, false);

    const rulesButton = document.getElementById("rulesButton");
    addButtonHover(rulesButton, "Rules_Button");
    rulesButton.addEventListener("click", function() {
        rules.style.display="block";
    }, false);

    const closeRulesScript = document.getElementById("closeRulesScript");
    closeRulesScript.addEventListener("click", function() {
        rules.style.display="none";
    }, false);

    const surrenderButton = document.getElementById("surrenderButton");
    addButtonHover(surrenderButton, "Surrender_Button");
    surrenderButton.addEventListener("click", function() {
        if(!vsAi)
            leave();
        else
            Game.endGame(true);
    }, false);
}, false);

function exitQueue() {
    document.getElementById("queueObjects").style.display="none";
    showSettings();
}

function hideSettings() {
    document.getElementById("startButton").style.display="none";
    document.getElementById("settings").style.display="none";
    document.getElementById("loginButton").style.display="none";
}

function hideQueue() {
    document.getElementById("queueObjects").style.display="none";
}

function addButtonHover(object, name) {
    object.addEventListener("mouseover", function() {
        object.src="res/img/" + name + "_Hover.png";
    }, false);
    object.addEventListener("mouseout", function() {
        object.src="res/img/" + name + "_Normal.png";
    }, false);
}

function ballOver(id) {
    if(game.canPlay)
        game.shakeBalls(id, "_shake.gif");
}

function ballOut(id) {
    if(game.canPlay)
        game.shakeBalls(id, ".png");
}

function ballClick(id) {
    if(game.canPlay && game.remaining > 0 && game.stack[id[2]] > id[3])
        game.destroyBalls(id);
}


function startGame() {
    if(vsAi) {  
        hideSettings();
        createGame();
    }
    else {
        if(loggedIn) {
            myFetch('join', {"group": group, "nick": uname, "password": psw, "size": document.getElementById("boardSize").value})
            .then(response => response.json())
            .then(waitForPlayers)
            .catch(console.log);
        }
        else {
            console.log("NOT LOGGED IN");
        }
    }
}

function createTable(tableData) {
    var tableBody = document.createElement('tbody');
  
    tableData.forEach(function(rowData) {
      var row = document.createElement('tr');
      row.className = "tableBorder";
  
      rowData.forEach(function(cellData) {
        var cell = document.createElement('td');
        cell.className = "tableBorder";
        cell.appendChild(document.createTextNode(cellData));
        row.appendChild(cell);
      });
  
      tableBody.appendChild(row);
    });
  
    document.getElementById("rankingTable").appendChild(tableBody);
  }

function showRankings(data) {
    for(let i = 0; i < data.ranking.length; i++)
        createTable([[data.ranking[i]["nick"], data.ranking[i]["victories"], data.ranking[i]["games"]]]);
}

function waitForPlayers(data) {
    curGameId = data.game;
    update();
    hideSettings();
    document.getElementById("game").style.display="block";
    document.getElementById("game").style.backgroundColor=COLOR_BLACK;
    document.getElementById("cancelButton").style.display="block";
    document.getElementById("queueObjects").style.display="block";
}

function update() {
    eventSource = new EventSource(localTestUrl + "update?nick=" + uname + "&game=" + curGameId);
    eventSource.onmessage = function(event) {
        let data = JSON.parse(event.data);
        if(!inGame) {
            if(data.turn != null && data.winner == null)
                createGame();
            else if(data.winner == null && data.turn == null) {
                exitQueue();
                eventSource.close();
            }
            if(game != undefined && ((data.turn == uname) != game.yourTurn))
                game.changeTurn();
            hideQueue();
        }
        else {
            if(data.winner != undefined) {
                eventSource.close();
                if(data.winner == uname)
                    Game.endGame(false);
                else if(data.winner != null)
                    Game.endGame(true);
                else if(!game.yourTurn)
                    game.destroyBalls("id" + data.stack + data.pieces);
            }
            else if(data.turn == uname)
                game.destroyBalls("id" + data.stack + data.pieces);
        }
    }
    eventSource.onerror = function(event) {
        console.log(event);
    }
}

function notify(stack, pieces) {
    let s = stack.toString();
    let p = pieces.toString();
    myFetch('notify',{"nick": uname, "password": psw, "game": curGameId, "stack": s, "pieces": p})
    .then(response => console.log(response))
    .catch(console.log);
}

function leave() {
    myFetch('leave',{"nick": uname, "password": psw, "game": curGameId})
    .then(function(response) {console.log(response);})
    .catch(console.log);
}

function createGame() {
    inGame = true;
    const boardSize = document.getElementById("boardSize").value;
    const diffValue = document.getElementById("difficulty").value;
    document.getElementById("game").style.display="block";
    document.getElementById("surrender").style.display="block";
    game = new Game(boardSize, diffValue, playFirst);
    themeSong.play();
    
    for (let i = 0; i < boardSize; ++i) {
        const column = document.createElement("td");
        column.className = "nimColumn";
        document.getElementById("nim").appendChild(column);
        const brTemp = document.createElement("br");
        for (let j = i; j >= 0; --j) {
            const ballImg = document.createElement("img");
            ballImg.setAttribute("src", "res/img/Ball_creature.png");
            ballImg.setAttribute("id", "id" + i + j);
            ballImg.setAttribute("onmouseover", "ballOver(\"" + ballImg.getAttribute("id") + "\")");
            ballImg.setAttribute("onmouseout", "ballOut(\"" + ballImg.getAttribute("id") + "\")");
            ballImg.setAttribute("onclick", "ballClick(\"" + ballImg.getAttribute("id") + "\")");
            ballImg.setAttribute("class", "ball");

            column.appendChild(ballImg);
            column.appendChild(brTemp);
        }
        column.removeChild(brTemp);
    }
    if (!game.yourTurn) {
        setBoardColor(false);
        game.aiMove();
    }
    else
        setBoardColor(true);
}

function setBoardColor(green) {
    let boardDiv = document.getElementById("game");
    green ? boardDiv.style.backgroundColor = COLOR_GREEN_DARK : boardDiv.style.backgroundColor = COLOR_RED_DARK;
}

function showSettings() {
    document.getElementById("game").style.display="none";
    document.getElementById("startButton").style.display="inline";
    document.getElementById("settings").style.display="flex";
    if (!loggedIn)
        document.getElementById("loginButton").style.display="block";
}

function removeGameObjects() {
    for (let i = 0; i < game.size; ++i) {
        for (let j = i; j >= 0; --j) {
            let ball = document.getElementById("id" + i + j);
            if(ball != null)
                ball.parentNode.removeChild(ball);
        }
    }
    let columns = document.getElementsByClassName("nimColumn");
    for(let i = 0; i < game.size; i++)
        columns[0].parentNode.removeChild(columns[0]);
        document.getElementById("surrender").style.display="none";
}

function loginSubmitted() {
    if (document.forms["loginFormName"]["psw"].value == "") {
        alert("Please enter a password!");
        return;
    }
    uname = document.forms["loginFormName"]["uname"].value;
    psw = document.forms["loginFormName"]["psw"].value;
    document.getElementById("loginButton").style.display="none";
    document.getElementById("loginScript").style.display="none";
    document.getElementById("loginName").innerHTML=uname;
    document.getElementById("loginName").style.display="flex";
    document.getElementById("logoutButton").style.display="flex";
    playerStats.logIn(uname);
    loggedIn = true;

    myFetch('register',{"nick": uname, "password": psw})
    .then(response => console.log(response))
    .catch(console.log); 
}

function myFetch(command, message) {
    return fetch(localTestUrl + command, {
        method: 'POST',
        body: JSON.stringify(message),
    });
}

function getCSSVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
}  

function dec2bin(dec) {
    return (dec >>> 0).toString(2);
}

function dec2binFormated(number) {
    let bin = dec2bin(number);
    if(bin.length == MAX_BITS)
        return bin;
    let prefix = "";
    while(prefix.length + bin.length != MAX_BITS)
        prefix += "0";
    return prefix + bin;
}

function RNG(number) {
    return Math.floor(Math.random() * number);
}

class Stats {
    constructor(name) {
        this.name = name;
        this.losses = 0;
        this.wins = 0;
        this.winRate = 0;
        this.hardestDiff = 0;
        this.updateText();
    }

    logIn(name) {
        this.name = name;
        this.updateText();
        this.saveStats();
    }

    saveStats() {
        const data = {'name': this.name, 'losses': this.losses, 'wins': this.wins, 'winRate': this.winRate, 'hardestDiff': this.hardestDiff};
        localStorage.setItem('statsData',JSON.stringify(data));
    }

    loadStats() {
        const data = JSON.parse(localStorage.getItem('statsData'));
        if(data == undefined)
            return;
        this.name = data.name;
        this.losses = data.losses;
        this.wins = data.wins;
        this.winRate = data.winRate;
        this.hardestDiff = data.hardestDiff;
        this.updateText();
    }

    updateText() {
        document.getElementById("statsName").innerText = this.name;
        document.getElementById("statsWins").innerText = this.wins;
        document.getElementById("statsLosses").innerText = this.losses;
        document.getElementById("statsWinRate").innerText = this.winRate * 100 + "%";
        document.getElementById("statsHardestDiff").innerText = this.hardestDiff != 0 ? this.hardestDiff : "None";
    }

    updateWinRate() {
        this.winRate = this.wins / (this.wins + this.losses);
        document.getElementById("statsWinRate").innerText = this.winRate * 100 + "%";
        this.saveStats();
    }

    updateHardestDiff(difficulty) {
        this.hardestDiff = Math.max(this.hardestDiff, difficulty);
        document.getElementById("statsHardestDiff").innerText = this.hardestDiff;
    }
}

class Game {
    constructor(size, diffValue, playFirst) {
        this.difficulty = diffValue;
        this.stack = [];
        this.remaining = 0;
        this.size = size;
        this.yourTurn = playFirst;
        this.canPlay = playFirst;
        for (let i = 0; i < this.size; ++i) {
            this.stack[i] = i + 1;
            this.remaining += this.stack[i];
        }
    }

    shakeBalls(id, animation) {
        let column = id[2];
        let line = id[3];
        for(let i = line; i < this.stack[column]; ++i) {
            document.getElementById("id" + column + i).src="res/img/Ball_creature" + animation;
        }
    }

    destroyBalls(id) {
        if(!inGame)
            return;
        let ballDestroyAudio = new Audio("res/audio/Ball_Destroy_Delayed.mp3");
        let column = id[2];
        let line = id[3];
        let counter = 0;
        ballDestroyAudio.play();
        for(let i = line; i < this.stack[column]; ++i) {
            counter++;
            const ball = document.getElementById("id" + column + i);
            ball.removeAttribute("onmouseout");
            ball.src="res/img/Ball_creature_destroy.gif";
            setTimeout(function() {
                ball.src="res/img/Ball_creature_gone.png";
                ball.style.userSelect="none";
                ball.style.cursor="default";
            }, ANIMATION_DESTROY_TIME);
        }
        this.remaining -= counter;
        this.stack[column]-= counter;
        game.canPlay = false;
        if(!vsAi && this.yourTurn)
            notify(column, this.stack[column]);
        if(this.remaining <= 0)
            setTimeout(function() { Game.endGame(!game.yourTurn) } , ANIMATION_DESTROY_TIME);
        else 
            setTimeout(game.changeTurn, ANIMATION_DESTROY_TIME);
    }

    changeTurn() {
        game.yourTurn = !game.yourTurn;
        if(game.yourTurn) {
            setBoardColor(true);
            game.canPlay = true;
        }
        else {
            game.canPlay = false;
            setBoardColor(false);
            if(vsAi)
                game.aiMove();
        }
    }

    aiMove() {
        if(this.remaining <= 0)
            return;
        let rng = RNG(MAX_DIFFICULTY) + 1;
        if(rng < this.difficulty)
            this.bestMove();
        else
            this.randomMove();
    }

    randomMove() {
        let column = 0;
        while(game.stack[column] == 0)
            column = RNG(game.size);
        let line = [RNG(game.stack[column])];
        game.destroyBalls("id" + column + line);
    }

    bestMove() {
        let winningIndex = game.winningMove();
        if(winningIndex != -1) {
            game.destroyBalls("id" + winningIndex + 0);
            return;
        }

        let sumWord = game.getSumWord(game.stack);

        if(game.checkForPairBinary(sumWord)) {
            game.randomMove();
            return;
        }

        for(let i = 0; i < game.size; i++) {
            for(let j = 0; j < game.stack[i]; j++) {
                let answer = game.simulateMove(i,j);
                if(answer) {
                    game.destroyBalls("id" + i + j);
                    return;
                }
            }
        }

        game.randomMove();
    }

    getSumWord(argStack) {
        let sum = new Array();
        for(let i = 0; i < MAX_BITS; i++)
            sum[i] = 0;
        let stacksInBinary = new Array();
        for(let i = 0; i < argStack.length; i++)
            stacksInBinary[i] = dec2binFormated(argStack[i])
        for(let i = 0; i < argStack.length; i++) {
            for(let j = 0; j < MAX_BITS; j++) {
                let word = stacksInBinary[i];
                let char = word[j];
                sum[j] += parseInt(char);
            }
        }
        let sumWord = game.arrayToString(sum);
        return sumWord;
    }

    simulateMove(column, line) {
        let hypotheticalBoard = new Array();
        for(let i = 0; i < this.size; i++)
            hypotheticalBoard[i] = column != i ? this.stack[i] : line;
        return (this.checkForPairBinary(this.getSumWord(hypotheticalBoard))) ? true : false;
    }

    winningMove() {
        let counter = 0;
        let index = 0;
        for(let i = 0; i < this.size; i++) {
            if(this.stack[i] == 0)
                counter++;
            else
                index = i;
        }
        return (counter == this.size - 1) ? index : -1;
    }
    
    arrayToString(array) {
        let word = "";
        for(let i = 0; i < array.length; i++)
            word+= array[i];
        return word;
    }

    checkForPairBinary(binary) {
        for(let i = 0; i < binary.length; i++)
            if(binary[i] % 2 != 0)
                return false;
        return true;
    }

    static endGame(lost) {
        if(!inGame)
            return;
        themeSong.pause();
        themeSong.currentTime = 0;
        if (lost) {
            document.getElementById("endGameMessage").innerText = "You Lost!";
            document.getElementById("statsLosses").innerText = ++playerStats.losses;
            setBoardColor(false);
        }
        else {
            document.getElementById("endGameMessage").innerText = "You Won!";
            document.getElementById("statsWins").innerText = ++playerStats.wins;
            setBoardColor(true);
            if(vsAi)
                playerStats.updateHardestDiff(game.difficulty);
        }
        playerStats.updateWinRate();
        document.getElementById("endGameObjects").style.display="block";
        removeGameObjects();
        inGame = false;
    } 
}