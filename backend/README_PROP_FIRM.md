# Prop Firm Challenge Service

## Overview

This service implements the core Prop Firm challenge tracking system with automated rule enforcement for trading performance monitoring.

## Core Features

### Challenge Rules Implementation
- **Starting Balance**: $5,000 virtual capital
- **Daily Loss Limit**: 5% maximum drawdown per day
- **Total Loss Limit**: 10% maximum total drawdown
- **Profit Target**: 10% profit objective
- **Background Evaluation**: Automatic rule checking after each trade

### Key Components

#### 1. Prop Firm Service (`prop_firm_service.py`)
Main business logic for challenge evaluation:
- `PropFirmChallengeEvaluator` class
- Challenge creation and management
- Rule evaluation engine
- Trade impact processing
- Comprehensive metrics calculation

#### 2. Background Scheduler (`scheduler.py`)
Automated challenge monitoring:
- Periodic evaluation of active challenges (every 5 minutes)
- Daily metric resets at midnight UTC
- System heartbeat monitoring
- Multi-threaded background execution

#### 3. Flask API Endpoints (`app.py`)
RESTful interface for challenge management:
- `/prop-firm/create-challenge` - Create new challenges
- `/prop-firm/challenge/<id>/status` - Get detailed challenge status
- `/prop-firm/challenge/<id>/evaluate` - Force rule evaluation
- `/prop-firm/scheduler/*` - Scheduler control endpoints

## API Endpoints

### Challenge Management

**Create Challenge**
```
POST /prop-firm/create-challenge
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "initial_balance": 5000.0
}
```

**Get Challenge Status**
```
GET /prop-firm/challenge/{challenge_id}/status
Authorization: Bearer <JWT_TOKEN>
```

**Evaluate Challenge Rules**
```
POST /prop-firm/challenge/{challenge_id}/evaluate
Authorization: Bearer <JWT_TOKEN>
```

### Scheduler Control

**Start Background Scheduler**
```
POST /prop-firm/scheduler/start
```

**Get Scheduler Status**
```
GET /prop-firm/scheduler/status
```

## Running the Service

### Basic Flask Server
```bash
cd backend
python app.py
```

### With Background Scheduler
```bash
cd backend
python app.py --with-scheduler
```

### Standalone Scheduler
```bash
cd backend
python scheduler.py
```

## Testing

Run the test suite:
```bash
cd backend
python test_prop_firm.py
```

## Database Schema Requirements

The service expects the following Supabase tables:

### `user_challenges` table
```sql
CREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  initial_capital DECIMAL(10,2),
  current_balance DECIMAL(10,2),
  total_pnl DECIMAL(10,2),
  daily_pnl DECIMAL(10,2),
  status VARCHAR(20), -- 'active', 'success', 'failed'
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  max_daily_loss_percent DECIMAL(5,2),
  max_total_loss_percent DECIMAL(5,2),
  profit_target_percent DECIMAL(5,2),
  daily_reset_time TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  success_reason TEXT
);
```

### `trades` table
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  challenge_id UUID REFERENCES user_challenges(id),
  asset_symbol VARCHAR(10),
  trade_type VARCHAR(10), -- 'buy', 'sell'
  entry_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  amount DECIMAL(10,2),
  leverage DECIMAL(5,2),
  pnl DECIMAL(10,2),
  is_open BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);
```

## Environment Variables

Create a `.env` file in the backend directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

## Rule Enforcement Logic

### Daily Loss Rule (5%)
- Triggers when daily PnL drops below -5% of initial capital
- Resets daily at midnight UTC
- Challenge fails immediately when triggered

### Total Loss Rule (10%)
- Triggers when current balance drops below 90% of initial capital
- Cumulative across all trading days
- Challenge fails immediately when triggered

### Profit Target Rule (10%)
- Triggers when current balance reaches 110% of initial capital
- Challenge succeeds and completes
- User achieves funding objective

## Monitoring and Logging

The service provides comprehensive logging:
- Challenge creation events
- Trade processing results
- Rule evaluation outcomes
- Scheduler status updates
- Error conditions and exceptions

## Performance Considerations

- Background evaluations run every 5 minutes for active challenges
- Daily resets occur automatically at midnight UTC
- Thread-safe implementation using proper locking
- Efficient database queries with indexing recommendations

## Security

- JWT token authentication required for user endpoints
- Challenge ownership verification
- Input validation and sanitization
- Rate limiting considerations for production deployment

## Future Enhancements

- Real-time WebSocket notifications for challenge status changes
- Advanced analytics and reporting dashboards
- Customizable challenge parameters
- Multi-user competition features
- Risk management integration with trading algorithms