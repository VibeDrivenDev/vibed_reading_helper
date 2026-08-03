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

exec nginx -g "daemon off;"
