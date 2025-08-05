<?php
// smart_hotelbeds_search.php

$apiKey = '7f145ce5195a58ec940b546d68955a9c';
$secret = 'ad6f274111';
$endpoint = 'https://api.test.hotelbeds.com/hotel-api/1.0/hotels';

// Generate X-Signature (SHA256 of apikey + secret + timestamp)
$timestamp = time();
$signature = hash('sha256', $apiKey . $secret . $timestamp);

// Prepare payload
$payload = [
    "stay" => [
        "checkIn" => "2025-12-07",
        "checkOut" => "2025-12-08"
    ],
    "occupancies" => [
        [
            "rooms" => 1,
            "adults" => 2,
            "children" => 1,
            "paxes" => [
                [
                    "type" => "CH",
                    "age" => 8
                ]
            ]
        ]
    ],
    "destination" => [
        "code" => "CMB"
    ]
];

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Api-key: $apiKey",
    "X-Signature: $signature",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Disable SSL verification for testing

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Calculate request and response sizes
$requestSize = strlen(json_encode($payload));
$responseSize = strlen($response);

// Output for logging
echo "Request size: $requestSize bytes\n";
echo "Response size: $responseSize bytes\n";

// Output API response
header('Content-Type: application/json');
echo json_encode([
    "http_code" => $httpCode,
    "response" => json_decode($response, true)
], JSON_PRETTY_PRINT);