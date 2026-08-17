#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

extension_version="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8')).version)")"
output_dir="${1:-dist}"
archive_path="${output_dir}/quick-add-to-clickup-v${extension_version}.zip"

mkdir -p "$output_dir"

zip -q -r -FS "$archive_path" \
  manifest.json \
  background.js \
  options.html \
  options.css \
  options.js \
  lib \
  assets/icon-16.png \
  assets/icon-32.png \
  assets/icon-48.png \
  assets/icon-128.png

entry_list="$(mktemp /tmp/quick-add-package-entries.XXXXXX)"
trap 'rm -f "$entry_list"' EXIT
unzip -Z1 "$archive_path" > "$entry_list"
node scripts/validate-package.mjs "$archive_path" "$entry_list"
printf '%s\n' "$archive_path"
