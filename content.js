// Remove Ads
let ads = document.getElementsByClassName('banner-ads');
for (let index = 0; index < ads.length; index++) {
    const element = ads[index];
    element.parentNode.removeChild(element);
}

// Click Show Data
let list = document.querySelectorAll(".c-day-background");
list[(list.length - 1)].parentNode.parentNode.parentNode.addEventListener("click", e => {
    chrome.runtime.sendMessage({title: "getAllGamePlayer"}, data => {
        setTimeout(() => {showData(data)}, 2000);
    });  
});

// Auto Show Data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!(sender.id && sender.id === chrome.runtime.id)) {
        return;
    }

    showData(request);
});

let showData = (playerRawData) => {
    console.log('playerRawData:', playerRawData);
    if (typeof playerRawData === 'undefined' || playerRawData.length === 0 ) {
        return false;
    }
    
    let selectList = preparePlayerSelection()
    let playerData = preparePlayerData(selectList, playerRawData);
    console.log('selectList:', selectList);
    console.log('playerData:', playerData);
    
    let appendDomRoot = document.getElementsByClassName("user-section user-history open")[0];
    appendDomRoot.appendChild(getRealTimeTitle());
    appendDomRoot.appendChild(getRealTimeTable(playerData));
    appendDomRoot.appendChild(getRealTimeUserStats(playerData));
}

let preparePlayerSelection = () => {
    let playerSelection = document.getElementsByClassName("user-section user-history open");

    if (playerSelection.length === 0) {
        return [];
    }
    
    playerSelection = playerSelection[0];

    let selectList = [];
    playerSelection.querySelectorAll(".player-heading").forEach((item, index) => {
        let firstName = item.querySelector(".player-name-first").innerText;
        let lastName = item.querySelector(".player-name-last").innerText;
        let teamLogoCssUrl = getComputedStyle(item.querySelector(".team-logo")).backgroundImage;
        
        let selectPlayer = {
            firstName: firstName,
            lastName: lastName,
            teamLogoCssUrl: teamLogoCssUrl
        }

        selectList.push(selectPlayer);
    });

    return selectList
}

let preparePlayerData = (selectList, playerRawData) => {
    let data = [];
    let matchPlayerCount = 0;

    for (let index = 0; index < playerRawData.length; index++) {
        let player = playerRawData[index];

        selectList.forEach((item, index) => {
            if (!(player.profile.firstName.toLowerCase().replace('-', ' ') === item.firstName.toLowerCase().replace('-', ' ')
                && player.profile.lastName.toLowerCase().replace('-', ' ') === item.lastName.toLowerCase().replace('-', ' '))) {
                    return;
            }

            data[index] = {
                teamLogoCssUrl: item.teamLogoCssUrl,
                name: player.profile.firstName + ' ' + player.profile.lastName,
                mins: player.statTotal.mins,
                points: player.statTotal.points,
                rebs: player.statTotal.rebs,
                assists: player.statTotal.assists,
                steals: player.statTotal.steals,
                blocks: player.statTotal.blocks,
                turnovers: player.statTotal.turnovers
            };

            matchPlayerCount++
        });

        if (matchPlayerCount === 5) {
            break;
        }
    }

    return data;
}

let getRealTimeTitle = () => {
    // Remove Old Title
    let oldDom = document.getElementById('real-time-table-title');
    if (oldDom) {
        oldDom.parentNode.removeChild(oldDom);
    }

    let newDiv = document.createElement('div');
    newDiv.id = 'real-time-table-title';

    let newSpan = document.createElement('span')
    let today = new Date();
    newSpan.innerText = `今日(${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()})即時數據`;

    newDiv.appendChild(newSpan);

    return newDiv;
}

let getRealTimeUserStats = (players) => {
    // Remove Old User Stats
    let oldDom = document.getElementById('real-time-user-stats');
    if (oldDom) {
        oldDom.parentNode.removeChild(oldDom);
    }

    let newDiv = document.createElement('div');
    newDiv.id = 'real-time-user-stats';
    
    let newSpan = document.createElement('span');
    newSpan.innerText = 'Total Weighted: ' + getTotalWeighted(players);

    newDiv.appendChild(newSpan);

    return newDiv;
}

let getRealTimeTable = (players) => {
    // Remove Old Table
    let oldTable = document.getElementById('real-time-table');
    if (oldTable) {
        oldTable.parentNode.removeChild(oldTable);
    }

    let newTable = document.createElement('table');
    let newThead = document.createElement('thead');
    let newTbody = document.createElement('tbody');

    let theadInnerTextList = [
        'TEAM', 'NAME', 'MINS', 'PTS', 'RBS', 'AST', 'STLS', 'BLKS', 'TOS', 'WEIGHTED'
    ];

    //Thead
    let newTr = document.createElement('tr');
    theadInnerTextList.forEach(text => {
        let newTh = document.createElement('th');
        newTh.innerText = text;
        newTr.appendChild(newTh);
    });
    newThead.appendChild(newTr);


    //Tbody
    let gamePoints = 0;
    players.forEach(player => {
        let newTr = document.createElement('tr');
        Object.keys(player).forEach(key => {
            let value = player[key];
            let newTh = document.createElement('th');
            newTh.className = 'real-time-' + key
            newTh.innerText = value;

            if (key === 'teamLogoCssUrl') {
                newTh.innerText = ''
                let newSpan = document.createElement('span');
                newSpan.style.backgroundImage = value;
                newSpan.className = 'team-logo'
                newTh.appendChild(newSpan);
            }

            if (key === 'name') {
                newTh.className = 'real-time-name';
            }
            
            newTr.appendChild(newTh);
        });

        let newTh = document.createElement('th');
        newTh.innerText = getWeighted(player);
        newTh.className = 'real-time-weighted';
        newTr.appendChild(newTh);
        
        newTbody.appendChild(newTr);
    });

    newTable.setAttribute('id', 'real-time-table');
    newTable.appendChild(newThead);
    newTable.appendChild(newTbody);

    return newTable;
}

let getWeighted = (player) => {
    let playerGamePoints = 0;
    
    Object.keys(player).forEach(key => {
        // Blow logic execute only allow key in (point, rebs, assists, steals, blocks, turnovers) 
        if (key !== 'points' 
            && key !== 'rebs'
            && key !== 'assists'
            && key !== 'steals'
            && key !== 'blocks'
            && key !== 'turnovers') {

            return
        }

        let value = player[key];
        let gamePointRate = 0;

        // 得分*1、籃板*1.2、助攻*1.5、抄截*3、阻攻*3、失誤*-1
        switch (key) {
        case 'points':
            gamePointRate = 1;
            break;
        case 'rebs':
            gamePointRate = 1.2;
            break;
        case 'assists':
            gamePointRate = 1.5;
            break;
        case 'steals':
            gamePointRate = 3;
            break;
        case 'blocks':
            gamePointRate = 3;
            break;
        case 'turnovers':
            gamePointRate = -1;
        }
    
        playerGamePoints += value * gamePointRate;
    });

    return Math.round(playerGamePoints);
}

let getTotalWeighted = (players) => {
    let totalWeighted = 0;

    players.forEach(player => {
        totalWeighted += getWeighted(player);
    });

    return totalWeighted;
}