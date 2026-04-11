FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpq-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring xml bcmath \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy composer files first for better caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy application code
COPY . .

# Re-run composer scripts (post-autoload-dump)
RUN composer dump-autoload --optimize

# Create storage directories
RUN mkdir -p storage/framework/{sessions,views,cache/data} \
    storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Build script will run migrations at startup
COPY render-build.sh /usr/local/bin/render-build.sh
RUN chmod +x /usr/local/bin/render-build.sh

EXPOSE 8000

# Start: run migrations then serve
CMD bash /usr/local/bin/render-build.sh && php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
