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

For a typical Linux server from an Apple Silicon Mac:

```bash
docker buildx build --platform linux/amd64 -t reading-helper:latest --load .
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

### Audio (`.env`)

Speech is off by default. Configure it in [`.env`](.env) (see [`.env.example`](.env.example)):

```bash
AUDIO_ENABLED=false
AUDIO_RATE=0.85
```

Set `AUDIO_ENABLED=true` to turn speech on, then restart:

```bash
docker compose up --build -d
```

Docker writes `config.json` from these env vars at container start. For a local static preview without Docker, edit [`public/config.json`](public/config.json) instead.

When enabled, the app speaks:

- each **word** as it appears
- each **letter** during letter spotlight
- the **full sentence** when returning after the last word

## Controls

| Input | Action |
| --- | --- |
| Short tap / click / Space | Next word (or next letter if already in letter mode). After the last word, returns to the full sentence. |
| Long press / hold Space / Right arrow | In word view, start or advance letter spotlight (dimmed word, active letter high contrast). Ignored in sentence view. After the last letter, returns to a normal word. |
| Swipe right → left / Enter | New random sentence |
| Swipe left → right / Left arrow | Previous word (from the first word, back to the full sentence) |

## Local static preview (optional)

Serve the `public/` folder with any static server, for example:

```bash
npx --yes serve public -p 8080
```
