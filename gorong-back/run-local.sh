#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DB_USERNAME:?Set DB_USERNAME in gorong-back/.env}"
: "${DB_PASSWORD:?Set DB_PASSWORD in gorong-back/.env}"
: "${TOUR_API_KEY:?Set TOUR_API_KEY in gorong-back/.env}"
: "${JUSO_API_KEY:?Set JUSO_API_KEY in gorong-back/.env}"
: "${JUSO_COORD_API_KEY:?Set JUSO_COORD_API_KEY in gorong-back/.env}"
: "${GEMINI_API_KEY:?Set GEMINI_API_KEY in gorong-back/.env}"

export GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

./gradlew bootRun --args="--server.port=8080"
