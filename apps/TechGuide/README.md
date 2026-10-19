# Headliner landing page

Open `index.html` in a browser. No web server needed.

## Files

```
index.html
css/config.css    ← settings: grid, fonts, colors, sizes, lines, thumbnail count …
css/content.css   ← all the text: headline, intro, each thumbnail's paragraphs
css/style.css     ← layout (reads config.css)
js/main.js        ← builds thumbnails and the pop-up
fonts/            ← Be Vietnam Pro (Vietnamese + Latin), bundled so every device matches
content/
  01/             ← media for thumbnail 1
    thumbnail.jpg ← card image (optional; without it the card is a plain grey box)
    media-1.jpg   ← pop-up slot 1
    media-2.mp4   ← pop-up slot 2
  02/ …
```

## Changing text

Edit `css/content.css`. Each thumbnail has a block:

```css
[data-thumb="01"] {
  --title: "Thumbnail 1";          /* card label */
  --subtitle: "Shown on hover";
  --heading: "Paragraph 1:";       /* pop-up heading */
  --text: "First paragraph."
          "Second paragraph.";     /* one quoted string per paragraph */
}
```

The headline and intro live in the `.hero { … }` block at the top.

## Adding thumbnails

1. Set `--thumb-count: 6;` in `css/config.css`.
2. Copy a block in `css/content.css` and change the number to `"05"`, `"06"`.
3. Create `content/05/` and `content/06/` with their images and videos.

## Media

Slots look for `media-1`, `media-2` … with any of: jpg, png, webp, jpeg, gif,
avif, mp4, webm, mov, m4v (lowercase). `--media-slots` in config.css sets how
many. To use other file names or a different count for one thumbnail, list
them in its content.css block:

```css
--media: "walkthrough.mp4" "before.jpg" "after.jpg";
--thumbnail: "cover.png";
```

Export video as H.264 MP4 or WebM so every browser can play it. A missing
file shows an empty slot that says which file to add.

## Font

Be Vietnam Pro (weights 300, 400, 600, 700) is bundled in `fonts/` and loaded
by the `@font-face` rules at the top of `css/config.css`. Because the page
carries its own font, macOS, iOS, Windows and Android all show the same
letters, offline too. It's free under the SIL Open Font License (`fonts/OFL.txt`).

To use another font, drop its `.woff2` files in `fonts/`, update the `src`
paths and family name in those `@font-face` rules, and change `--font-heading`
and `--font-body`. Check that the font includes Vietnamese before switching.
