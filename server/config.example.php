<?php
declare(strict_types=1);

return [
    'db' => [
        'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
        'user' => 'YOUR_DATABASE_USER',
        'password' => 'YOUR_DATABASE_PASSWORD',
    ],
    'app' => [
        'base_path' => '/hacker/',
        'production' => true,
    ],
];
