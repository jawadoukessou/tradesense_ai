# TradeSense AI - Trading Platform

## Project Overview

TradeSense AI is a comprehensive trading platform that enables users to participate in trading challenges, monitor market data, and evaluate their trading performance. The platform has been recently migrated from a TypeScript Supabase Edge Functions backend to a Python Flask backend for enhanced flexibility and maintainability.

## Architecture

The application follows a modern architecture:

- **Frontend**: React, TypeScript, Vite with shadcn/ui components
- **Backend**: Python Flask (migrated from Supabase Edge Functions)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth
- **Payments**: PayPal integration

## Migration Details

The backend has been successfully migrated from TypeScript Supabase Edge Functions to Python Flask. Key features that were migrated include:

1. Trade evaluation and PnL calculation
2. PayPal payment processing
3. Challenge status management
4. Daily PnL reset functionality
5. Market data scraping

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.8+
- Access to Supabase project

### Frontend Setup

1. Install dependencies:
```sh
npm install
```

2. Start the development server:
```sh
npm run dev
```

### Backend Setup

1. Navigate to the backend directory:
```sh
cd backend
```

2. Install Python dependencies:
```sh
pip install -r requirements.txt
```

3. Set up environment variables in `.env` file
4. Run the Flask application:
```sh
python app.py
```

## How can I edit this code?

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Deployment

The frontend can be deployed using standard React hosting platforms. The Flask backend needs to be deployed to a Python-compatible hosting service (Heroku, PythonAnywhere, AWS, etc.).

## Custom Domain

Yes, you can connect a custom domain to your project.

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
