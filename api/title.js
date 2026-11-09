// GET /api/title?t=<title>&y=<year>&k=<Movie|Series|Special>
// Looks a title up on TMDB (poster, where to watch in the US) and OMDb (IMDb, Rotten Tomatoes, Metacritic).
// Keys come from Vercel environment variables, so they never reach the browser.
// Responses are cached at Vercel's edge for a day.

const TMDB = "https://api.themoviedb.org/3";

async function tmdb(path, token) {
  const r = await fetch(TMDB + path, { headers: { Authorization: "Bearer " + token, accept: "application/json" } });
  if (!r.ok) throw new Error("tmdb " + r.status);
  return r.json();
}

function names(list) {
  return (list || []).map(p => p.provider_name).filter(Boolean).slice(0, 6);
}

module.exports = async (req, res) => {
  const { TMDB_TOKEN, OMDB_KEY } = process.env;
  const q = req.query || {};
  const title = String(q.t || "").slice(0, 120).trim();
  const year = /^\d{4}$/.test(q.y || "") ? q.y : "";
  const kind = q.k === "Series" ? "tv" : "movie";

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!title) { res.statusCode = 400; return res.end(JSON.stringify({ error: "missing title" })); }
  if (!TMDB_TOKEN && !OMDB_KEY) { res.statusCode = 503; return res.end(JSON.stringify({ error: "not configured" })); }

  const out = { title, poster: null, tmdb: null, imdb: null, ratings: {}, providers: null };
  try {
    if (TMDB_TOKEN) {
      const yearParam = year ? (kind === "tv" ? "&first_air_date_year=" + year : "&primary_release_year=" + year) : "";
      let found = await tmdb(`/search/${kind}?query=${encodeURIComponent(title)}&include_adult=false&language=en-US${yearParam}`, TMDB_TOKEN);
      if (!found.results?.length && year) found = await tmdb(`/search/${kind}?query=${encodeURIComponent(title)}&include_adult=false&language=en-US`, TMDB_TOKEN);
      const hit = found.results && found.results[0];
      if (hit) {
        const d = await tmdb(`/${kind}/${hit.id}?language=en-US&append_to_response=external_ids,watch/providers`, TMDB_TOKEN);
        out.tmdb = `https://www.themoviedb.org/${kind}/${hit.id}`;
        if (d.poster_path) out.poster = "https://image.tmdb.org/t/p/w342" + d.poster_path;
        out.imdb = d.imdb_id || (d.external_ids && d.external_ids.imdb_id) || null;
        const us = d["watch/providers"] && d["watch/providers"].results && d["watch/providers"].results.US;
        if (us) out.providers = {
          link: us.link || null,
          free: names(us.free), ads: names(us.ads), subscription: names(us.flatrate), rent: names(us.rent), buy: names(us.buy)
        };
      }
    }
    if (OMDB_KEY) {
      const omdbUrl = out.imdb
        ? `https://www.omdbapi.com/?i=${out.imdb}&apikey=${OMDB_KEY}`
        : `https://www.omdbapi.com/?t=${encodeURIComponent(title)}${year ? "&y=" + year : ""}&type=${kind === "tv" ? "series" : "movie"}&apikey=${OMDB_KEY}`;
      const o = await (await fetch(omdbUrl)).json();
      if (o && o.Response === "True") {
        if (o.imdbRating && o.imdbRating !== "N/A") out.ratings.imdb = o.imdbRating;
        for (const r of o.Ratings || []) {
          if (r.Source === "Rotten Tomatoes") out.ratings.rt = r.Value;
          if (r.Source === "Metacritic") out.ratings.metacritic = r.Value.split("/")[0];
        }
        if (!out.imdb && o.imdbID) out.imdb = o.imdbID;
        if (!out.poster && o.Poster && o.Poster !== "N/A") out.poster = o.Poster;
      }
    }
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "public, s-maxage=600");
    return res.end(JSON.stringify({ error: "lookup failed" }));
  }
};
