#!/bin/sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8090}"

case "$API_BASE_URL" in
    http://*|https://*) ;;
    *)
        echo "API_BASE_URL must start with http:// or https://" >&2
        exit 1
        ;;
esac

case "$API_BASE_URL" in
    *[!a-zA-Z0-9:/._-]*)
        echo "API_BASE_URL contains unsupported characters" >&2
        exit 1
        ;;
esac

while [ "${API_BASE_URL%/}" != "$API_BASE_URL" ]; do
    API_BASE_URL="${API_BASE_URL%/}"
done

printf 'window.__TOKENMETER_CONFIG__ = { apiBase: "%s" };\n' "$API_BASE_URL" \
    > /usr/share/nginx/html/runtime-config.js
