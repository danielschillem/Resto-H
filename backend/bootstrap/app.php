<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'super_admin' => \App\Http\Middleware\IsSuperAdmin::class,
            'tenant' => \App\Http\Middleware\TenantScope::class,
        ]);
        // Apply tenant scoping to all authenticated API routes
        $middleware->appendToGroup('api', \App\Http\Middleware\TenantScope::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
