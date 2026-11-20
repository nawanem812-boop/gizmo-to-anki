# Gizmo → Anki

Static site (no build step, no server). Converts Gizmo cards into an Anki `.apkg` in the browser.

## Deploy on GitHub Pages
1. Create a repo, upload all files from this folder (keep `.nojekyll`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Open `https://<username>.github.io/<repo>/`.

## Use
Open your Gizmo folder link, copy the cards, paste them into the site (`# Deck name` lines separate folders), then download the `.apkg` and import it in Anki.

## Restyle
Edit the variables at the top of `style.css`.
