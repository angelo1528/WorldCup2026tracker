async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

async function loadMatches() {
  const matchesGrid = document.getElementById("matches-grid");
  matchesGrid.innerHTML = "<p>Loading matches...</p>";

  try {
    const data = await fetchData("/.netlify/functions/getLive");
    const matches = data.data || [];

    if (matches.length === 0) {
      matchesGrid.innerHTML = "<p>No live matches right now.</p>";
      return;
    }

    matchesGrid.innerHTML = "";
    matches.forEach(match => {
      const card = document.createElement("div");
      card.className = "match-card";
      card.innerHTML = `
        <div class="match-teams">
          <span class="team">${match.home.name}</span>
          <span class="score">${match.home.score} - ${match.away.score}</span>
          <span class="team">${match.away.name}</span>
        </div>
        <div class="match-time">${match.status.liveTime?.short || "Live"}</div>
      `;
      card.addEventListener("click", () => loadMatchDetail(match.id));
      matchesGrid.appendChild(card);
    });

  } catch (error) {
    matchesGrid.innerHTML = "<p>Error loading matches. Please try again.</p>";
    console.log(error);
  }
}

async function loadUpcoming() {
  const upcomingGrid = document.getElementById("upcoming-grid");
  upcomingGrid.innerHTML = "<p>Loading upcoming matches...</p>";

  try {
    const data = await fetchData("/.netlify/functions/getUpcoming");
    const matches = (data.data || []).filter(match =>
      match.scoreHome === null && match.scoreAway === null
    );

    

    if (matches.length === 0) {
      upcomingGrid.innerHTML = "<p>No upcoming matches available.</p>";
      return;
    }

    upcomingGrid.innerHTML = matches.map(match => {
      const kickoff = new Date(match.kickoff);
      const date = kickoff.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      const time = kickoff.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });

      return `
        <div class="match-card upcoming">
          <div class="match-teams">
            <span class="team">${match.home}</span>
            <span class="score">vs</span>
            <span class="team">${match.away}</span>
          </div>
          <div class="match-meta">
            <span class="match-round">${match.round}</span>
            <span class="match-time">${date} · ${time}</span>
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    upcomingGrid.innerHTML = "<p>Error loading upcoming matches.</p>";
    console.log(error);
  }
}

async function loadMatchDetail(matchId) {
  document.querySelector("main").style.display = "none";
const detail = document.getElementById("match-detail");
detail.style.display = "block";
detail.querySelector("#lineups").innerHTML = "<p>Loading lineup...</p>";
detail.querySelector("#stats").innerHTML = "";

try {
  const [lineupData, statsData] = await Promise.all([
    fetchData(`/.netlify/functions/getLineups?matchId=${matchId}`),
    fetchData(`/.netlify/functions/getStats?matchId=${matchId}`)
  ]);

  renderLineups(lineupData);
  renderStats(statsData);

} catch (error) {
    console.log(error);
  }
}

function renderLineups(data) {
  const lineups = document.getElementById("lineups");
  if (!data.home || !data.away) {
    lineups.innerHTML = "<p style='color:#888;'>Lineup data not available yet.</p>";
    return;
  }
  const home = data.home;
  const away = data.away;

  lineups.innerHTML = `
    <div class="lineup-section">
      <h2>${home.name} — Starting XI</h2>
      <ul>${home.starters.map(p => `<li>${p.shirtNumber}. ${p.name} <span>${p.position}</span></li>`).join("")}</ul>
      <h3>Substitutes</h3>
      <ul>${home.subs.map(p => `<li>${p.shirtNumber}. ${p.name} <span>${p.position}</span></li>`).join("")}</ul>
    </div>
    <div class="lineup-section">
      <h2>${away.name} — Starting XI</h2>
      <ul>${away.starters.map(p => `<li>${p.shirtNumber}. ${p.name} <span>${p.position}</span></li>`).join("")}</ul>
      <h3>Substitutes</h3>
      <ul>${away.subs.map(p => `<li>${p.shirtNumber}. ${p.name} <span>${p.position}</span></li>`).join("")}</ul>
    </div>
  `;
}

function renderStats(data) {
  const statsDiv = document.getElementById("stats");
  const players = data.players || [];

  statsDiv.innerHTML = `
    <h2>Player Stats</h2>
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Goals</th>
          <th>Assists</th>
          <th>Shots</th>
          <th>Passes</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        ${players.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.goals || 0}</td>
            <td>${p.assists || 0}</td>
            <td>${p.shots || 0}</td>
            <td>${p.passes || 0}</td>
            <td>${p.rating || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector("main").style.display = "block";
  document.getElementById("match-detail").style.display = "none";
});

setInterval(loadMatches, 300000);
loadMatches();
loadUpcoming();
