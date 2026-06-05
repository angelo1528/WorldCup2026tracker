async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

async function loadStandings() {
  const grid = document.getElementById("standings-grid");
  grid.innerHTML = "<p>Loading standings...</p>";

  try {
    const standingsData = await fetchData("/.netlify/functions/getStandings");
    const groups = standingsData.data || [];

    if (groups.length === 0) {
      grid.innerHTML = "<p>Standings will appear once the tournament begins on June 11.</p>";
      return;
    }

    grid.innerHTML = groups.map(group => `
      <div class="group-card">
        <h2>${group.group}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF:GA</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${group.teams.map(team => `
              <tr class="${team.position <= 2 ? 'qualified' : ''}">
                <td>${team.position}</td>
                <td>${team.name}</td>
                <td>${team.played}</td>
                <td>${team.won}</td>
                <td>${team.drawn}</td>
                <td>${team.lost}</td>
                <td>${team.goals}</td>
                <td><strong>${team.points}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("");

  } catch (error) {
    grid.innerHTML = "<p>Error loading standings.</p>";
    console.log(error);
  }
}

setInterval(loadStandings, 300000);
loadStandings();