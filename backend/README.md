# Backend - projetIonic

This README documents the small Express/SQLite backend used by the Ionic frontend.
It's intended for developers who need to run, inspect, or modify the backend.

## Quick start

- Install dependencies (from repository root):
  - npm install

- Start the backend in development mode (auto-restarts on change):
  - npm run dev

- Start the backend normally:
  - npm start

The server listens on PORT environment variable (default 3000).

Example (PowerShell):

# Set a different port and start
$env:PORT=3001; node server.js

## Environment variables

- JWT_SECRET: secret used to sign JWT tokens (set to a strong value in production).
- EMAIL_USER: optional, email account for nodemailer.
- EMAIL_PASS: optional, password for EMAIL_USER.
- EMAIL_SERVICE: optional, nodemailer service name (e.g., 'gmail').
- PORT: optional, server port (default 3000).

## Database

The backend uses a local SQLite3 database (`events.db`).

Tables:
- **users**: Stores user accounts (email, password_hash, type)
- **events**: Stores event details
- **registrations**: Links users to events they're registered for
- **notifications**: Stores scheduled notifications

To inspect the current database:

  npm run inspect-db

To reset the database (delete events.db):

  npm run reset-db

If users have invalid types in the database:

  npm run fix-user-type

## API Routes

### Authentication

- `POST /api/register` - Register a new user (organizer or participant)
- `POST /api/login` - Login and get a JWT token

### Events

- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get an event by ID
- `POST /api/events` - Create new event (requires auth)
- `POST /api/events/:id/register` - Register current user to an event (requires auth)
- `GET /api/events/:id/participants` - Get participants of an event

### Notifications

- `POST /api/notifications` - Create scheduled notification (requires auth)

Notifications are automatically sent when their `scheduled_date` arrives.
A cron job runs every minute to check and send pending notifications.

### Health

- `GET /health` - Check server is running

## Development

To format or lint the code, you could add ESLint or Prettier:

  npm install --save-dev eslint prettier

## Notes

- Passwords are hashed with bcryptjs before storage
- JWTs expire after 24 hours
- CORS is enabled to allow requests from the frontend
