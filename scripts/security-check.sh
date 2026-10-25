#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to run Slither."
  exit 1
fi

venv="$root/.venv"
if [[ ! -x "$venv/bin/slither" ]]; then
  echo "Installing Slither into .venv."
  if ! python3 -m venv "$venv"; then
    echo "Python 3 could not create a virtual environment. Install python3-venv and run npm run security:check again."
    exit 1
  fi
  "$venv/bin/pip" install --disable-pip-version-check -r "$root/requirements-dev.txt"
fi

echo "Running Slither. This is static analysis, not an audit."
exec "$venv/bin/slither" . --compile-force-framework hardhat --filter-paths "node_modules"
