exports.handler = async function(event, context) {
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
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch stats" }) };
  }
};