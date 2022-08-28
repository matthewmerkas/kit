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

Seed the database with `npm run seed`

Clear the database + user-generated public files (audio messages & profile pictures) with `npm run reset`

Run the development server with `npm run dev`

## Push Notifications

To send push notifications, you need to provide credentials for a Firebase service account. Follow the instructions
[here](https://firebase.google.com/docs/admin/setup#initialize-sdk) and set the GOOGLE_APPLICATION_CREDENTIALS
environment variable.

You must grant the 'Firebase Cloud Messaging API Admin' role to your service account.

You also need to enable [Cloud Messaging](https://console.cloud.google.com/marketplace/product/google/googlecloudmessaging.googleapis.com)
