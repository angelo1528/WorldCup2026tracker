async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

// Resolve a country by cross-checking lineup players against squads.js.
// API names look like "Jimenez R."; squads.js has "Raul Jimenez".
// We match a few players by surname and take the majority country, so
// one unmatchable name doesn't throw it off.
function countryFromLineup(starters) {
  if (!Array.isArray(starters) || typeof players === "undefined") return null;

  const votes = {};
  for (const ap of starters.slice(0, 5)) {           // sample up to 5
    const apiSurname = (ap.name || "")
      .replace(/\s+[A-Z]\.?$/, "")
      .trim()
      .split(/\s+/)
      .pop()
      ?.toLowerCase();
    if (!apiSurname) continue;

    const match = players.find(
      p => p.name.trim().split(/\s+/).pop().toLowerCase() === apiSurname
    );
    if (match) votes[match.country] = (votes[match.country] || 0) + 1;
  }

  // return the most-voted country, if any
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  return ranked.length ? ranked[0][0] : null;
}

// Given a live match, resolve {home, away}. Tries MATCH_LOOKUP first,
// then falls back to cross-checking the lineup against squads.js.
async function resolveLiveTeams(live) {
  const meta = MATCH_LOOKUP[live.matchId];
  if (meta && meta.home && meta.away) {
    return { home: meta.home, away: meta.away };
  }

  // fallback: read the lineup and identify each side from its players
  try {
    const lineup = await fetchData(`/.netlify/functions/getLineups?matchId=${live.matchId}`);
    const d = lineup && lineup.data;
    if (d && d.startingXI) {
      const home = countryFromLineup(d.startingXI.home) || "TBD";
      const away = countryFromLineup(d.startingXI.away) || "TBD";
      return { home, away };
    }
  } catch (e) {
    console.log("live name fallback failed", e);
  }
  return { home: "TBD", away: "TBD" };
}

// ============================================================
//  LIVE MATCHES  (Right Now)
//  The live feed only returns { matchId, status, minute, scores },
//  with NO team names. We resolve names from matchId (MATCH_LOOKUP),
//  and if that fails, cross-check lineup players against squads.js.
// ============================================================
let MATCH_LOOKUP = {};   // matchId -> full match object from getUpcoming

async function loadMatches() {
  const matchesGrid = document.getElementById("matches-grid");
  matchesGrid.innerHTML = "<p>Loading matches...</p>";

  try {
    const data = await fetchData("/.netlify/functions/getLive");
    const liveMatches = data.data || [];

    // The live feed is unreliable — it sometimes returns a match that's
    // already finished. Trust the match list: drop any "live" match whose
    // matchId is marked finished, and require a real in-play signal.
    const playing = liveMatches.filter(m => {
      if (!m || !m.matchId) return false;
      const meta = MATCH_LOOKUP[m.matchId];
      if (meta && meta.statusText === "finished") return false; // stale
      const inPlay =
        m.minute != null ||
        m.scoreHome != null ||
        m.scoreAway != null ||
        m.status === 2;
      return inPlay;
    });

    if (playing.length === 0) {
      matchesGrid.innerHTML = "<p>No live matches right now.</p>";
      return;
    }

    // resolve names (may need async lineup lookups) then render
    matchesGrid.innerHTML = "";
    for (const live of playing) {
      const { home, away } = await resolveLiveTeams(live);
      const hScore = live.scoreHome ?? 0;
      const aScore = live.scoreAway ?? 0;
      const clock = live.minute ? `${live.minute}'` : "LIVE";

      const card = document.createElement("div");
      card.className = "match-card";
      card.innerHTML = `
        <div class="match-teams">
          <span class="team">${home}</span>
          <span class="score">${hScore} - ${aScore}</span>
          <span class="team">${away}</span>
        </div>
        <div class="match-time">${clock}</div>
      `;
      card.addEventListener("click", () => loadMatchDetail(live.matchId, { home, away, scoreHome: hScore, scoreAway: aScore }));
      matchesGrid.appendChild(card);
    }
  } catch (error) {
    matchesGrid.innerHTML = "<p>Error loading matches. Please try again.</p>";
    console.log(error);
  }
}

// ============================================================
//  Shared: format a kickoff date
// ============================================================
function formatKickoff(iso) {
  const k = new Date(iso);
  const date = k.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = k.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

// ============================================================
//  UPCOMING  (Coming Up) — collapsible to one row
// ============================================================
let UPCOMING_ALL = [];     // every scheduled match
let UPCOMING_EXPANDED = false;

function collapsedCount() {
  // how many 300px cards fit one row in the grid's current width
  const grid = document.getElementById("upcoming-grid");
  const width = grid ? grid.clientWidth : window.innerWidth;
  const perRow = Math.max(1, Math.floor(width / 300));
  return perRow;
}

function renderUpcoming() {
  const grid = document.getElementById("upcoming-grid");
  const btn = document.getElementById("upcoming-toggle");

  if (UPCOMING_ALL.length === 0) {
    grid.innerHTML = "<p>No upcoming matches available.</p>";
    if (btn) btn.style.display = "none";
    return;
  }

  const limit = UPCOMING_EXPANDED ? UPCOMING_ALL.length : collapsedCount();
  const shown = UPCOMING_ALL.slice(0, limit);

  grid.innerHTML = shown.map(match => {
    const { date, time } = formatKickoff(match.kickoff);
    return `
      <div class="match-card upcoming">
        <div class="match-teams">
          <span class="team">${match.home}</span>
          <span class="score">vs</span>
          <span class="team">${match.away}</span>
        </div>
        <div class="match-meta">
          <span class="match-round">${match.round ? "Round " + match.round : ""}</span>
          <span class="match-time">${date} · ${time}</span>
        </div>
      </div>
    `;
  }).join("");

  if (btn) {
    if (UPCOMING_ALL.length > collapsedCount()) {
      btn.style.display = "inline-block";
      btn.textContent = UPCOMING_EXPANDED
        ? "Show less"
        : `Show all ${UPCOMING_ALL.length} fixtures`;
    } else {
      btn.style.display = "none";
    }
  }
}

async function loadUpcoming() {
  const grid = document.getElementById("upcoming-grid");
  grid.innerHTML = "<p>Loading upcoming matches...</p>";

  try {
    const data = await fetchData("/.netlify/functions/getUpcoming");
    const all = data.data || [];

    // build the matchId -> match lookup for the live section to use
    all.forEach(m => { if (m.matchId) MATCH_LOOKUP[m.matchId] = m; });

    UPCOMING_ALL = all.filter(
      m => m.scoreHome === null && m.scoreAway === null
    );
    renderUpcoming();
  } catch (error) {
    grid.innerHTML = "<p>Error loading upcoming matches.</p>";
    console.log(error);
  }
}

// ============================================================
//  RESULTS  (Past matches) — clickable
// ============================================================
async function loadResults() {
  const grid = document.getElementById("results-grid");
  if (!grid) return;
  grid.innerHTML = "<p>Loading results...</p>";

  try {
    const data = await fetchData("/.netlify/functions/getUpcoming");
    const finished = (data.data || []).filter(
      m => m.statusText === "finished" && m.matchId
    );

    if (finished.length === 0) {
      grid.innerHTML = "<p>No completed matches yet.</p>";
      return;
    }

    // most recent first
    finished.sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

    grid.innerHTML = "";
    finished.forEach(match => {
      const { date } = formatKickoff(match.kickoff);
      const card = document.createElement("div");
      card.className = "match-card result";
      card.innerHTML = `
        <div class="match-teams">
          <span class="team">${match.home}</span>
          <span class="score">${match.scoreHome} - ${match.scoreAway}</span>
          <span class="team">${match.away}</span>
        </div>
        <div class="match-meta">
          <span class="match-round">${match.group ? "Group " + match.group : ""}</span>
          <span class="match-time">${date}</span>
        </div>
      `;
      card.addEventListener("click", () => loadMatchDetail(match.matchId, match));
      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = "<p>Error loading results.</p>";
    console.log(error);
  }
}

// ============================================================
//  MATCH DETAIL  — real lineup + team-stats shapes
// ============================================================
async function loadMatchDetail(matchId, matchMeta) {
  document.querySelector("main").style.display = "none";
  const detail = document.getElementById("match-detail");
  detail.style.display = "block";

  const scoreDiv = document.getElementById("match-score");
  if (scoreDiv && matchMeta) {
    scoreDiv.innerHTML = `
      <div class="detail-score">
        <span class="team">${matchMeta.home}</span>
        <span class="score">${matchMeta.scoreHome ?? ""} - ${matchMeta.scoreAway ?? ""}</span>
        <span class="team">${matchMeta.away}</span>
      </div>
    `;
  }

  document.getElementById("lineups").innerHTML = "<p style='color:#888;'>Loading lineup...</p>";
  document.getElementById("stats").innerHTML = "";

  try {
    const [lineupData, statsData] = await Promise.all([
      fetchData(`/.netlify/functions/getLineups?matchId=${matchId}`),
      fetchData(`/.netlify/functions/getStats?matchId=${matchId}`)
    ]);

    renderLineups(lineupData, matchMeta);
    renderStats(statsData, matchMeta);
  } catch (error) {
    document.getElementById("lineups").innerHTML = "<p style='color:#888;'>Couldn't load match detail.</p>";
    console.log(error);
  }
}

function playerRow(p) {
  const cap = p.role === "(C)" ? " (C)" : p.role === "(G)" ? " (GK)" : "";
  const rating = typeof p.rating === "number"
    ? `<span class="p-rating">${p.rating.toFixed(1)}</span>`
    : "";
  const motm = p.motm ? ` <span class="p-motm">★</span>` : "";
  return `<li><span class="p-name">${p.number}. ${p.name}${cap}${motm}</span>${rating}</li>`;
}

function renderLineups(resp, matchMeta) {
  const lineups = document.getElementById("lineups");
  const d = resp && resp.data;

  if (!d || !d.startingXI) {
    lineups.innerHTML = "<p style='color:#888;'>Lineup data not available for this match.</p>";
    return;
  }

  const homeName = matchMeta ? matchMeta.home : "Home";
  const awayName = matchMeta ? matchMeta.away : "Away";

  const section = (teamName, starters, subs) => `
    <div class="lineup-section">
      <h2>${teamName} — Starting XI</h2>
      <ul>${(starters || []).map(playerRow).join("")}</ul>
      <h3>Substitutes</h3>
      <ul>${(subs || []).map(playerRow).join("")}</ul>
    </div>
  `;

  lineups.innerHTML =
    section(homeName, d.startingXI.home, d.substitutes && d.substitutes.home) +
    section(awayName, d.startingXI.away, d.substitutes && d.substitutes.away);
}

function renderStats(resp, matchMeta) {
  const statsDiv = document.getElementById("stats");
  const sections = resp && resp.data;

  if (!Array.isArray(sections) || sections.length === 0) {
    statsDiv.innerHTML = "<p style='color:#888;'>Match stats not available.</p>";
    return;
  }

  // Use the full-match section ("Match"), fall back to the first section
  const matchSection = sections.find(s => s.section === "Match") || sections[0];
  const homeName = matchMeta ? matchMeta.home : "Home";
  const awayName = matchMeta ? matchMeta.away : "Away";

  const rows = (matchSection.groups || [])
    .flatMap(g => g.stats || [])
    .map(s => `
      <tr>
        <td class="stat-home">${s.home}</td>
        <td class="stat-name">${s.name}</td>
        <td class="stat-away">${s.away}</td>
      </tr>
    `).join("");

  statsDiv.innerHTML = `
    <h2>Match Stats</h2>
    <table class="match-stats-table">
      <thead>
        <tr><th>${homeName}</th><th></th><th>${awayName}</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ============================================================
//  Wiring
// ============================================================
document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector("main").style.display = "block";
  document.getElementById("match-detail").style.display = "none";
});

const upcomingToggle = document.getElementById("upcoming-toggle");
if (upcomingToggle) {
  upcomingToggle.addEventListener("click", () => {
    UPCOMING_EXPANDED = !UPCOMING_EXPANDED;
    renderUpcoming();
  });
}

// re-evaluate the one-row count on resize (only matters when collapsed)
let resizeTimer;
window.addEventListener("resize", () => {
  if (UPCOMING_EXPANDED) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderUpcoming, 150);
});

// Load order matters: build the match lookup (from upcoming) BEFORE
// live matches so the live section can resolve team names by matchId.
async function initDashboard() {
  await loadUpcoming();   // populates MATCH_LOOKUP + Coming Up
  loadResults();          // Results section
  loadMatches();          // Live — now able to resolve names
}

setInterval(loadMatches, 300000);
initDashboard();