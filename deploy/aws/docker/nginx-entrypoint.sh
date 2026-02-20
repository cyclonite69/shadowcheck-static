#!/bin/sh
# Generate TLS cert if not present, then start nginx.
set -e

CERT_DIR="${CERT_DIR:-/etc/nginx/certs}"
sh /usr/local/bin/generate-cert.sh

exec "$@"
