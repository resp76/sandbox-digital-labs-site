# Sandbox Digital Labs website

Static company website deployed to Netlify at <https://sandboxdigitallabs.com/>.

## PromptCept pages

- Product: `/promptcept/`
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
