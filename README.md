# Menu API

Order management system

Features:

- Mobile ordering
  - No login required
  - Open web app and autofill seating location with NFC tags/QR codes
  - Cart, notes, etc.
- Management console
  - Configure venues, seating locations, menus, and menu items
  - Images
  - Titles
  - Descriptions
  - View orders in real time
  - Display recipe for current order
  - Intelligently groups duplicate orders
  - Mark orders as complete
  - Feedback sent to mobile clients

Environment Variables:

- MONGO_URI (required)
- JWT_SECRET (required)
- JWT_EXPIRY (default: 1hr)
- HOSTNAME (default: 127.0.0.1)
- PORT (default: 3000)
- PREFIX (default: /api)
- MIN_PASSWORD_LENGTH (default: 8)

## Development

Create an admin user with `npm run createAdmin`

Run the development server with `npm run dev`
