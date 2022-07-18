# KIT (Keeping In Touch) Node.js Backend

Matthew Merkas 2022 Thesis Project

Features:

- Asynchronous audio messaging
  - Real-time updates with Socket.IO
- Speech recognition

Environment Variables:

- MONGO_URI (required)
- JWT_SECRET (required)
- JWT_EXPIRY (default: 1hr)
- HOSTNAME (default: 127.0.0.1)
- PORT (default: 3000)
- PREFIX (default: /api)
- MIN_PASSWORD_LENGTH (default: 8)

## Development

Create a user with `npm run createUser`

Run the development server with `npm run dev`
