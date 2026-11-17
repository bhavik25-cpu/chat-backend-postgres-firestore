#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./push-to-github.sh https://github.com/OWNER/REPOSITORY.git"
  exit 1
fi
REMOTE_URL="$1"

git init
git branch -M main
git add .
git commit -m "Initial commit: chat backend with PostgreSQL and Firestore"
git remote add origin "$REMOTE_URL"
git push -u origin main
