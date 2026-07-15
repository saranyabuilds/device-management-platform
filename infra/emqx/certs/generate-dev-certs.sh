#!/usr/bin/env sh
set -eu

CERT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/dev"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
  -keyout "$CERT_DIR/ca.key" \
  -out "$CERT_DIR/ca.crt" \
  -subj "/CN=Device Management Local Dev CA"

openssl req -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -subj "/CN=localhost"

cat > "$CERT_DIR/server.ext" <<'EOF'
subjectAltName=DNS:localhost,DNS:emqx,IP:127.0.0.1
extendedKeyUsage=serverAuth
EOF

openssl x509 -req -days 365 \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -extfile "$CERT_DIR/server.ext"

rm -f "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"

cat <<EOF
Generated development-only EMQX TLS files in:
  $CERT_DIR

Use this CA for local clients:
  $CERT_DIR/ca.crt

Do not use these files outside local development.
EOF
