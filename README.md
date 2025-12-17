# Lbinag - Nano Banana Marbles

A server-side rendered e-commerce application for selling marbles, built with Express.js, Handlebars, and MongoDB.

## Features

- **Server-Side Rendering**: Express + Handlebars (hbs) templates
- **Magic Link Authentication**: Passwordless email login via Gmail SMTP
- **AI Chat Assistant**: Gemini-powered shopping assistant with conversation persistence
- **MongoDB Persistence**: Products, users, sessions, conversations
- **Search with Query Params**: Refresh-safe search (`/catalog?q=blue`)
- **Color-Based Filtering**: Browse marbles by color
- **Image Uploads**: Upload product images via admin panel
- **Admin Panel**: Create, edit, and delete products
- **Moroccan Dirham (Dh)**: All prices in local currency

## Tech Stack

- Node.js (ES Modules)
- Express.js
- express-handlebars
- MongoDB + Mongoose
- express-session + connect-mongo
- nodemailer (Gmail SMTP)
- multer (file uploads)
- dotenv

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/lbinag
SESSION_SECRET=your-secret-key-here

# Gmail SMTP (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Gemini API (Optional)
GEMINI_API_KEY=
```

### 3. Set Up Gmail SMTP

To send magic link emails, you need to configure Gmail:

1. Enable 2-Factor Authentication on your Google Account
2. Go to **Google Account → Security → App Passwords**
3. Generate a new app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

### 4. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string in MONGODB_URI
```

### 5. Run the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Visit http://localhost:3000

## Admin Panel

Access the admin panel at `/admin/products` to:

- View all products
- Add new products with image upload
- Edit existing products
- Delete products

### Product Colors

Products are organized by color:
- Red, Blue, Green, Yellow, Orange, Purple, Pink, White, Black, Multicolor

### Stock Management

- Set `Stock Count` when creating/editing products
- Products with 0 stock are automatically marked "Out of Stock"
- Out of stock products remain visible but cannot be purchased

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `BASE_URL` | No | http://localhost:3000 | Base URL for magic links |
| `MONGODB_URI` | Yes | - | MongoDB connection |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `GEMINI_API_KEY` | No | - | Gemini API key (optional) |
| `SMTP_HOST` | Yes | smtp.gmail.com | Gmail SMTP server |
| `SMTP_PORT` | Yes | 587 | SMTP port |
| `SMTP_USER` | Yes | - | Your Gmail address |
| `SMTP_PASS` | Yes | - | Gmail App Password |

## API Endpoints

### Pages (HTML)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Home page |
| GET | `/catalog` | Product catalog |
| GET | `/catalog?q=<search>` | Search products |
| GET | `/catalog/color/:color` | Filter by color |
| GET | `/catalog/:id` | Single product |
| GET | `/auth/login` | Login page |
| GET | `/auth/logout` | Logout |
| GET | `/admin/products` | Admin - product list |
| GET | `/admin/products/new` | Admin - add product |
| GET | `/admin/products/:id/edit` | Admin - edit product |

### API (JSON)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent` | Chat with AI assistant |
| GET | `/api/agent/history` | Get chat history |
| POST | `/api/agent/clear` | Clear chat history |
| GET | `/api/products/search` | Search products |

## Project Structure

```
├── server.js           # Main entry point
├── package.json        # Dependencies
├── models/             # Mongoose schemas
├── services/           # Business logic (Gemini, Mailer)
├── middleware/         # Express middleware
├── routes/             # Route handlers
│   ├── admin.js        # Product management routes
│   ├── catalog.js      # Product display routes
│   ├── auth.js         # Authentication routes
│   └── api.js          # JSON API routes
├── views/              # Handlebars templates
│   ├── layouts/        # Page layouts
│   ├── partials/       # Reusable components
│   └── admin/          # Admin panel views
└── public/             # Static assets
    ├── css/
    ├── js/
    ├── uploads/        # Uploaded product images
    └── logo.png
```

## Image Uploads

- Product images are stored in `public/uploads/`
- Accepted formats: JPEG, PNG, GIF, WebP
- Maximum file size: 5MB
- Images are served at `/uploads/filename.jpg`

## Currency

All prices are displayed in Moroccan Dirham (Dh).

## Troubleshooting

### Gmail SMTP Errors

- Ensure 2FA is enabled on your Google Account
- Use an App Password, not your regular password
- Check that SMTP_USER matches your Gmail address

### MongoDB Connection Failed

- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- For Atlas, ensure IP is whitelisted

### Products Not Showing

- Add products via Admin panel (`/admin/products`)
- Check MongoDB connection

### Image Upload Failed

- Ensure `public/uploads` directory exists
- Check file size (max 5MB)
- Verify file type is supported

## License

ISC
