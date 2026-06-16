// players.js — search + standouts
// Relies on squads.js for `players` and `searchPlayers`.
// Relies on statsLoader.js to fill players[].stats from match data.

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
          <div class="stat-box"><span class="stat-value">${p.stats.rating ? p.stats.rating.toFixed(1) : "-"}</span><span class="stat-label">Best Rating</span></div>
        ` : `<p style="color:#888; font-size:0.85rem;">This player hasn't featured in a match yet.</p>`}
      </div>
    </div>
  `).join("");
}

// Standouts: top players by best rating (filled in by statsLoader.js)
function loadStandouts() {
  const standoutsDiv = document.getElementById("standouts");

  if (!window.STATS_LOADED) {
    standoutsDiv.innerHTML = "<h2>Standouts</h2><p>Loading standout players…</p>";
    return;
  }

  const ranked = players
    .filter(p => p.stats && p.stats.rating > 0)
    .sort((a, b) => b.stats.rating - a.stats.rating)
    .slice(0, 5);

  if (ranked.length === 0) {
    standoutsDiv.innerHTML = "<h2>Standouts</h2><p>Standout players will appear once matches begin.</p>";
    return;
  }

  standoutsDiv.innerHTML = `
    <h2>Standouts</h2>
    <div id="standouts-grid">
      ${ranked.map((p, i) => `
        <div class="standout-card">
          <div class="standout-rank">#${i + 1}</div>
          <div class="standout-avatar">${p.flag}</div>
          <h3>${p.name}</h3>
          <p>${p.country} · ${p.position}</p>
          <div class="standout-stats">
            <span>${p.stats.rating.toFixed(1)} &#9733;</span>
            <span>${p.stats.goals}G</span>
            <span>${p.stats.assists}A</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// Re-run the current search (used after stats finish loading)
function rerunSearch() {
  const input = document.getElementById("player-search");
  if (input && input.value.trim().length >= 2) {
    displayPlayerResults(searchPlayers(input.value));
  }
}

document.getElementById("search-btn").addEventListener("click", () => {
  displayPlayerResults(searchPlayers(document.getElementById("player-search").value));
});

document.getElementById("player-search").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    displayPlayerResults(searchPlayers(document.getElementById("player-search").value));
  }
});

// When statsLoader.js finishes, refresh standouts + any open search
document.addEventListener("statsLoaded", () => {
  loadStandouts();
  rerunSearch();
});

loadStandouts();