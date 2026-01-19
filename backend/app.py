from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import jwt
from functools import wraps
from datetime import datetime, timedelta
import json
import threading

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Supabase URL and Service Role Key must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Import Prop Firm service
from prop_firm_service import get_prop_firm_evaluator
# Import scheduler
from scheduler import get_scheduler, start_background_scheduler

def authenticate_user(f):
    """Decorator to authenticate user from JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
            
        try:
            token = auth_header.replace('Bearer ', '')
            
            # Verify token using Supabase
            user = supabase.auth.get_user(token)
            request.current_user = user.user
            
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return jsonify({'error': 'Unauthorized'}), 401
            
        return f(*args, **kwargs)
    
    return decorated_function

def check_challenge_status_internal(challenge_id):
    """Internal function to check challenge status"""
    try:
        # Get the challenge
        challenge_response = (
            supabase.table('user_challenges')
            .select('*')
            .eq('id', challenge_id)
            .single()
        )
        
        if challenge_response.error or not challenge_response.data:
            print(f'Challenge not found in check_challenge_status: {challenge_response.error}')
            return {'error': 'Challenge not found', 'status': 'error'}
        
        challenge = challenge_response.data
        
        # Calculate percentages
        profit_percentage = ((challenge['current_balance'] - challenge['initial_capital']) / challenge['initial_capital']) * 100
        loss_percentage = ((challenge['initial_capital'] - challenge['current_balance']) / challenge['initial_capital']) * 100
        daily_loss_percentage = abs(((challenge['initial_capital'] + challenge['daily_pnl']) - challenge['initial_capital']) / challenge['initial_capital']) * 100
        total_loss_percentage = abs(loss_percentage)
        
        # Determine status
        new_status = 'active'
        
        if profit_percentage >= challenge['profit_target_percent']:
            new_status = 'success'
        elif total_loss_percentage >= challenge['max_total_loss_percent']:
            new_status = 'failed'
        elif daily_loss_percentage >= challenge['max_daily_loss_percent']:
            new_status = 'failed'
        
        # If status changed, update the challenge
        if new_status != challenge['status']:
            update_response = (
                supabase.table('user_challenges')
                .update({
                    'status': new_status,
                    'ended_at': datetime.utcnow().isoformat() if new_status in ['success', 'failed'] else None
                })
                .eq('id', challenge_id)
                .execute()
            )
            
            if update_response.error:
                print(f'Failed to update challenge status: {update_response.error}')
        
        return {
            'status': new_status,
            'profit_percentage': profit_percentage,
            'loss_percentage': loss_percentage,
            'daily_loss_percentage': daily_loss_percentage,
            'total_loss_percentage': total_loss_percentage,
            'challenge_data': challenge
        }
    
    except Exception as e:
        print(f'Error in check_challenge_status_internal: {e}')
        return {'error': str(e), 'status': 'error'}


@app.route('/')
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "Backend is running", "timestamp": datetime.now().isoformat()})

@app.route('/evaluate-trade', methods=['POST'])
@authenticate_user
def evaluate_trade():
    """Evaluate a trade and update PnL with Prop Firm rules"""
    """Evaluate a trade and update PnL"""
    try:
        data = request.get_json()
        trade_id = data.get('trade_id')
        exit_price = data.get('exit_price')
        
        if not trade_id or exit_price is None:
            return jsonify({'error': 'trade_id and exit_price are required'}), 400
        
        user = request.current_user
        print(f'Evaluating trade {trade_id} with exit price {exit_price} for user {user.id}')
        
        # Get the trade
        trade_response = (
            supabase.table('trades')
            .select('*')
            .eq('id', trade_id)
            .eq('user_id', user.id)
            .eq('is_open', True)
            .maybe_single()
        )
        
        if trade_response.error or not trade_response.data:
            print(f'Trade not found or already closed: {trade_response.error}')
            return jsonify({'error': 'Trade not found or already closed'}), 404
        
        trade = trade_response.data
        
        # Calculate PnL
        price_change = exit_price - trade['entry_price']
        direction = 1 if trade['trade_type'] == 'buy' else -1
        pnl = (price_change / trade['entry_price']) * trade['amount'] * trade['leverage'] * direction
        
        print(f'Calculated PnL: {pnl} for trade type: {trade["trade_type"]}')
        
        # Update trade with exit price and PnL
        update_trade_response = (
            supabase.table('trades')
            .update({
                'exit_price': exit_price,
                'pnl': pnl,
                'is_open': False,
                'closed_at': datetime.utcnow().isoformat(),
            })
            .eq('id', trade_id)
            .execute()
        )
        
        if update_trade_response.error:
            print(f'Failed to update trade: {update_trade_response.error}')
            return jsonify({'error': 'Failed to update trade'}), 500
        
        # Get the challenge
        challenge_response = (
            supabase.table('user_challenges')
            .select('*')
            .eq('id', trade['challenge_id'])
            .single()
        )
        
        if challenge_response.error or not challenge_response.data:
            print(f'Challenge not found: {challenge_response.error}')
            return jsonify({'error': 'Challenge not found'}), 404
        
        challenge = challenge_response.data
        
        # Update challenge balances
        new_balance = challenge['current_balance'] + pnl
        new_total_pnl = challenge['total_pnl'] + pnl
        new_daily_pnl = challenge['daily_pnl'] + pnl
        
        print(f'Updating challenge: balance {challenge["current_balance"]} -> {new_balance}, total PnL: {new_total_pnl}')
        
        update_challenge_response = (
            supabase.table('user_challenges')
            .update({
                'current_balance': new_balance,
                'total_pnl': new_total_pnl,
                'daily_pnl': new_daily_pnl,
            })
            .eq('id', trade['challenge_id'])
            .execute()
        )
        
        if update_challenge_response.error:
            print(f'Failed to update challenge: {update_challenge_response.error}')
            return jsonify({'error': 'Failed to update challenge'}), 500
        
        # Check challenge status using Prop Firm rules
        prop_firm_evaluator = get_prop_firm_evaluator(supabase)
        check_response = prop_firm_evaluator.process_trade_completion(trade_id, user.id)
        
        print('Challenge status check result:', check_response)
        
        return jsonify({
            'success': True,
            'trade': {
                'id': trade_id,
                'pnl': pnl,
                'exit_price': exit_price,
            },
            'challenge': {
                'id': trade['challenge_id'],
                'new_balance': new_balance,
                'total_pnl': new_total_pnl,
                'status': check_response.get('status', 'active'),
            },
        })

    except Exception as e:
        print(f'Error in evaluate-trade function: {e}')
        return jsonify({'error': str(e)}), 500

# PayPal Integration Functions
import base64

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")

PAYPAL_API_SANDBOX = "https://api-m.sandbox.paypal.com"
PAYPAL_API_LIVE = "https://api-m.paypal.com"

async def get_paypal_access_token(api_base_url):
    """Get PayPal access token"""
    auth = f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode('utf-8')
    encoded_auth = base64.b64encode(auth).decode('utf-8')
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{api_base_url}/v1/oauth2/token",
            headers={
                'Authorization': f'Basic {encoded_auth}',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data="grant_type=client_credentials"
        ) as response:
            data = await response.json()
            
            if response.status != 200:
                print(f"PayPal auth error: {response.status}, {data}")
                raise Exception(f"PayPal auth failed ({api_base_url}): {data.get('error', response.status)}")
            
            return data['access_token']

async def get_paypal_access_token_auto():
    """Automatically determine which PayPal environment to use"""
    try:
        access_token = await get_paypal_access_token(PAYPAL_API_SANDBOX)
        return access_token, PAYPAL_API_SANDBOX
    except Exception as e:
        print(f"Sandbox token failed, trying live... {str(e)}")
        
    access_token = await get_paypal_access_token(PAYPAL_API_LIVE)
    return access_token, PAYPAL_API_LIVE

@app.route('/create-paypal-order', methods=['POST'])
@authenticate_user
def create_paypal_order():
    """Create a PayPal order for payment"""
    try:
        if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
            print("Missing PayPal secrets")
            return jsonify({'error': 'Missing PayPal secrets'}), 500
        
        user = request.current_user
        data = request.get_json()
        plan_name = data.get('planName')
        amount = data.get('amount')
        currency = data.get('currency', 'USD')
        initial_capital = data.get('initialCapital')
        
        print(f"Creating PayPal order: {plan_name}, {amount}, {currency}, {user.id}, {initial_capital}")
        
        if not plan_name or not amount:
            return jsonify({'error': 'Missing required fields: planName or amount'}), 400
        
        # Since Flask doesn't support async/await directly in route handlers, 
        # we'll simulate the PayPal API calls
        
        # Simulate PayPal order creation
        import uuid
        order_id = str(uuid.uuid4())
        
        # Record pending payment
        payment_response = (
            supabase.table('payments')
            .insert({
                'user_id': user.id,
                'amount': amount,
                'currency': currency,
                'payment_method': 'paypal',
                'status': 'pending',
                'transaction_id': order_id,
            })
            .execute()
        )
        
        if payment_response.error:
            print(f"Error creating payment record: {payment_response.error}")
        
        # In a real implementation, we would get the approval URL from PayPal
        approval_url = f"https://sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token={order_id}"
        
        return jsonify({
            'orderId': order_id,
            'approvalUrl': approval_url
        })
        
    except Exception as e:
        print(f'Error in create-paypal-order: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/capture-paypal-order', methods=['POST'])
@authenticate_user
def capture_paypal_order():
    """Capture PayPal order after payment completion"""
    try:
        user = request.current_user
        data = request.get_json()
        order_id = data.get('orderId')
        
        if not order_id:
            return jsonify({'error': 'orderId is required'}), 400
        
        print(f'Capturing PayPal order {order_id} for user {user.id}')
        
        # Get the pending payment record
        payment_response = (
            supabase.table('payments')
            .select('*')
            .eq('transaction_id', order_id)
            .eq('user_id', user.id)
            .single()
        )
        
        if payment_response.error or not payment_response.data:
            print(f'Payment not found: {payment_response.error}')
            return jsonify({'error': 'Payment not found'}), 404
        
        payment = payment_response.data
        
        # Update payment status to completed
        update_payment_response = (
            supabase.table('payments')
            .update({
                'status': 'completed',
            })
            .eq('transaction_id', order_id)
            .execute()
        )
        
        if update_payment_response.error:
            print(f'Failed to update payment: {update_payment_response.error}')
            return jsonify({'error': 'Failed to update payment'}), 500
        
        # For now, just return success
        return jsonify({
            'success': True,
            'payment': {
                'id': payment['id'] if payment else None,
                'status': 'completed',
            },
        })
        
    except Exception as e:
        print(f'Error in capture-paypal-order: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/check-challenge-status', methods=['POST'])
@authenticate_user
def check_challenge_status():
    """Check the status of a challenge"""
    try:
        user = request.current_user
        data = request.get_json()
        challenge_id = data.get('challenge_id')
        
        if not challenge_id:
            return jsonify({'error': 'challenge_id is required'}), 400
        
        print(f'Checking challenge status for challenge {challenge_id} and user {user.id}')
        
        result = check_challenge_status_internal(challenge_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        print(f'Error in check-challenge-status: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/reset-daily-pnl', methods=['POST'])
@authenticate_user
def reset_daily_pnl():
    """Reset daily PnL for active challenges"""
    try:
        user = request.current_user
        print(f'Resetting daily PnL for user {user.id}')
        
        # Get all active challenges for the user
        challenges_response = (
            supabase.table('user_challenges')
            .select('*')
            .eq('user_id', user.id)
            .in_('status', ['active', 'pending'])
            .execute()
        )
        
        if challenges_response.error:
            print(f'Error fetching challenges: {challenges_response.error}')
            return jsonify({'error': 'Failed to fetch challenges'}), 500
        
        updated_challenges = []
        
        for challenge in challenges_response.data:
            # Reset daily PnL to 0
            update_response = (
                supabase.table('user_challenges')
                .update({
                    'daily_pnl': 0,
                })
                .eq('id', challenge['id'])
                .execute()
            )
            
            if update_response.error:
                print(f'Error updating challenge {challenge["id"]}: {update_response.error}')
            else:
                updated_challenges.append(challenge['id'])
        
        return jsonify({
            'success': True,
            'message': f'Daily PnL reset for {len(updated_challenges)} challenges',
            'updated_challenges': updated_challenges,
        })
        
    except Exception as e:
        print(f'Error in reset-daily-pnl: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/create-challenge', methods=['POST'])
@authenticate_user
def create_prop_firm_challenge():
    """Create a new Prop Firm challenge for the authenticated user"""
    try:
        user = request.current_user
        data = request.get_json()
        initial_balance = data.get('initial_balance')
        
        # Get Prop Firm evaluator
        prop_firm_evaluator = get_prop_firm_evaluator(supabase)
        
        # Create new challenge
        challenge_result = prop_firm_evaluator.create_new_challenge(
            user_id=user.id,
            initial_balance=initial_balance
        )
        
        if 'error' in challenge_result:
            return jsonify(challenge_result), 400
        
        return jsonify({
            'success': True,
            'challenge': challenge_result,
            'message': f'Prop Firm challenge created with ${challenge_result["initial_capital"]:,.2f} starting balance'
        })
        
    except Exception as e:
        print(f'Error creating Prop Firm challenge: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/challenge/<challenge_id>/status', methods=['GET'])
@authenticate_user
def get_prop_firm_challenge_status(challenge_id):
    """Get detailed status of a Prop Firm challenge"""
    try:
        user = request.current_user
        
        # Verify user owns this challenge
        challenge_check = supabase.table('user_challenges') \
            .select('*') \
            .eq('id', challenge_id) \
            .eq('user_id', user.id) \
            .single() \
            .execute()
        
        if challenge_check.error:
            return jsonify({'error': 'Challenge not found or unauthorized'}), 404
        
        # Get detailed summary
        prop_firm_evaluator = get_prop_firm_evaluator(supabase)
        summary = prop_firm_evaluator.get_challenge_summary(challenge_id)
        
        if 'error' in summary:
            return jsonify(summary), 400
        
        return jsonify(summary)
        
    except Exception as e:
        print(f'Error getting challenge status: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/challenge/<challenge_id>/evaluate', methods=['POST'])
@authenticate_user
def evaluate_prop_firm_challenge(challenge_id):
    """Force evaluation of Prop Firm challenge rules"""
    try:
        user = request.current_user
        
        # Verify user owns this challenge
        challenge_check = supabase.table('user_challenges') \
            .select('*') \
            .eq('id', challenge_id) \
            .eq('user_id', user.id) \
            .single() \
            .execute()
        
        if challenge_check.error:
            return jsonify({'error': 'Challenge not found or unauthorized'}), 404
        
        # Evaluate challenge rules
        prop_firm_evaluator = get_prop_firm_evaluator(supabase)
        evaluation_result = prop_firm_evaluator.evaluate_challenge_rules(challenge_id)
        
        if 'error' in evaluation_result:
            return jsonify(evaluation_result), 400
        
        return jsonify({
            'success': True,
            'evaluation': evaluation_result
        })
        
    except Exception as e:
        print(f'Error evaluating challenge: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/scheduler/start', methods=['POST'])
def start_scheduler_endpoint():
    """Start the background scheduler (admin endpoint)"""
    try:
        scheduler = get_scheduler()
        if hasattr(scheduler, 'running') and scheduler.running:
            return jsonify({'message': 'Scheduler is already running'}), 200
        
        scheduler.run_in_background()
        return jsonify({'success': True, 'message': 'Scheduler started successfully'})
        
    except Exception as e:
        print(f'Error starting scheduler: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/scheduler/status', methods=['GET'])
def get_scheduler_status():
    """Get scheduler status"""
    try:
        scheduler = get_scheduler()
        return jsonify({
            'running': getattr(scheduler, 'running', False),
            'thread_alive': getattr(scheduler, 'scheduler_thread', None) is not None and \
                           scheduler.scheduler_thread.is_alive() if hasattr(scheduler, 'scheduler_thread') else False
        })
        
    except Exception as e:
        print(f'Error getting scheduler status: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/prop-firm/reset-daily-metrics', methods=['POST'])
@authenticate_user
def reset_daily_metrics():
    """Reset daily metrics for all active challenges (admin endpoint)"""
    try:
        # This could be restricted to admin users only
        user = request.current_user
        
        prop_firm_evaluator = get_prop_firm_evaluator(supabase)
        reset_result = prop_firm_evaluator.reset_daily_metrics()
        
        if 'error' in reset_result:
            return jsonify(reset_result), 400
        
        return jsonify({
            'success': True,
            'result': reset_result
        })
        
    except Exception as e:
        print(f'Error resetting daily metrics: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/scrape-morocco-stocks', methods=['GET'])
def scrape_morocco_stocks():
    """Scrape Morocco stock prices"""
    try:
        # This is a placeholder implementation
        # In a real application, you would scrape actual market data
        # from a financial data provider or exchange website
        
        # For demonstration purposes, return sample data
        morocco_stocks_data = [
            {
                'symbol': 'MNG',
                'name': 'Managem',
                'price': 850.50,
                'change': 2.5,
                'changePercent': 0.30,
                'volume': 125000,
                'timestamp': datetime.utcnow().isoformat()
            },
            {
                'symbol': 'IAM',
                'name': 'Itissalat Al-Maghrib',
                'price': 62.80,
                'change': -0.20,
                'changePercent': -0.32,
                'volume': 340000,
                'timestamp': datetime.utcnow().isoformat()
            },
            {
                'symbol': 'CIH',
                'name': 'Credit Immobilier et Hotelier',
                'price': 285.25,
                'change': 1.75,
                'changePercent': 0.62,
                'volume': 89000,
                'timestamp': datetime.utcnow().isoformat()
            }
        ]
        
        # Store the scraped data in the database (optional)
        # For now, we'll just return the data
        
        return jsonify({
            'success': True,
            'stocks': morocco_stocks_data,
            'lastUpdated': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f'Error in scrape-morocco-stocks: {e}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Prop Firm Trading Backend')
    parser.add_argument('--with-scheduler', action='store_true', 
                       help='Start background scheduler with the Flask app')
    
    args = parser.parse_args()
    
    if args.with_scheduler:
        print("Starting Flask app with background scheduler...")
        # Start scheduler in background thread
        scheduler_thread = threading.Thread(
            target=start_background_scheduler,
            daemon=True,
            name="BackgroundScheduler"
        )
        scheduler_thread.start()
        print("Background scheduler started")
    
    app.run(debug=True, host='0.0.0.0', port=5000)