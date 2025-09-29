# Zuke Admin Dashboard

A web-based admin dashboard for managing Zuke businesses and creatives.

## Features

- **Authentication:** Auth0 integration for secure login.
- **Database:** MongoDB for data storage.
- **Frontend:** HTML, CSS, and vanilla JavaScript.
- **Backend:** Node.js/Express.

## Prerequisites

- [Node.js & npm](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Auth0 Account](https://auth0.com/)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Zuke-Admin-Dashboard.git
cd Zuke-Admin-Dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Auth0

- Copy `auth_config.json` to both the project root and `public/` directory.
- Fill in your Auth0 credentials:
  - `domain`
  - `clientId`
  - `audience` (if used)

Example `auth_config.json`:
```json
{
  "domain": "YOUR_AUTH0_DOMAIN",
  "clientId": "YOUR_AUTH0_CLIENT_ID",
  // "audience": "YOUR_AUTH0_API_AUDIENCE"
}
```

### 4. Configure MongoDB

- Update the MongoDB connection string in `lib/mongodb.js`:
  ```js
  const uri = "mongodb://localhost:27017/zuke"; // or your remote URI
  ```
- Make sure MongoDB is running locally or accessible remotely.

### 5. Start the Server

```bash
npm start
```
Or, for development with auto-reload:
```bash
npm run dev
```

### 6. Access the Dashboard

Open your browser and go to:
```
http://localhost:3000/public/dashboard.html
```

## Project Structure

```
api/              # Backend API routes
lib/              # Database connection (MongoDB)
public/           # Frontend files (HTML, CSS, JS)
server.js         # Main server entry point
auth_config.json  # Auth0 configuration
```

## Environment Variables (Optional)

You may use environment variables for sensitive data. Example using `.env`:

```
MONGODB_URI=mongodb://localhost:27017/zuke
AUTH0_DOMAIN=your-domain
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=your-audience
```
