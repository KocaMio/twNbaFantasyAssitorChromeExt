chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let fetchRequestOptions = {
        method: 'GET',
        mode: 'cors',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
        }
    };

    if (request.title === "getAllGamePlayer") {
        GetPalyersDataAndSend(data => {
            sendResponse(data);
        });
    }

    return true;
});

setInterval(() => {
    currentGameCount = 0;
    playerList = [];

    let tabsQuery = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(tabsQuery, tabs => {
        if (tabs.length === 0 ) {
            return;
        }

        let tabId = tabs[0].id;
        let callback = response => {
            
        }

        GetPalyersDataAndSend(data => {
            chrome.tabs.sendMessage(tabId, data, callback)
        });
    });
    
}, 15000);

let GetPalyersDataAndSend = (callback) => {
    let playerList = [];
    let maxGameCount = 0;
    let currentGameCount = 0;

    let fetchRequestOptions = {
        method: 'GET',
        mode: 'cors',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
        }
    };

    fetch("https://tw.global.nba.com/stats2/scores/gamedaystatus.json?locale=zh_TW&tz=%2B8", fetchRequestOptions)
        .then(response => response.text())
        .then(result => {
            let ids = GetGameIds(result)
            maxGameCount = ids.length;

            ids.forEach(id => {
                let url = `https://tw.global.nba.com/stats2/game/snapshot.json?countryCode=TW&gameId=${id}&locale=zh_TW&tz=%2B8`;

                fetch(url, fetchRequestOptions)
                    .then(response => response.text())
                    .then(result => {
                        let data = JSON.parse(result);
                        playerList = playerList.concat(data.payload.homeTeam.gamePlayers);
                        playerList = playerList.concat(data.payload.awayTeam.gamePlayers);
                        
                        currentGameCount++;
                        
                        if (currentGameCount === maxGameCount) {
                            callback && callback(playerList);
                        }
                    })
                    .catch(error => console.log('err', error));
            });
        })
        .catch(error => console.log('error', error));
}

let GetGameIds = (data) => {
    data = JSON.parse(data);
    
    let ids = [];
    data.payload.gameDates[0].games.forEach(element => {
        ids.push(element.gameId);
    });


    return ids;
}