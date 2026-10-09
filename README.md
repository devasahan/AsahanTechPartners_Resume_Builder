# AsahanTechPartners Resume Builder

Upload your draft résumé (PDF), paste a job description, and get a one-page résumé tailored to that job, with a match
score and the keywords you're missing. Runs on your own computer; your key and résumé stay with you.

## How it works

1. **Upload your draft résumé.** Claude reads the PDF once and the page shows what it found, so you can fix anything.
   Whatever is in the draft stays exactly as written: your name, contact line, companies, dates and school.
   The result is saved only in this browser (use **Forget** to remove it).
2. **Paste a job description.** The builder works out what the job needs, picks the best-fit career workflow, and writes:
   a headline under your name (the job's title plus three key skills), a summary that opens with the job's title,
   a job title for each company, your skills, and bullets for each company.
3. **Check, then download.** Bullets already in your draft are rewritten to fit the job using only what they say: no new
   numbers or tools. If a company has no bullets, the AI drafts a few from general knowledge of that company and role.
   Those are guesses, so they are marked **AI draft: verify**, can't contain numbers, named tools or leadership claims,
   and you must tick a box confirming every line is accurate before **Download PDF** is enabled.
   Everything on the page can be edited by clicking it.

The more your draft contains (titles, bullets, skills), the better and more truthful the result.

## First-time setup (Windows)

Needs [Node.js](https://nodejs.org) 18 or newer and a key from the [Claude Console](https://console.anthropic.com).

```bat
cd "%USERPROFILE%\AsahanTechPartners_Resume_Builder"
npm install
copy .env.example .env
notepad .env
```

In Notepad, paste your key after `ANTHROPIC_API_KEY=` and save. You only do this once; never share the key or
paste it into a chat. A file that Windows saved as `.env.txt`, or one holding just the key on its own line, works
too, as long as it is in the project folder.

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
browser, and the server only accepts connections from this computer. Your PDF is sent to the Claude API to be read,
and nowhere else. To change the model, set `RESUME_MODEL` in `.env` and restart.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| "This site can't be reached" at localhost:3000 | The server isn't running. Start it again and keep its window open. |
| A yellow box saying the page must be opened through the local server | You opened `index.html` directly. Start the server and go to http://localhost:3000. |
| "No API key found" | Create `.env` as above, paste the key, save, and restart the server. |
| "The API key was rejected" | The key was deleted or mistyped. Create a new key, put it in `.env`, and restart. |
| "That doesn't look like a résumé" | The PDF has no name, jobs or school in it, or can't be read. Try another PDF, or click "Enter your details by hand". |
| "port 3000 was busy" in the window | Another copy is running in a different window. Close it, or use the address this window prints. |

## Development

```bash
npm test                       # guardrails, profile handling, API (against a fake Claude), .env parsing
npm run dev -- --no-open       # start without opening a browser tab
```

Code map: `public/` is the page (`guard.js` holds the rules every generated line must pass, `profile.js` the résumé
model, `vocabulary.js` the list of named tools used by those rules); `scripts/` is the local server and the API.
