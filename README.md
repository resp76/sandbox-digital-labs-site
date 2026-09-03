# Sandbox Digital Labs website

Static company website deployed to Netlify at <https://sandboxdigitallabs.com/>.

## PromptCept pages

- Product: `/promptcept/`
- Web app: `/promptcept/app/`
- Support: `/promptcept/support/`
- Privacy: `/promptcept/privacy/`
- Terms: `/promptcept/terms/`

### Keeping the web app in sync

`promptcept/app/` is a copy of `www/` from the private `resp76/promptcept`
repository, which is the source of truth. `js/app.js` and `styles/app.css` are
byte-identical to it and must stay that way; refresh them with:

```bash
cp -R ../promptcept/www/js ../promptcept/www/styles promptcept/app/
```

`index.html` is the one file that deliberately differs: it adds the web
manifest, icons, canonical URL, social tags, and the service-worker
registration. Re-apply those additions by hand when the app's markup changes.
`manifest.webmanifest`, `sw.js`, and `icons/` exist only in this repository.
Bump `CACHE` in `sw.js` whenever a shell asset changes, or returning visitors
keep the old build.

The monitored public contact address is `contact@sandboxdigitallabs.com`.

## Local verification

```bash
npm test
python3 -m http.server 8080
```

Then visit <http://localhost:8080/>. The site has no build step; Netlify publishes the repository root.
