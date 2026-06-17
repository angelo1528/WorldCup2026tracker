const { getStore } = require("@netlify/blobs");

const SCHEDULE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
    store = getStore({
  name: "wc-schedule",
  consistency: "strong",
  siteID: process.env.BLOBS_SITE_ID,
  token: process.env.BLOBS_TOKEN
});
    const cached = await store.get("draw-group", { type: "json" });
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < SCHEDULE_TTL_MS) {
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
      "https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=group",
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
        await store.setJSON("draw-group", { cachedAt: Date.now(), payload: data });
      } catch (e) { /* ignore */ }
    }

    return {
      statusCode: 200,
      headers: {
        "X-Cache": "MISS",
        "X-Debug-Store": store ? "ok" : "null",
        "X-Debug-Success": String(data && data.success)
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch upcoming matches" }) };
  }
};