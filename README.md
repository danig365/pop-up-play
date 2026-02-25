# Pop-Up Play

A modern, interactive social platform built with React and Vite, featuring real-time communication, video calls, location-based discovery, and subscription management.

## Features

- 👥 **User Profiles** - Create and manage user profiles with customizable settings
- 💬 **Real-time Chat** - Instant messaging with conversation history
- 📹 **Video Calls** - High-quality peer-to-peer video communication
- 🗺️ **Location Services** - Discover users by location with interactive maps
- 🎬 **Reels** - Share and watch short video content
- 🔔 **Notifications** - Real-time push notifications and alerts
- 🔐 **Authentication** - Secure user authentication and session management
- 💳 **Stripe Integration** - Subscription management and payments
- 🚫 **User Blocking** - Block and manage unwanted interactions
- 📡 **Broadcasts** - Send messages to multiple users simultaneously
- ♿ **Accessible** - Built with accessibility in mind

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: SQL (likely PostgreSQL or MySQL)
- **Real-time**: WebSocket support
- **Payments**: Stripe API
- **Styling**: Tailwind CSS + Shadcn/ui components

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQL Database (configured as per `database/schema.sql`)
- Stripe API keys (for payment features)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/danig365/pop-up-play.git
   cd pop-up-play
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   ```
   API_PORT=3001
   FRONTEND_URL=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=popup_play_db
   DB_USER=postgres
   DB_PASSWORD=your_database_password

   SMTP_HOST=smtp.mailprovider.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   EMAIL_FROM=no-reply@popup-play.com

   POPUP_ALERT_RADIUS_MILES=60
   ```

4. **Initialize the database**
   ```bash
   npm run setup-db
   # or manually:
   # mysql/psql < database/schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run setup` - Run setup script (see `run_setup.mjs`)
- `npm run test-db` - Test database connection

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat features
│   ├── location/       # Location services
│   ├── map/            # Map components
│   ├── notifications/  # Notification components
│   ├── profile/        # Profile components
│   ├── reels/          # Reels features
│   ├── subscription/   # Subscription components
│   └── ui/             # UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
├── api/                # API client configuration
└── assets/             # Static assets

functions/             # Firebase or serverless functions
├── cancelSubscription.ts
├── createCheckout.ts
├── getSubscriptionStatus.ts
├── stripeWebhook.ts
└── ...

database/              # Database migrations and schemas
├── schema.sql
├── seed.sql
└── migrations/
```

## Database Setup

Run migrations in order:
```bash
# Initial schema
mysql < database/schema.sql

# Apply migrations
mysql < database/migration_add_user_role.sql
mysql < database/migration_add_accesscode_columns.sql
mysql < database/migration_add_email_notifications_preference.sql
mysql < database/migration_add_profile_fields.sql
mysql < database/migration_add_message_attachment.sql
mysql < database/migration_add_reels.sql
```

Create admin user:
```bash
node create_admin.js
```

## API Documentation

The application uses a RESTful API with Base44 integration. Key API modules:
- `src/api/base44Client.js` - Base44 API client
- `src/api/entities.js` - Entity definitions
- `src/api/integrations.js` - Third-party integrations

## Environment Configuration

Key environment variables:
- `VITE_API_BASE_URL` - Backend API URL
- `STRIPE_PUBLIC_KEY` - Stripe public key
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Secret for JWT token signing

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Troubleshooting

### Database connection issues
- Verify DATABASE_URL is correct
- Check database server is running
- Run `npm run test-db` to test connection

### Video call issues
- Ensure WebSocket connections are enabled
- Check firewall/NAT settings
- Verify ICE server configuration

### Payment integration issues
- Verify Stripe keys are correct
- Check webhook URL configuration
- Test with Stripe test keys first

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For support, email support@popup-play.com or open an issue on GitHub.

---

**Built with ❤️ by the Pop-Up Play team**
