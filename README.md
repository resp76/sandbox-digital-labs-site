# Sandbox Digital Labs website

Static company website deployed to Netlify at <https://sandboxdigitallabs.com/>.

## PromptCept pages

- Product: `/promptcept/`
- Web app: `/promptcept/app/` — a copy of `www/` from the private `resp76/promptcept`
  repo. `js/` and `styles/` must stay byte-identical to it; refresh with
  `cp -R ../promptcept/www/js ../promptcept/www/styles promptcept/app/`.
  `index.html` differs only by its head tags and the `sw-register.js` include.
  `manifest.webmanifest`, `sw.js`, `sw-register.js` and `icons/` exist only here;
  bump `CACHE` in `sw.js` whenever a shell file changes.
- Support: `/promptcept/support/`
- Privacy: `/promptcept/privacy/`
- Terms: `/promptcept/terms/`

The monitored public contact address is `contact@sandboxdigitallabs.com`.

## Local verification

```bash
npm test
python3 -m http.server 8080
```

Then visit <http://localhost:8080/>. The site has no build step; Netlify publishes the repository root.
