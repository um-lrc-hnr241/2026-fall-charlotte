# Portfolio site template

Starter site for HNR 241 group portfolio sites. The group-provisioning
workflow generates each group's repo from this template and turns on GitHub
Pages for it; the site-builder agent then edits the files in response to
`@agent build` comments in the group's planning Doc.

- `index.html` — placeholder home page.
- `styles.css` — one shared stylesheet, linked from every page.
- `.nojekyll` — tells GitHub Pages to serve the files as-is.
- `images/`, `videos/` — empty to start. The agent copies files here from the
  group's Drive Assets folder. (The `.gitkeep` files only exist so Git keeps
  the empty folders.)

Changes to this template only affect repos generated afterward.
