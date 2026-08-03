# Stampo Backend API Contract

This document defines the HTTP contract expected by the Stampo Expo client. The production backend will be Laravel; the repository's JSON Server is a development-only substitute.

## 1. Conventions

- Production base URL: `https://api.example.com/api/v1`
- Development base URL: `http://localhost:3001`
- Content type: `application/json`
- Dates: ISO 8601 calendar dates, `YYYY-MM-DD`
- Timestamps: ISO 8601 UTC timestamps
- Country codes: ISO 3166-1 alpha-2, such as `US`, `MX`, and `JP`
- Continent codes: `AF`, `AN`, `AS`, `EU`, `NA`, `OC`, or `SA`
- Production IDs: UUID strings are recommended
- JSON property names use `camelCase`; Laravel database columns may remain `snake_case`

The client reads its base URL from:

```env
EXPO_PUBLIC_API_URL=https://api.example.com/api/v1
```

Authenticated requests send:

```http
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json
```

## 2. Models

### User

```json
{
  "id": "5ec53967-acde-4ccf-bc78-3f80ee8da15d",
  "name": "Robb",
  "email": "robb@example.com",
  "language": "English",
  "createdAt": "2026-08-04T02:00:00Z",
  "updatedAt": "2026-08-04T02:00:00Z"
}
```

### Profile

```json
{
  "name": "Robb",
  "language": "English"
}
```

### Visit

```json
{
  "id": "56aac7ea-8a05-482c-a762-995678f74395",
  "cityId": "3530597",
  "cityName": "Mexico City",
  "country": "Mexico",
  "countryCode": "MX",
  "continentCode": "NA",
  "subcountry": "Mexico City",
  "visitedAt": "2026-08-04",
  "note": "Beautiful city, unforgettable moments."
}
```

`cityId` corresponds to `geonameid` in `assets/world-cities.csv`. The server should treat the submitted country and continent fields as hints and validate or normalize them against its city catalog.

## 3. Authentication

Use Laravel Sanctum for the mobile bearer-token flow. Do not use cookie-only SPA authentication for the native application.

### Register

`POST /auth/register`

Request:

```json
{
  "name": "Robb",
  "email": "robb@example.com",
  "password": "secret-password",
  "passwordConfirmation": "secret-password"
}
```

Response: `201 Created`

```json
{
  "token": "1|sanctum-token",
  "user": {
    "id": "5ec53967-acde-4ccf-bc78-3f80ee8da15d",
    "name": "Robb",
    "email": "robb@example.com",
    "language": "English"
  }
}
```

### Sign in

`POST /auth/login`

```json
{
  "email": "robb@example.com",
  "password": "secret-password",
  "deviceName": "Robb's iPhone"
}
```

Response: `200 OK`, using the same response shape as registration.

### Current user

`GET /auth/me`

Response: `200 OK`

```json
{
  "id": "5ec53967-acde-4ccf-bc78-3f80ee8da15d",
  "name": "Robb",
  "email": "robb@example.com",
  "language": "English"
}
```

### Sign out

`POST /auth/logout`

Revokes the current Sanctum token. Response: `204 No Content`.

## 4. Profile

All profile routes require authentication in production.

### Get profile

`GET /profile`

Response: `200 OK`

```json
{
  "name": "Robb",
  "language": "English"
}
```

### Update profile

`PUT /profile`

```json
{
  "name": "Robb",
  "language": "Japanese"
}
```

Response: `200 OK`, returning the updated profile.

Validation:

- `name`: required string, 1–80 characters
- `language`: required supported-language identifier, 2–40 characters

## 5. Visits

All visit routes require authentication in production. A visit belongs to the authenticated user; never accept a `userId` from the client.

### List visits

`GET /visits`

Response: `200 OK`

```json
[
  {
    "id": "56aac7ea-8a05-482c-a762-995678f74395",
    "cityId": "3530597",
    "cityName": "Mexico City",
    "country": "Mexico",
    "countryCode": "MX",
    "continentCode": "NA",
    "subcountry": "Mexico City",
    "visitedAt": "2026-08-04",
    "note": "Beautiful city, unforgettable moments."
  }
]
```

The initial client expects a plain array. If pagination is introduced, update the client and server together to use Laravel's `{ data, links, meta }` response.

### Create visit

`POST /visits`

Request:

```json
{
  "cityId": "3530597",
  "cityName": "Mexico City",
  "country": "Mexico",
  "countryCode": "MX",
  "continentCode": "NA",
  "subcountry": "Mexico City",
  "visitedAt": "2026-08-04",
  "note": "Beautiful city, unforgettable moments."
}
```

Response: `201 Created`, returning the created `Visit` including its `id`.

Validation:

- `cityId`: required string and valid city catalog ID
- `cityName`: required string, maximum 150 characters
- `country`: required string, maximum 100 characters
- `countryCode`: required two-character ISO code
- `continentCode`: required supported continent code
- `subcountry`: nullable string, maximum 150 characters
- `visitedAt`: required date
- `note`: nullable string, maximum 140 characters

Multiple visits to the same city are allowed. Country, continent, and city statistics are calculated from unique values by the client.

### Update visit

`PUT /visits/{visitId}`

Accepts the same fields as creation and returns the updated `Visit`.

### Delete visit

`DELETE /visits/{visitId}`

Response: `204 No Content`.

The server must verify that the visit belongs to the authenticated user. Return `404` instead of exposing another user's resource.

## 6. Optional City Search Endpoint

The current client searches the bundled `world-cities.csv` locally. Laravel may later provide centralized search:

`GET /cities?query=mexico&limit=10`

```json
[
  {
    "id": "3530597",
    "name": "Mexico City",
    "country": "Mexico",
    "countryCode": "MX",
    "continentCode": "NA",
    "subcountry": "Mexico City"
  }
]
```

Requirements:

- Minimum query length: 2
- Default limit: 10
- Maximum limit: 50
- Prioritize city-name prefix matches
- Apply a database index suitable for normalized name search

## 7. Error Responses

Use standard HTTP status codes:

- `400`: malformed request
- `401`: unauthenticated or invalid token
- `403`: authenticated but unauthorized
- `404`: resource not found
- `409`: conflicting update
- `422`: validation failure
- `429`: rate limit exceeded
- `500`: unexpected server error

Laravel validation response: `422 Unprocessable Entity`

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "visitedAt": ["The visited at field must be a valid date."],
    "note": ["The note field must not be greater than 140 characters."]
  }
}
```

Unexpected error response:

```json
{
  "message": "An unexpected error occurred.",
  "requestId": "01J4GDX9BEF4X9A9V44K1QHTY0"
}
```

Do not expose stack traces or SQL details outside local development.

## 8. Laravel Data Model

Suggested tables:

### `users`

- `id` UUID primary key
- `name`
- `email` unique
- `password`
- `language`
- timestamps

### `visits`

- `id` UUID primary key
- `user_id` foreign key, indexed
- `city_id`, indexed
- `city_name`
- `country`
- `country_code`, indexed
- `continent_code`, indexed
- `subcountry`, nullable
- `visited_at`, indexed
- `note`, nullable
- timestamps

Recommended uniqueness depends on product behavior. Do not add a unique `(user_id, city_id)` constraint if repeat visits must remain possible.

Suggested Laravel route structure:

```php
Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::apiResource('visits', VisitController::class)->except(['show']);
    });
});
```

Use API Resources to map database `snake_case` attributes to this document's `camelCase` JSON contract.

## 9. Local JSON Server

Start the mock backend:

```bash
npm run server
```

Available development collections:

- `GET/POST /visits`
- `GET/PUT /profile`
- `GET/POST /users`

JSON Server authentication is intentionally fake and stores development passwords in plain text. It must never be deployed or used with real credentials.

For Android Emulator, when JSON Server runs on the Windows host:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

For a physical device, use the computer's reachable LAN address. WSL networking may require exposing or forwarding port `3001`.

## 10. Client Integration

The client implementation is in `services/api.ts`.

Before connecting Laravel:

1. Set `EXPO_PUBLIC_API_URL` to the Laravel `/api/v1` URL.
2. Change development sign-up/sign-in paths from JSON Server `/users` queries to `/auth/register` and `/auth/login`.
3. Store the returned token in `expo-secure-store`, not AsyncStorage.
4. Call `setApiToken(token)` during application hydration.
5. Reconcile locally created visits with server visits using UUIDs or an idempotency key.
6. Remove the development JSON Server user flow.

