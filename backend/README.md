# TradeSense AI Flask Backend

This is the Flask-based backend for the TradeSense AI trading platform, migrated from the original Supabase Edge Functions (TypeScript).

## Overview

The Flask backend replaces the Supabase Edge Functions that were previously handling the business logic. This migration allows for more flexibility in backend development and easier maintenance.

## Features Implemented

1. **Trade Evaluation** (`/evaluate-trade`) - Evaluates trades and updates PnL
2. **PayPal Integration** (`/create-paypal-order`, `/capture-paypal-order`) - Handles payment processing
3. **Challenge Status** (`/check-challenge-status`) - Checks and updates challenge status
4. **Daily PnL Reset** (`/reset-daily-pnl`) - Resets daily profit/loss calculations
5. **Stock Scraping** (`/scrape-morocco-stocks`) - Fetches Morocco stock market data
6. **Health Check** (`/`) - Basic health check endpoint

## Setup Instructions

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env` file:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
SECRET_KEY=your_secret_key
```

3. Run the Flask application:
```bash
python app.py
```

The backend will be available at `http://localhost:5000`

## Frontend Integration

The frontend has been updated to call the Flask backend endpoints instead of Supabase Edge Functions. API calls are made through the new API utility file which handles authentication and communication with the Flask backend.

## Architecture Notes

- The Flask backend continues to use Supabase for database operations and authentication
- All existing database schemas and RLS policies remain unchanged
- Authentication is handled via Supabase JWT tokens passed in the Authorization header
- The frontend maintains its React/Vite/TypeScript structure with only backend API calls modified