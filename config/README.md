# Optional overrides mounted into the container at /config.
#
# To replace the built-in word bank, add a sentences.json here:
#   config/sentences.json
#
# That file completely replaces public/sentences.json from the image.
# Restart the container after changing it (no rebuild needed):
#   docker compose up -d
