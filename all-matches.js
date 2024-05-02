// Function to fetch the matches data from the API
async function fetchMatches(date = new Date()) {
	// Format the date to match the API requirements
	const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '');
	// API endpoint URL
	const url = 'https://free-football-live-score.p.rapidapi.com/all-matches';
	// Options for the API request
	const options = {
	  method: 'POST',
	  headers: {
		'content-type': 'application/json',
		'X-RapidAPI-Key': 'e0509ed000msh6adfb6291f31c92p1f1d20jsn0cca2a92a57a',
		'X-RapidAPI-Host': 'free-football-live-score.p.rapidapi.com'
	  },
	  body: JSON.stringify({
		date: parseInt(formattedDate),
		country_code: 'USA',
		timezone: 'EST'
	  })
	};
  
	try {
	  // Make the API request using fetch
	  const response = await fetch(url, options);
	  const result = await response.json();
	  // Display the matches using the retrieved data
	  displayMatches(result.leagues, date);
	} catch (error) {
	  console.error('Error fetching matches:', error);
	}
  }
  
  // Function to get the match status based on the current time in EST
  function getMatchStatus(matchTime) {
	const currentTime = new Date();
	const matchStartTime = new Date(matchTime);
	// Calculate the match end time (2 hours and 30 minutes after the start time)
	const matchEndTime = new Date(matchStartTime.getTime() + 150 * 60000);
  
	if (currentTime < matchStartTime) {
	  return 'upcoming';
	} else if (currentTime >= matchStartTime && currentTime <= matchEndTime) {
	  return 'in-progress';
	} else {
	  return 'completed';
	}
  }
  
  // Function to display the matches in the HTML
  function displayMatches(leagues, selectedDate) {
	const matchesContainer = document.getElementById('matches-container');
	// Clear the existing content in the matches container
	matchesContainer.innerHTML = '';
  
	// Iterate over each league
	leagues.forEach(league => {
	  const leagueElement = document.createElement('div');
	  leagueElement.classList.add('league');
  
	  const leagueContainer = document.createElement('div');
	  leagueContainer.classList.add('league-container');
	  const leagueName = document.createElement('div');
	  leagueName.classList.add('league-name');
	  leagueName.textContent = league.name;
	  leagueContainer.appendChild(leagueName);
  
	  const matchesElement = document.createElement('div');
	  matchesElement.classList.add('matches');
  
	  // Iterate over each match in the league
	  league.matches.forEach(match => {
		console.log('Match object:', match);
		const matchElement = document.createElement('div');
		matchElement.classList.add('match');
  
		// Determine the match status
		const status = getMatchStatus(match.status.utcTime);
		if (status === 'in-progress') {
		  matchElement.classList.add('in-progress');
		}
  
		const homeTeam = document.createElement('div');
		homeTeam.classList.add('team');
		homeTeam.textContent = match.home.name;
  
		const scoreButton = document.createElement('button');
		scoreButton.classList.add('score-button');
		const scoreText = `${match.home.score} - ${match.away.score}`;
		scoreButton.textContent = scoreText;
  
		// Add click event listener to the score button
		scoreButton.addEventListener('click', () => {
		  getLiveScore(match.id)
			.then(result => {
			  if (result.lineupsAvailable) {
				createLiveScorePage(result.content, match.id, scoreText);
			  } else {
				alert('Lineups not available');
			  }
			})
			.catch(error => {
			  console.error('Error:', error);
			  alert('Error retrieving lineups');
			});
		});
  
		const awayTeam = document.createElement('div');
		awayTeam.classList.add('team');
		awayTeam.textContent = match.away.name;
  
		const dateTime = new Date(match.status.utcTime);
		const dateDiv = document.createElement('div');
		dateDiv.classList.add('date-box');
		dateDiv.textContent = dateTime.toLocaleDateString();
  
		const timeDiv = document.createElement('div');
		timeDiv.classList.add('time-box');
		timeDiv.textContent = dateTime.toLocaleTimeString();
  
		const statusElement = document.createElement('div');
		statusElement.classList.add('match-status', status);
		statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  
		// Determine the winner and loser based on the scores
		if (status === 'upcoming') {
		  homeTeam.classList.add('grey-team');
		  awayTeam.classList.add('grey-team');
		} else if (match.home.score > match.away.score) {
		  homeTeam.classList.add('winner');
		  awayTeam.classList.add('loser');
		} else if (match.home.score < match.away.score) {
		  awayTeam.classList.add('winner');
		  homeTeam.classList.add('loser');
		} else {
		  homeTeam.classList.add('draw');
		  awayTeam.classList.add('draw');
		}
  
		// Append the match elements to the match container
		matchElement.appendChild(homeTeam);
		matchElement.appendChild(scoreButton);
		matchElement.appendChild(awayTeam);
		matchElement.appendChild(dateDiv);
		matchElement.appendChild(timeDiv);
		matchElement.appendChild(statusElement);
  
		matchesElement.appendChild(matchElement);
	  });
  
	  leagueElement.appendChild(leagueContainer);
	  leagueElement.appendChild(matchesElement);
	  matchesContainer.appendChild(leagueElement);
	});
  }
  
// Event listener for the date picker
document.getElementById('datePicker').addEventListener('change', function() {
const selectedDate = new Date(this.value);
fetchMatches(selectedDate);
});

// Call the fetchMatches function when the page loads with the current date
window.onload = () => fetchMatches(new Date());  