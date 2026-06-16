const { getStore } = require("@netlify/blobs");

const STANDINGS_TTL_MS = 30 * 60 * 1000; // 30 minutes

exports.handler = async function (event, context) {
  if (!process.env.API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  const origin = event.headers.origin || "";
  const allowed = !origin || origin.includes("netlify.app") || origin.includes("localhost");
  if (!allowed) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  let store;
  try {
    store = getStore({ name: "wc-standings", consistency: "strong" });
    const cached = await store.get("standings", { type: "json" });
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < STANDINGS_TTL_MS) {
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
      "https://world-cup-2026-live-api.p.rapidapi.com/wc/standings",
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
        await store.setJSON("standings", { cachedAt: Date.now(), payload: data });
      } catch (e) { /* ignore */ }
    }

    return {
      statusCode: 200,
      headers: { "X-Cache": "MISS" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch standings" }) };
  }
};
