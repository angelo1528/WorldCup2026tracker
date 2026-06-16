// ============================================================
//  statsLoader.js — fills live stats into the static squad list
//
//  squads.js gives us all 1,248 players with bios and a
//  `stats: null` placeholder. This file reads through every
//  finished match's lineups, turns each player's `incidents`
//  into goals / assists / cards (+ rating, MOTM), and writes
//  them onto the matching squad player.
//
//  Load order in players.html must be:
//    squads.js  ->  statsLoader.js  ->  players.js
//  (squads.js defines `players`; this fills it; players.js reads it)
//
//  Matching key: country + shirt number (exact, unambiguous).
//  Falls back to country + surname if no number match is found.
// ============================================================

(function () {
  // ---- country-name aliases ---------------------------------------
  // The API's `nationality` sometimes spells a country differently than
  // squads.js does. Normalize the API value to the squad spelling before
  // matching. Keys = API spelling, values = squads.js spelling.
  const COUNTRY_ALIASES = {
    "czech republic": "czechia",
    "ivory coast": "côte d'ivoire",
    "turkey": "türkiye"
    // add more here if a team's stats come up blank
  };

  function normalizeCountry(name) {
    const lower = (name || "").toLowerCase();
    return COUNTRY_ALIASES[lower] || lower;
  }

  // ---- fetch helper (scoped so it doesn't clash with app.js) ----
  async function getJSON(url) {
    const res = await fetch(url);
    return res.json();
  }

  // ---- turn one player's incidents into stat counts ----
  function countStats(incidents) {
    const s = { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    if (!Array.isArray(incidents)) return s;
    for (const inc of incidents) {
      if (inc.type === "goal") s.goals++;
      else if (inc.type === "assist") s.assists++;
      else if (inc.type === "yellow_card") s.yellowCards++;
      else if (inc.type === "red_card") s.redCards++;
    }
    return s;
  }

  // ---- pull a surname for fallback matching ----
  // API name "Jimenez R." -> "jimenez"; squad "Raul Jimenez" -> "jimenez"
  function surnameFromApi(name) {
    // API format is "Surname X." or "Surname Lastpart X." — take the
    // part before the trailing initial.
    const cleaned = name.replace(/\s+[A-Z]\.?$/, "").trim();
    const parts = cleaned.split(/\s+/);
    return (parts[parts.length - 1] || "").toLowerCase();
  }
  function surnameFromSquad(name) {
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || "").toLowerCase();
  }

  // ---- find the squad player for one API lineup player ----
  function findSquadPlayer(apiPlayer) {
    // `players` and `TEAMS` come from squads.js (global)
    const nat = normalizeCountry(apiPlayer.nationality);
    const num = Number(apiPlayer.number);

    // 1. primary: country + shirt number
    if (!Number.isNaN(num)) {
      const byNum = players.find(
        p => p.country.toLowerCase() === nat && Number(p.number) === num
      );
      if (byNum) return byNum;
    }

    // 2. fallback: country + surname
    const sn = surnameFromApi(apiPlayer.name);
    if (sn) {
      const bySurname = players.find(
        p => p.country.toLowerCase() === nat && surnameFromSquad(p.name) === sn
      );
      if (bySurname) return bySurname;
    }

    return null;
  }

  // ---- merge stats onto a squad player (accumulates across matches) ----
  function applyStats(squadPlayer, apiPlayer) {
    const counts = countStats(apiPlayer.incidents);

    if (!squadPlayer.stats) {
      squadPlayer.stats = {
        goals: 0, assists: 0, yellowCards: 0, redCards: 0,
        rating: 0, motm: false, appearances: 0
      };
    }
    const s = squadPlayer.stats;
    s.goals += counts.goals;
    s.assists += counts.assists;
    s.yellowCards += counts.yellowCards;
    s.redCards += counts.redCards;
    s.appearances++;
    if (typeof apiPlayer.rating === "number" && apiPlayer.rating > s.rating) {
      s.rating = apiPlayer.rating;
    }
    if (apiPlayer.motm) s.motm = true;
  }

  // ---- walk one lineup response and apply all its players ----
  function processLineup(result) {
    if (!result || !result.success || !result.data) return;
    const d = result.data;
    const groups = [
      d.startingXI?.home, d.startingXI?.away,
      d.substitutes?.home, d.substitutes?.away
    ];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const apiPlayer of group) {
        const squadPlayer = findSquadPlayer(apiPlayer);
        if (squadPlayer) applyStats(squadPlayer, apiPlayer);
      }
    }
  }

  // ---- main: load finished matches, fetch lineups, fill stats ----
  async function loadAllStats() {
    try {
      const upcoming = await getJSON("/.netlify/functions/getUpcoming");
      const finished = (upcoming.data || []).filter(
        m => m.statusText === "finished" && m.matchId
      );

      const lineups = await Promise.all(
        finished.map(m =>
          getJSON(`/.netlify/functions/getLineups?matchId=${m.matchId}`)
            .catch(() => null)
        )
      );

      lineups.forEach(processLineup);

      // let players.js know the data is ready, if it wants to refresh
      window.STATS_LOADED = true;
      document.dispatchEvent(new CustomEvent("statsLoaded"));
    } catch (err) {
      console.log("statsLoader: failed to load stats", err);
      window.STATS_LOADED = false;
      document.dispatchEvent(new CustomEvent("statsLoaded"));
    }
  }

  // expose a manual trigger too, and kick off on load
  window.loadAllStats = loadAllStats;
  loadAllStats();
})();