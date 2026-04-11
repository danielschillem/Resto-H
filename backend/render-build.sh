#!/bin/bash
set -e

echo "=== SGRH Backend — Starting ==="

# Generate APP_KEY if not set properly
if [ -z "$APP_KEY" ] || [[ "$APP_KEY" != base64:* ]]; then
  php artisan key:generate --force
fi

# Run database migrations
php artisan migrate --force

# Seed database if fresh
USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tr -d '[:space:]')
if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding database..."
  php artisan db:seed --force
else
  echo "Database already seeded ($USER_COUNT users)."
fi

# Cache config & routes for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "=== Starting server on port ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
