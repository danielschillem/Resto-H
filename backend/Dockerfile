FROM php:8.2-cli-alpine

# Install system dependencies + PHP extensions
RUN apk add --no-cache bash git curl zip unzip \
        postgresql-dev oniguruma-dev libxml2-dev curl-dev \
        autoconf make g++ \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring xml bcmath curl fileinfo \
    && apk del autoconf make g++

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy composer files first for better caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy application code
COPY . .

# Re-run composer scripts (post-autoload-dump)
RUN composer dump-autoload --optimize

# Create storage directories
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data \
    storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

RUN chmod +x render-build.sh

EXPOSE 8000

CMD ["bash", "render-build.sh"]
