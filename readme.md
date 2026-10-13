# YouPod

A YouTube player dressed as an iPod. One HTML file, rendered with three.js, built for iPhone screens.

Spin the click wheel, pick a video, and it plays on the iPod's LCD.

## Features

- 3D iPod with a glossy body, bezel and click wheel
- Working wheel: rotate to scroll or change volume, tap the zones to control playback
- Queue that you fill by pasting YouTube links
- Queue and volume saved on your device
- Audio keeps playing while you browse the menus
- Click sound and haptics on supported phones
- Installs to the Home Screen and runs full-screen

## Controls

| Action | Result |
| --- | --- |
| Rotate the wheel | Scroll lists, or change volume on Now Playing |
| Center button | Select, play or pause |
| Top of the wheel | Menu (back) |
| Left / right | Previous / next |
| Bottom | Play / pause |

On a computer: arrow keys scroll, Enter selects, Esc goes back, Space plays or pauses.

## Run it

YouTube only plays from a real web address, so opening the file straight from your device won't work.

**Locally**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`.

**On GitHub Pages**

1. Rename `youpod.html` to `index.html` and commit it to this repo.
2. Go to **Settings → Pages**, choose your main branch and the root folder, then save.
3. Open `https://<your-username>.github.io/<repo-name>/`.

## Install on iPhone

1. Open the live URL in Safari.
2. Tap **Share**, then **Add to Home Screen**.

## Adding videos

Open **Add Video**, paste a YouTube link, and press the center button. Watch, short, youtu.be and embed links all work.

Videos whose owners block embedding show a message on the screen. Skip to the next one with the right side of the wheel.

## How it works

- three.js (r128, loaded from cdnjs) draws the body, bezel and wheel.
- The LCD is plain HTML, scaled and pinned over the 3D screen opening.
- Playback uses the official YouTube IFrame Player API with its own controls hidden.
- Everything lives in a single file with no build step.

## Notes

- Audio waits for your first tap on the wheel, as browsers require.
- Playback pauses when iOS suspends the page, for example when you lock the phone.
- Not affiliated with Apple or YouTube. YouTube content plays through YouTube's own embedded player and stays subject to its terms.

