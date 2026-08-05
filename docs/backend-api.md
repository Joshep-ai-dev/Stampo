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

### Country

```json
{
  "code": "MX",
  "name": "Mexico",
  "continentCode": "NA",
  "flag": "🇲🇽"
}
```

### City

```json
{
  "id": "3530597",
  "name": "Mexico City",
  "country": "Mexico",
  "countryCode": "MX",
  "continentCode": "NA",
  "subcountry": "Mexico City"
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

`cityId` corresponds to `geonameid` in the backend's imported `world-cities.csv`. The server is authoritative for city, country, and continent metadata. It must validate the submitted `cityId` and overwrite the submitted metadata with values from its city catalog.

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

## 6. Country and City Catalog

Laravel owns the production city dataset. The mobile app must use these endpoints instead of parsing or shipping the full CSV after backend migration.

### List countries

`GET /countries?continent=NA`

The `continent` parameter is optional. Response: `200 OK`

```json
[
  {
    "code": "MX",
    "name": "Mexico",
    "continentCode": "NA",
    "flag": "🇲🇽"
  },
  {
    "code": "US",
    "name": "United States",
    "continentCode": "NA",
    "flag": "🇺🇸"
  }
]
```

Countries should be returned alphabetically. The atlas combines this catalog with the authenticated user's visits to determine active and locked stamps.

### Search cities

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

### Get city

`GET /cities/{geonameId}`

Returns one normalized city record or `404 Not Found`.

### Dataset metadata

`GET /catalog/version`

```json
{
  "version": "2026-08-04",
  "source": "world-cities.csv",
  "cityCount": 34065,
  "importedAt": "2026-08-04T03:00:00Z"
}
```

The client may cache countries and recent city searches using this version as its invalidation key.

## 7. CSV Storage and Import

Store the source file outside the public web root:

```text
storage/app/imports/world-cities.csv
```

Do not serve the raw CSV as a public asset. Import it into normalized database tables and query those tables through the API.

The expected CSV header is:

```csv
name,country,subcountry,geonameid
```

### Import command

Provide an idempotent Artisan command:

```bash
php artisan cities:import storage/app/imports/world-cities.csv --version=2026-08-04
```

Recommended implementation:

1. Open the file as a stream; do not load all rows into memory.
2. Validate the header before processing rows.
3. Resolve each country to an ISO alpha-2 code and continent code.
4. Upsert countries by `code`.
5. Upsert cities by `geoname_id` in chunks of 500–1,000 records.
6. Store normalized lowercase search fields separately from display names.
7. Record the dataset version, checksum, row count, and import timestamp.
8. Wrap each chunk in a transaction rather than one transaction for the entire file.
9. Report rejected rows and fail the command when the rejected-row threshold is exceeded.
10. Clear catalog caches only after a successful import.

Example import result:

```text
Imported 34,065 cities and 232 countries.
Updated 0 cities, rejected 0 rows.
Dataset version: 2026-08-04
```

### Dataset update policy

- Keep the original CSV checksum for auditability.
- Imports with the same checksum should exit without rewriting data unless `--force` is provided.
- Never delete cities during a normal upsert import.
- Use an explicit `--prune` mode if removal of cities absent from a new dataset is required.
- Run the import as a deployment task or queued administrative job, not during an API request.
- Back up the database before a prune operation.

## 8. Error Responses

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

## 9. Laravel Data Model

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
- `city_id` foreign key to `cities.id`, indexed
- `city_name`
- `country`
- `country_code`, indexed
- `continent_code`, indexed
- `subcountry`, nullable
- `visited_at`, indexed
- `note`, nullable
- timestamps

Recommended uniqueness depends on product behavior. Do not add a unique `(user_id, city_id)` constraint if repeat visits must remain possible.

### `countries`

- `code` fixed two-character primary key
- `name`, indexed
- `normalized_name`, indexed
- `continent_code`, indexed
- `flag`, nullable
- timestamps

### `cities`

- `id` internal primary key
- `geoname_id` string, unique and indexed
- `name`
- `normalized_name`, indexed
- `country_code` foreign key to `countries.code`, indexed
- `subcountry`, nullable
- `normalized_subcountry`, nullable and indexed where supported
- timestamps

### `catalog_versions`

- `id`
- `dataset`
- `version`
- `checksum` unique
- `row_count`
- `imported_at`
- timestamps

For MySQL, a composite index such as `(country_code, normalized_name)` supports atlas-scoped searches. For PostgreSQL, consider `pg_trgm` indexes for fast contains matching.

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

    Route::get('/countries', [CountryController::class, 'index']);
    Route::get('/cities', [CityController::class, 'index']);
    Route::get('/cities/{geonameId}', [CityController::class, 'show']);
    Route::get('/catalog/version', [CatalogController::class, 'version']);
});
```

Use API Resources to map database `snake_case` attributes to this document's `camelCase` JSON contract.

## 10. Local JSON Server

Start the mock backend:

```bash
npm run server
```

Available development collections:

- `GET/POST /visits`
- `GET/PUT /profile`
- `GET/POST /users`

The development server also implements the production-shaped authentication routes:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Run these routes with `npm run server`. Development bearer tokens are stored in
memory and are invalidated whenever the JSON Server process restarts.

JSON Server authentication is intentionally fake and stores development passwords in plain text. It must never be deployed or used with real credentials.

JSON Server does not import the 34,065-row CSV. During the transition, the client can continue using the bundled CSV for search while visits and profiles use JSON Server. Laravel becomes the authoritative catalog once `/countries`, `/cities`, and `/catalog/version` are available.

For Android Emulator, when JSON Server runs on the Windows host:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

For a physical device, use the computer's reachable LAN address. WSL networking may require exposing or forwarding port `3001`.

## 11. Client Integration

The client implementation is in `services/api.ts`.

Before connecting Laravel:

1. Set `EXPO_PUBLIC_API_URL` to the Laravel `/api/v1` URL.
2. Add API client methods for `/countries`, `/cities`, and `/catalog/version`.
3. Replace local `world-cities.csv` search with debounced `/cities` requests.
4. Cache the country catalog and invalidate it when the backend dataset version changes.
5. Replace the development in-memory auth implementation with Laravel Sanctum.
6. Store the returned token in `expo-secure-store`, not AsyncStorage.
7. Call `setApiToken(token)` during application hydration.
8. Reconcile locally created visits with server visits using UUIDs or an idempotency key.
9. Remove the bundled CSV and development JSON Server user flow after the Laravel migration is complete.
