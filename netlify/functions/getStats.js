const { getStore } = require("@netlify/blobs");

exports.handler = async function (event, context) {
  if (!process.env.API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  const origin = event.headers.origin || "";
  const allowed = !origin || origin.includes("netlify.app") || origin.includes("localhost");
  if (!allowed) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  const matchId = event.queryStringParameters.matchId;
  if (!matchId || !/^[a-zA-Z0-9]+$/.test(matchId)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid matchId" }) };
  }

  // ---- cache: match stats are final once the match has ended ----
  let store;
  try {
    store = getStore({
      name: "wc-stats",
      consistency: "strong",
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_KEY
    });
    const cached = await store.get(matchId, { type: "json" });
    if (cached) {
      return {
        statusCode: 200,
        headers: { "X-Cache": "HIT" },
        body: JSON.stringify(cached)
      };
    }
  } catch (e) {
    store = null;
  }

  try {
    const response = await fetch(
      `https://world-cup-2026-live-api.p.rapidapi.com/wc/match/${matchId}/stats`,
      {
        headers: {
          "X-RapidAPI-Key": process.env.API_KEY,
          "X-RapidAPI-Host": "world-cup-2026-live-api.p.rapidapi.com"
        }
      }
    );
    const data = await response.json();

    // only cache successful, populated stats responses
    if (store && data && data.success && Array.isArray(data.data) && data.data.length > 0) {
      try { await store.setJSON(matchId, data); } catch (e) { /* ignore */ }
    }

    return {
      statusCode: 200,
      headers: { "X-Cache": "MISS" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch stats" }) };
  }
};