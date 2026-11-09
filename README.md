# Weekend Watch

New movies and shows for this week and the month ahead, sorted by what they cost to watch:

- **Included with streaming** – free, ad-supported services (no subscription) and subscription services you already have
- **Rent or buy** – digital rentals and purchases
- **In theaters** – ticketed releases

Each title shows review scores where available and a personal match score that learns from your ratings. You can set reminders for upcoming titles.

## How it's built

- `index.html` – the whole app (plain HTML, CSS and JavaScript; no build step)
- `data/titles.json` – the listings, refreshed every morning by a scheduled task
- `manifest.webmanifest`, `sw.js`, `icons/` – lets the site install to a phone's home screen and work offline
- `api/title.js` – looks up posters, ratings and where-to-watch on TMDB and OMDb (needs `TMDB_TOKEN` and `OMDB_KEY` in Vercel's environment variables)
- `config.js` – the Supabase project URL and publishable key for accounts (leave empty to run without accounts)

Vercel deploys the `main` branch automatically. Framework preset: **Other**, no build command.
