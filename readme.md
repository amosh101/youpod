# YouPod

A static YouTube player styled as a 3D iPod. The app uses native JavaScript modules and has no runtime build step or package dependencies.

## Project layout

```text
index.html              Document structure and metadata
styles.css              LCD and full-screen layout styles
src/app.js              Application state and feature orchestration
src/input.js            Wheel, keyboard, haptics, and click audio
src/ipod-scene.js       Three.js model and responsive scene layout
src/persistence.js      Queue migration and local preferences
src/screens.js          LCD screens and navigation
src/youtube-player.js   URL parsing and YouTube IFrame API
tests/                  Node.js tests for data and URL logic
```

## Run locally

YouTube playback requires an HTTP(S) page rather than a `file://` URL. With Python 3 installed:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Tests

The test suite uses Node's built-in test runner and has no install step. Node.js 18 or later is required.

```bash
npm test
```

## Deploy

The project can be published directly from the repository root with GitHub Pages. In **Settings → Pages**, choose deployment from a branch, select the main branch and `/ (root)`, then save. The HTML uses relative asset paths, so it also works from a project subpath.

## Install on iPhone

1. Open the deployed URL in Safari.
2. Tap **Share**, then **Add to Home Screen**.

The app requests portrait orientation where supported and keeps the interface portrait-oriented on other browsers. Queue and volume preferences are saved on the device.

## Controls

| Action | Result |
| --- | --- |
| Rotate the wheel | Scroll lists, or change volume on Now Playing |
| Center button | Select, play or pause |
| Top of the wheel | Menu (back) |
| Left / right | Previous / next |
| Bottom | Play / pause |

On desktop, use the arrow keys, Enter, Escape, and Space.

## Notes

- Audio starts after the first user interaction, as browsers require.
- Playback may pause when iOS suspends the page, for example when the phone is locked.
- YouTube videos play through YouTube's official embedded player and remain subject to YouTube's terms. Video owners may disable embedding.
- YouPod is not affiliated with Apple or YouTube.

