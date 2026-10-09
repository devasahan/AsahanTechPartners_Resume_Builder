# AsahanTechPartners Resume Builder

Paste a job description and get a one-page resume tailored to it, plus a match score and keyword gaps.
The header, employers, dates and education are locked (`public/locked.js`); the summary, skills and bullets are
written by Claude using only the facts in `public/facts.js`. Any bullet with a number or tool that is not in that
file is dropped. Add real facts there (Bottle Rocket has none yet) to get more content.

```bash
npm install
export ANTHROPIC_API_KEY=...   # see .env.example
npm run dev                    # open http://localhost:3000
npm test                       # guardrail and locked-data tests
```

Use **Download PDF** (browser print, Letter, one page). The API key stays on the local server and never reaches
the browser; do not expose this server publicly. Set `RESUME_MODEL` to change the model.
