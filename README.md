# Kisan App - Farmer & Government Portal

A full-stack web application connecting farmers with government services for crop management, harvest prediction, and straw selling.

## Features

### For Farmers
- **Registration & Login**: Register with Aadhar/PAN verification, login with email and password
- **Farm Management**: Register multiple farms with location, soil type, and irrigation details
- **Crop Tracking**: Add and track crops with sowing dates and expected harvest
- **Straw Selling**: Book appointments to sell crop straw to the government
- **Bank Details**: Link bank account for receiving payments
- **Dashboard**: Overview of farms, crops, and appointments

### For Government Officers
- View and manage straw collection appointments
- Approve/reject farmer requests
- Process payments
- View statistics

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
kisan-app/
├── backend/
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── models/
│   │   ├── User.js         # User model
│   │   ├── Farm.js         # Farm model
│   │   └── Appointment.js  # Appointment model
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── farm.js         # Farm routes
│   │   └── appointment.js  # Appointment routes
│   ├── .env                # Environment variables
│   ├── package.json
│   └── server.js           # Express server
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── DashboardLayout.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── login.js
    │   │   │   └── register.js
    │   │   ├── dashboard/
    │   │   │   ├── index.js
    │   │   │   ├── profile.js
    │   │   │   ├── bank-details.js
    │   │   │   ├── farms/
    │   │   │   │   ├── index.js
    │   │   │   │   └── new.js
    │   │   │   └── appointments/
    │   │   │       ├── index.js
    │   │   │       └── new.js
    │   │   ├── _app.js
    │   │   └── index.js    # Landing page
    │   ├── styles/
    │   │   └── globals.css
    │   └── utils/
    │       └── api.js      # API utilities
    ├── .env.local
    ├── package.json
    ├── tailwind.config.js
    └── next.config.js
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd kisan-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/kisan-app
   JWT_SECRET=your_secret_key_here
   PORT=5000
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd kisan-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/bank-details` - Update bank details

### Farms
- `GET /api/farms` - Get all farms
- `POST /api/farms` - Create new farm
- `GET /api/farms/:id` - Get farm by ID
- `PUT /api/farms/:id` - Update farm
- `DELETE /api/farms/:id` - Delete farm
- `POST /api/farms/:id/crops` - Add crop to farm
- `PUT /api/farms/:farmId/crops/:cropId` - Update crop

### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Book new appointment
- `GET /api/appointments/:id` - Get appointment by ID
- `PUT /api/appointments/:id/cancel` - Cancel appointment

## Future Enhancements (API Integration Ready)

The app is designed to integrate with:
- **Weather API**: For local weather forecasts and farming recommendations
- **Google Maps API**: For farm location mapping and coordinates
- **Gemini AI**: For crop harvest date predictions based on weather and soil data

## License

MIT License
