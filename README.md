# WC 2026 Tracker

A real-time FIFA World Cup 2026 tracking web app built with vanilla HTML, CSS, and JavaScript.

🔗 **[Live Site](https://wct26.netlify.app/)**

---
##demo
<img width="947" height="434" alt="image" src="https://github.com/user-attachments/assets/082855e8-db1f-4877-b6ba-bd54833babc7" />
<img width="941" height="438" alt="image" src="https://github.com/user-attachments/assets/d7d62e98-c7f9-434f-b5b3-4ec249a319ee" />

## Features

- **Live Dashboard** — Real-time match scores updated every 5 minutes
- **Coming Up** — Full group stage schedule with kickoff times
- **Group Standings** — All 12 groups updating automatically as matches are played
- **Player Search** — Search any of the 1,248 players across all 48 national squads
- **Match Detail** — Starting XI, substitutes and player stats per match
- **Mobile Responsive** — Fully optimised for phone and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Netlify Serverless Functions |
| Data | World Cup 2026 Live API via RapidAPI |
| Player Database | Official FIFA Squad Lists (1,248 players) |
| Deployment | Netlify |
| Version Control | GitHub |

---

## Pages

- **Dashboard** — Live matches and upcoming fixtures
- **Standings** — Group stage table for all 12 groups
- **Players** — Search any World Cup player by name, country or club

---

## Local Development

Clone the repo and open `index.html` in your browser for basic functionality.

For full functionality including live data, install the Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

Then set your API key in a `.env` file:

## Data Sources

- Live match data — [World Cup 2026 Live API](https://rapidapi.com)
- Player squads — Official FIFA World Cup 2026 Squad Lists

---
## License

MIT
