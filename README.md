# Assets Delivery template

One reusable brand-delivery site. It is always minimal and black and white, with a white background, so it never carries a client's brand colours or fonts. Primary buttons are black with white text, and secondary buttons are outlined.

All markup, layout, styling and behaviour live here. Every project gets its own copy of this repository and changes only:

- `brand.json`: name, wording and links
- `assets/`: the project's logos, previews and small files

Never edit `index.html`, `styles.css`, `app.js` or `content/fallback.json` for one project. If the layout should change, change this template.

## How fallbacks work

`brand.json` overrides `content/fallback.json`, key by key. Anything a project leaves out keeps its fallback:

- **Text:** the English copy in `content/fallback.json`
- **Images:** the dashed outlines in `assets/placeholders/`
- **Links:** an unclickable, faded button until the link is added

Lists such as `logo.versions` and `external.items` are replaced whole. Set `"items": []` or `"sections": { "brandbook": false }` to remove a section.

A link's `href` can be a path in the repository, such as `assets/logos/logo.svg`, or a full URL for large files stored elsewhere.

## Preview

Serve the folder with any static server. Add `?brand=examples/project-demo.json` to see the template with a project name.
