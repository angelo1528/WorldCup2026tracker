function displayPlayerResults(results) {
  const resultDiv = document.getElementById("player-result");

  if (results.length === 0) {
    resultDiv.innerHTML = "<p style='color:#888;'>No players found.</p>";
    return;
  }

  resultDiv.innerHTML = results.map(p => `
    <div class="player-profile">
      <div class="profile-header">
        
        <div>
          <h2>${p.flag} ${p.name}</h2>
          <p>${p.country} · ${p.position} · #${p.number}</p>
          <p style="color:#666; font-size:0.8rem;">${p.club} · ${p.height}cm · Born ${p.dob}</p>
        </div>
      </div>
      <div class="profile-stats">
        ${p.stats ? `
          <div class="stat-box"><span class="stat-value">${p.stats.goals || 0}</span><span class="stat-label">Goals</span></div>
          <div class="stat-box"><span class="stat-value">${p.stats.assists || 0}</span><span class="stat-label">Assists</span></div>
          <div class="stat-box"><span class="stat-value">${p.stats.yellowCards || 0}</span><span class="stat-label">Yellow Cards</span></div>
          <div class="stat-box"><span class="stat-value">${p.stats.redCards || 0}</span><span class="stat-label">Red Cards</span></div>
        ` : `<p style="color:#888; font-size:0.85rem;">This player hasn't featured in a match yet.</p>`}
      </div>
    </div>
  `).join("");
}

async function loadStandouts() {
  const standoutsDiv = document.getElementById("standouts");
  standoutsDiv.innerHTML = "<p style='color:#888;'>Standout players will appear once matches begin.</p>";
}

document.getElementById("search-btn").addEventListener("click", () => {
  const query = document.getElementById("player-search").value;
  const results = searchPlayers(query);
  displayPlayerResults(results);
});

document.getElementById("player-search").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const query = document.getElementById("player-search").value;
    const results = searchPlayers(query);
    displayPlayerResults(results);
  }
});

loadStandouts();