const { getStore } = require("@netlify/blobs");

// Live scores change constantly, but a short 60s cache collapses all
// concurrent viewers during a match into ~1 API call per minute. This
// is the call that previously had NO cache and is the most-hit endpoint
// (app.js polls it every 5 min per open tab), so it's the biggest
// protection against hitting the provider's rate limit.
const LIVE_TTL_MS = 60 * 1000; // 60 seconds

exports.handler = async function (event, context) {
  if (!process.env.API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  const origin = event.headers.origin || "";
  const allowed = !origin || origin.includes("netlify.app") || origin.includes("localhost");
  if (!allowed) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ---- cache with short TTL ----
  let store;
  try {
    store = getStore({
      name: "wc-live",
      consistency: "strong",
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_KEY
    });
    const cached = await store.get("live", { type: "json" });
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < LIVE_TTL_MS) {
      return {
        statusCode: 200,
        headers: { "X-Cache": "HIT" },
        body: JSON.stringify(cached.payload)
      };
    }
  } catch (e) {
    store = null;
  }

  try {
    const response = await fetch(
      "https://world-cup-2026-live-api.p.rapidapi.com/wc/live",
      {
        headers: {
          "X-RapidAPI-Key": process.env.API_KEY,
          "X-RapidAPI-Host": "world-cup-2026-live-api.p.rapidapi.com"
        }
      }
    );
    const data = await response.json();

    if (store && data && data.success) {
      try {
        await store.setJSON("live", { cachedAt: Date.now(), payload: data });
      } catch (e) { /* ignore cache write errors */ }
    }

    return {
      statusCode: 200,
      headers: { "X-Cache": "MISS" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch live matches" }) };
  }
};