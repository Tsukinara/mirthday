# Matt's Mirthday Mystery

An interactive mystery game application for tracking tasks, objectives, and player progress.

## Project Structure

- `backend/` - Express.js API server with Prisma ORM
- `frontend/` - React + TypeScript application

## Setup

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma migrate deploy
```

4. Create a `.env` file:
```env
DATABASE_URL="file:./prisma/dev.db"
PORT=5000
```

5. Start the server:
```bash
npm run dev
```

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Features

- Task assignment and tracking
- Objective progress monitoring
- Real-time activity feed via Server-Sent Events
- Player leaderboard
- Voting system
- Admin dashboard

## Deployment

See deployment documentation for hosting options (Railway, Render, etc.)

