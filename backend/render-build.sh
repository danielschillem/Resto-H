#!/bin/bash
set -e

echo "=== SGRH Backend — Starting ==="

# Remove build-time .env so runtime env vars from Render take precedence
rm -f .env

# Generate APP_KEY if not set properly
if [ -z "$APP_KEY" ] || [[ "$APP_KEY" != base64:* ]]; then
  php artisan key:generate --force
fi

# Clear any cached config from build
php artisan config:clear

# Run database migrations
php artisan migrate --force

# Seed database if fresh (simple check without tinker)
php artisan db:seed --force 2>/dev/null || echo "Seeding skipped (already seeded or error)."

# Cache config & routes for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "=== Starting server on port ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
