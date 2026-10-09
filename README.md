# AsahanTechPartners Resume Builder

Paste a job description and get a one-page resume tailored to it, plus a match score and keyword gaps.
The header, employers, dates and education are locked (`public/locked.js`); the summary, skills and bullets are
written by Claude using only the facts in `public/facts.js`. Any bullet with a number or tool that is not in that
file is dropped. Add real facts there (Bottle Rocket has none yet) to get more content.

## First-time setup (Windows)

Needs [Node.js](https://nodejs.org) 18 or newer and a key from the [Claude Console](https://console.anthropic.com).

```bat
cd "%USERPROFILE%\AsahanTechPartners_Resume_Builder"
npm install
copy .env.example .env
notepad .env
```

In Notepad, paste your key after `ANTHROPIC_API_KEY=` and save. You only do this once; never share the key or
paste it into a chat.

## Start it

Double-click `start-windows.bat`, or run `npm run dev` in the project folder. The page opens at
http://localhost:3000, and the window shows whether the key was found:

```
  Resume builder running at http://localhost:3000
  Model:   claude-opus-5-5
  API key: found (.env file)
```

**Keep that window open while you use the page.** Closing it (or pressing Ctrl+C) stops the server.

Use **Download PDF** (browser print, Letter, one page). The key stays in the server window and never reaches the
browser, and the server only accepts connections from this computer. To change the model, set `RESUME_MODEL` in
`.env` and restart.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| "This site can't be reached" at localhost:3000 | The server isn't running. Start it again and keep its window open. |
| A yellow box saying the page must be opened through the local server | You opened `index.html` directly. Start the server and go to http://localhost:3000. |
| "No API key found" | Create `.env` as above, paste the key, save, and restart the server. |
| "The API key was rejected" | The key was deleted or mistyped. Create a new key, put it in `.env`, and restart. |
| "port 3000 was busy" in the window | Another copy is running in a different window. Close it, or use the address this window prints. |

## Development

```bash
npm test                       # guardrails, locked data, .env parsing, API error handling
npm run dev -- --no-open       # start without opening a browser tab
```
