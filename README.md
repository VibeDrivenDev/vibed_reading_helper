# Early Reading Helper

Fullscreen reading practice for early learners. Large uppercase words appear on screen with no visible UI — gestures and keyboard only.

## Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

Stop with `Ctrl+C`, or run detached:

```bash
docker compose up --build -d
docker compose down
```

## Edit word sets

Word banks live in [`public/sentences.json`](public/sentences.json). Each set has ordered groups; the app picks a set at random, then one word from each group in order to build a sentence:

```json
{
  "sets": [
    {
      "id": "can",
      "name": "Can",
      "groups": [
        ["SAM", "TIM", "PAM"],
        ["CAN"],
        ["DIG", "HOP", "RUN"],
        ["MUD", "JAM", "IT"]
      ]
    }
  ]
}
```

Example result: `SAM CAN HOP MUD`. After editing, rebuild and restart:

```bash
docker compose up --build
```

## Controls

| Input | Action |
| --- | --- |
| Single tap / click / Space | Show the next word (first tap leaves sentence view; after the last word, returns to full sentence) |
| Double tap / double click / double Space | In word view, highlight the next letter (dimmed word, active letter high contrast). After the last letter, returns to a normal word. Does nothing in sentence view. |
| Swipe right → left / Enter | Load a new random sentence |

## Local static preview (optional)

Serve the `public/` folder with any static server, for example:

```bash
npx --yes serve public -p 8080
```
