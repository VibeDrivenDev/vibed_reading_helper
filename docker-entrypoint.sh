#!/bin/sh
set -eu

ENABLED="${AUDIO_ENABLED:-false}"
RATE="${AUDIO_RATE:-0.85}"

# Normalize common truthy/falsey env strings into JSON booleans.
case "$(printf '%s' "$ENABLED" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on) ENABLED_JSON=true ;;
  *) ENABLED_JSON=false ;;
esac

cat > /usr/share/nginx/html/config.json <<EOF
{
  "audio": {
    "enabled": ${ENABLED_JSON},
    "rate": ${RATE}
  }
}
EOF

# Optional external word bank: mount a file at /config/sentences.json to
# completely replace the sets baked into the image.
if [ -f /config/sentences.json ]; then
  cp /config/sentences.json /usr/share/nginx/html/sentences.json
  echo "reading-helper: using external sentences.json from /config"
else
  echo "reading-helper: using built-in sentences.json"
fi

exec nginx -g "daemon off;"
