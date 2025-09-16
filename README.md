# Silver Surfers Backend

This is the backend service for Silver Surfers.

## Prerequisites
- Node.js 18+
- MongoDB connection string
- Stripe Secret Key
- SMTP credentials for email

## Environment
Create a `.env` in the backend root with values similar to:

```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-strong-secret
STRIPE_SECRET_KEY=sk_live_or_test
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:5000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Run
```
npm install
npm start
```

## Routes
- POST `/start-audit` queue a full audit
- POST `/create-checkout-session` (auth required) create Stripe Checkout
- GET `/confirm-payment` confirm Stripe payment and queue audit
- POST `/cleanup` cleanup a report folder
- Auth under `/auth` (register, login, verify, resend)
