// Get the match ID from the scoreButton that was clicked
function getLiveScore(matchId) {
  // API endpoint URL
  const url = 'https://free-football-live-score.p.rapidapi.com/live/all-details';
  // Options for the API request
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': 'e0509ed000msh6adfb6291f31c92p1f1d20jsn0cca2a92a57a',
      'X-RapidAPI-Host': 'free-football-live-score.p.rapidapi.com'
    },
    body: JSON.stringify({ match_id: matchId })
  };

  // Make the API request using fetch
  return fetch(url, options)
    .then(response => response.json())
    .then(data => {
      console.log(data);
      // Check if lineups are available
      const lineupsAvailable = data.content && data.content.lineup && data.content.lineup.lineup;
      return { lineupsAvailable, content: data.content };
    })
    .catch(error => {
      console.error('Error:', error);
      return { lineupsAvailable: false, content: null };
    });
}

// Function to create the live score page with the retrieved data
function createLiveScorePage(content, matchId, scoreText) {
  // Open a new window or tab
  const newWindow = window.open('', '_blank');

  // Check if the required data is available
  if (
    content &&
    content.h2h &&
    content.h2h.matches &&
    content.h2h.matches[0] &&
    content.lineup &&
    content.lineup.lineup &&
    content.matchFacts &&
    content.matchFacts.events &&
    content.matchFacts.events.events
  ) {
    // Extract relevant data from the content object
    const homeTeam = content.h2h.matches[0].home.name;
    const awayTeam = content.h2h.matches[0].away.name;
    const finalScore = scoreText || (content.h2h.matches[0].status.scoreStr === undefined ? '- : -' : content.h2h.matches[0].status.scoreStr);

    const homeLineup = content.lineup.lineup[0].players;
    const awayLineup = content.lineup.lineup[1].players;

    // Check if both teams' lineups are available
    if (!homeLineup || !awayLineup) {
      // If lineups are not available, display a message
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Live Score - ${homeTeam} vs ${awayTeam}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #000;
              color: #fff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: #000;
              padding: 20px;
              border: 2px solid #fff;
              border-radius: 5px;
              box-shadow: 0 2px 5px rgba(255, 255, 255, 0.2);
            }
            h1 {
              text-align: center;
              margin-bottom: 20px;
            }
            .score {
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 30px;
            }
            .team {
              flex: 1;
              text-align: center;
            }
            .team-name {
              font-size: 24px;
              font-weight: bold;
            }
            .team-score {
              font-size: 36px;
              font-weight: bold;
              margin: 0 20px;
            }
            .message {
              text-align: center;
              font-size: 18px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Live Score</h1>
            <div class="score">
              <div class="team">
                <div class="team-name">${homeTeam}</div>
              </div>
              <div class="team-score">${finalScore}</div>
              <div class="team">
                <div class="team-name">${awayTeam}</div>
              </div>
            </div>
            <div class="message">Lineups are not available for both teams.</div>
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
      return;
    }

    // Sort the home and away lineups from goalkeeper to attackers
    const sortedHomeLineup = sortLineup(homeLineup);
    const sortedAwayLineup = sortLineup(awayLineup);

    // Get the match events
    const events = content.matchFacts.events.events;

    // Determine the match status
    const matchStatus = getMatchStatus(content.h2h.matches[0].status.utcTime);

    // Set the border color based on the match status
    let borderColor;
    if (matchStatus === 'in-progress') {
      borderColor = '#FF9800'; // Orange for in-progress
    } else if (matchStatus === 'completed') {
      borderColor = '#4CAF50'; // Green for completed
    } else {
      borderColor = '#FFEB3B'; // Yellow for upcoming
    }

    // Write the live score page content to the new window
    newWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
      <title>Live Score - ${homeTeam} vs ${awayTeam}</title>
      <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 70px 20px 20px;
            background-color: #000;
            color: #fff;
          }
          
          .navbar {
            background-color: #4f0000 !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
          }
      
          .navbar .nav-item .nav-link.active {
              background-color: #610000;
          }
          
          .navbar a:link,.navbar a:visited {
              color: rgb(255, 120, 120);
              padding: 10px 20px;
              text-decoration: none;
              display: inline-block;
          }
          
          .navbar a:hover {
              color: rgb(255, 0, 0);
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #000;
            padding: 20px;
            border: 2px solid ${borderColor};
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(255, 255, 255, 0.2);
            opacity: 0;
            animation: fadeIn 1s ease-in-out forwards;
          }
          @keyframes fadeIn {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          h1 {
            text-align: center;
            margin-bottom: 20px;
          }
          .score {
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 30px;
          }
          .team {
            flex: 1;
            text-align: center;
          }
          .team-name {
            font-size: 24px;
            font-weight: bold;
          }
          .team-score {
            font-size: 36px;
            font-weight: bold;
            margin: 0 20px;
          }
          .lineups {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
          }
          .lineup {
            width: 45%;
          }
          .lineup h2 {
            font-size: 20px;
            margin-bottom: 10px;
          }
          .player {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #ccc;
          }
          .player:last-child {
            border-bottom: none;
          }
          .player-name {
            font-weight: bold;
          }
          .player-position {
            color: #ccc;
          }
          .events {
            margin-top: 40px;
          }
          .events h2 {
            font-size: 20px;
            margin-bottom: 10px;
          }
          .event {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .event-icon {
            margin-right: 10px;
          }
          .yellow-card {
            color: yellow;
          }
          .red-card {
            color: red;
          }
          .assist {
            margin-left: 20px;
            font-size: 14px;
            color: #ccc;
          }
          .assist-icon {
            margin-right: 5px;
          }
          .goal-icon {
            color: gold;
          }
          .yellow-card-player {
            background-color: yellow;
          }
          .red-card-player {
            background-color: red;
          }
        </style>
    </head>
      <body>
      <!-- Navigation Bar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <a class="navbar-brand" href="index.html"><b>Home</b></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link btn btn-dark me-2" href="lab3.html">Lab 3</a>
                </li>
                <li class="nav-item">
                    <a class = "nav-link btn btn-dark me-2" href = "lab4.html">Lab 4</a> 
                </li>
                <li class="nav-item">
                    <a class="nav-link btn btn-dark me-2" href="lab5.html">Lab 5</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link btn btn-dark me-2" href="lab6.html">Lab 6</a> 
                </li>
                <li class ="nav-item active">
                    <a class = "nav-link btn btn-dark me-2" href = "Final_Project_Home.html">Final Project</a>
                </li>
                <li class ="nav-item">
                    <a class = "nav-link btn btn-dark me-2" href = "https://github.com/MaximKleyer/MaximKleyer.github.io">Github</a> 
                </li>
            </ul>
        </div>
      </nav>
        <div class="container">
          <div class="score">
            <div class="team">
              <div class="team-name">${awayTeam}</div>
            </div>
            <div class="team-score">${finalScore}</div>
            <div class="team">
              <div class="team-name">${homeTeam}</div>
            </div>
          </div>
          <div class="lineups">
            <div class="lineup">
              <h2>${awayTeam} Lineup</h2>
              ${sortedHomeLineup.map(playerGroup => playerGroup.map(player => `
                <div class="player">
                  <div class="player-name">${player.name.fullName}</div>
                  <div class="player-position">${getShortPosition(player.role)}</div>
                </div>
              `).join('')).join('')}
            </div>
            <div class="lineup">
              <h2>${homeTeam} Lineup</h2>
              ${sortedAwayLineup.map(playerGroup => playerGroup.map(player => `
                <div class="player">
                  <div class="player-name">${player.name.fullName}</div>
                  <div class="player-position">${getShortPosition(player.role)}</div>
                </div>
              `).join('')).join('')}
            </div>
          </div>
          <div class="events">
            <h2>Match Events</h2>
            ${events.map(event => `
              <div class="event">
                ${event.type === 'Goal' ? `
                  <div>
                    <span class="goal-icon">&#9917;</span>
                    ${event.nameStr} scored a goal (${event.time}')
                    ${event.assistInput ? `
                      <div class="assist">
                        <span class="assist-icon">&#9994;</span>
                        ${event.assistInput} provided an assist
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                ${event.card ? `
                  <div>
                    ${getEventIcon(event)}
                    ${event.nameStr} received a ${event.card} card
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        <script>
          // Highlight players who received yellow or red cards
          ${events.map(event => `
            if (${event.card && (event.card === 'Yellow' || event.card === 'Red')}) {
              const playerName = "${event.nameStr}";
              const players = document.querySelectorAll(".player-name");
              players.forEach(player => {
                if (player.textContent === playerName) {
                  player.parentElement.classList.add("${event.card}-card-player");
                }
              });
            }
          `).join('')}
        </script>
      </body>
      </html>
    `);
  } else {
    // If the required data is not available, display a message
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Score - Match ${matchId}</title>
      </head>
      <body>
        <h1>Live Score - Match ${matchId}</h1>
        <p>Data not available.</p>
      </body>
      </html>
    `);
  }

  // Close the new window document
  newWindow.document.close();
}

// Function to sort the lineup from goalkeeper to attackers
function sortLineup(lineup) {
  const positions = ['Keeper', 'Defender', 'Midfielder', 'Attacker'];

  return lineup.sort((a, b) => {
    const positionA = positions.indexOf(a[0].role);
    const positionB = positions.indexOf(b[0].role);
    return positionA - positionB;
  });
}

// Function to get the short position name
function getShortPosition(position) {
  const shortPositions = {
    Keeper: 'GK',
    Defender: 'DF',
    Midfielder: 'MF',
    Attacker: 'FW'
  };

  return shortPositions[position] || position;
}

// Function to get the event icon based on the event type
function getEventIcon(event) {
  if (event.card === 'Yellow' || event.card === 'yellow') {
    return '<span class="yellow-card">&#9679;</span>';
  } else if (event.card === 'Red' || event.card === 'red') {
    return '<span class="red-card">&#9679;</span>';
  } else if (event.assistInput) {
    return '<span class="assist-icon">&#9994;</span>';
  } else if (event.eventType === 'Goal') {
    return '<span class="goal-icon">&#9917;</span>';
  } else {
    return '';
  }
}

// Function to get the event description based on the event type
function getEventDescription(event) {
  if (event.card) {
    return `${event.nameStr} received a ${event.card.toLowerCase()} card`;
  } else if (event.assistInput) {
    return `${event.assistInput} provided an assist`;
  } else if (event.eventType === 'Goal') {
    return `${event.nameStr} scored a goal`;
  } else {
    return '';
  }
}