#!/bin/bash

echo "=== Resto-H Backend — Starting ==="
echo "PORT=${PORT:-not set} | DB_CONNECTION=$DB_CONNECTION | APP_ENV=$APP_ENV"

# Remove build-time .env so runtime env vars take precedence
rm -f .env

# Generate APP_KEY if not set properly
if [ -z "$APP_KEY" ] || [[ "$APP_KEY" != base64:* ]]; then
  echo "Generating APP_KEY..."
  php artisan key:generate --force || true
fi

# Clear any cached config from build
echo "Clearing config cache..."
php artisan config:clear 2>&1 || true

# Wait for database to be ready
echo "Waiting for database..."
for i in $(seq 1 30); do
  php artisan db:monitor 2>&1 && break
  echo "  attempt $i/30..."
  sleep 2
done

# Run database migrations (idempotent — creates missing tables only)
echo "Running migrations..."
php artisan migrate --force 2>&1 || echo "WARNING: Migrations failed but continuing..."

# Seed database if empty
echo "Seeding database..."
php artisan db:seed --force 2>&1 || echo "Seeding skipped or failed."

# Cache config & routes for performance
echo "Caching..."
php artisan config:cache 2>&1 || true
php artisan route:cache 2>&1 || echo "Route caching skipped"
php artisan view:cache 2>&1 || true

echo "=== Starting server on port ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
