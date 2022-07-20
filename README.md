# KIT (Keeping In Touch) Node.js Backend

Matthew Merkas 2022 Thesis Project

Features:

- Asynchronous audio messaging
  - Real-time updates with Socket.IO
- Speech recognition

Environment Variables:

- MONGO_URI (required)
- JWT_SECRET (required)
- JWT_REFRESH_SECRET (required)
- JWT_EXPIRY (default: 1hr)
- JWT_REFRESH_EXPIRY (default: 30d)
- HOSTNAME (default: 127.0.0.1)
- PORT (default: 3000)
- PREFIX (default: /api)
- MIN_PASSWORD_LENGTH (default: 8)

## Development

Create an admin user with `npm run createAdmin`

Run the development server with `npm run dev`
