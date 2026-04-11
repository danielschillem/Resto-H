FROM php:8.4-cli

# Install system dependencies + PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl zip unzip libpq-dev libonig-dev libxml2-dev libcurl4-openssl-dev dos2unix \
    && docker-php-ext-install \
        pdo pdo_pgsql pgsql mbstring xml dom simplexml xmlwriter \
        bcmath ctype fileinfo filter iconv session tokenizer curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www

# Copy composer files first for better caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy application code
COPY . .

# Create .env from example so artisan commands work during build
RUN cp .env.example .env

# Re-run composer scripts (post-autoload-dump including package:discover)
RUN composer dump-autoload --optimize

# Create storage directories
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data \
    storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

RUN dos2unix render-build.sh && chmod +x render-build.sh

EXPOSE 8000

CMD ["bash", "render-build.sh"]
