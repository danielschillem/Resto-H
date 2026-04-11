#!/bin/bash

echo "=== SGRH Backend — Starting ==="
echo "PORT=$PORT | DB_CONNECTION=$DB_CONNECTION | APP_ENV=$APP_ENV"

# Remove build-time .env so runtime env vars from Render take precedence
rm -f .env

# Generate APP_KEY if not set properly
if [ -z "$APP_KEY" ] || [[ "$APP_KEY" != base64:* ]]; then
  echo "Generating APP_KEY..."
  php artisan key:generate --force || true
fi

# Clear any cached config from build
echo "Clearing config cache..."
php artisan config:clear || true

# Run database migrations
echo "Running migrations..."
php artisan migrate --force
if [ $? -ne 0 ]; then
  echo "ERROR: Migrations failed!"
  exit 1
fi

# Seed database if fresh
echo "Seeding database..."
php artisan db:seed --force 2>/dev/null || echo "Seeding skipped (already seeded or error)."

# Cache config & routes for performance
echo "Caching config..."
php artisan config:cache || true
echo "Caching routes..."
php artisan route:cache || echo "Route caching failed (non-fatal)"
echo "Caching views..."
php artisan view:cache || true

echo "=== Starting server on port ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
