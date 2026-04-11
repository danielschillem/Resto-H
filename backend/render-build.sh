#!/bin/bash
set -e

echo "=== SGRH Backend — Render Build ==="

# Install PHP dependencies (production)
composer install --no-dev --optimize-autoloader --no-interaction

# Generate APP_KEY if not set properly (Render generateValue gives a plain string)
if [ -z "$APP_KEY" ] || [[ "$APP_KEY" != base64:* ]]; then
  php artisan key:generate --force
fi

# Run database migrations
php artisan migrate --force

# Seed database if fresh (check if users table is empty)
php artisan tinker --execute="if(Schema\hasTable('users') && App\Models\User::count()===0){echo 'NEEDS_SEED';}" | grep -q "NEEDS_SEED" && php artisan db:seed --force || echo "Database already seeded."

# Cache config & routes for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "=== Build complete ==="
