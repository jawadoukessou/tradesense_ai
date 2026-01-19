"""
Test script for Prop Firm Challenge Service

This script demonstrates how to use the Prop Firm service to:
1. Create challenges
2. Process trades
3. Evaluate challenge rules
4. Monitor challenge status
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
TEST_USER_TOKEN = "your-jwt-token-here"  # Replace with actual JWT token

def create_test_challenge():
    """Create a new Prop Firm challenge"""
    url = f"{BASE_URL}/prop-firm/create-challenge"
    headers = {
        "Authorization": f"Bearer {TEST_USER_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "initial_balance": 5000.0  # $5,000 starting balance
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"Create Challenge Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json().get('challenge', {}).get('id')

def simulate_trade(challenge_id, pnl_amount):
    """Simulate a completed trade affecting the challenge"""
    # This would typically be called after a real trade is completed
    # For testing, we'll directly update the challenge balance
    
    # Note: In a real implementation, you'd call the evaluate-trade endpoint
    # after closing a trade position
    
    print(f"Simulating trade with PnL: ${pnl_amount}")

def get_challenge_status(challenge_id):
    """Get detailed challenge status"""
    url = f"{BASE_URL}/prop-firm/challenge/{challenge_id}/status"
    headers = {
        "Authorization": f"Bearer {TEST_USER_TOKEN}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Challenge Status Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def evaluate_challenge(challenge_id):
    """Force evaluation of challenge rules"""
    url = f"{BASE_URL}/prop-firm/challenge/{challenge_id}/evaluate"
    headers = {
        "Authorization": f"Bearer {TEST_USER_TOKEN}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers)
    print(f"Evaluate Challenge Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def main():
    print("=" * 50)
    print("Prop Firm Challenge Service Test")
    print("=" * 50)
    
    # Create a new challenge
    print("\n1. Creating new Prop Firm challenge...")
    challenge_id = create_test_challenge()
    
    if not challenge_id:
        print("Failed to create challenge")
        return
    
    print(f"Created challenge ID: {challenge_id}")
    
    # Get initial status
    print("\n2. Getting initial challenge status...")
    get_challenge_status(challenge_id)
    
    # Simulate some trades
    print("\n3. Simulating trades...")
    
    # Simulate winning trades
    test_scenarios = [
        {"pnl": 250.0, "description": "Small win"},
        {"pnl": -150.0, "description": "Small loss"},
        {"pnl": 300.0, "description": "Medium win"},
        {"pnl": -400.0, "description": "Larger loss -接近每日限制"},
        {"pnl": 100.0, "description": "Small win"},
        {"pnl": -300.0, "description": "Loss triggering daily limit"},
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n--- Trade {i}: {scenario['description']} ---")
        print(f"PnL: ${scenario['pnl']}")
        
        # Evaluate challenge after each trade
        result = evaluate_challenge(challenge_id)
        
        if result.get('success'):
            evaluation = result.get('evaluation', {})
            status = evaluation.get('status')
            metrics = evaluation.get('metrics', {})
            
            print(f"Challenge Status: {status}")
            print(f"Current Balance: ${metrics.get('current_balance', 0):,.2f}")
            print(f"Profit %: {metrics.get('profit_percentage', 0):+.2f}%")
            print(f"Daily Loss %: {metrics.get('daily_loss_percentage', 0):.2f}%")
            print(f"Total Loss %: {metrics.get('total_loss_percentage', 0):.2f}%")
            
            # Check if challenge ended
            if status in ['success', 'failed']:
                print(f"🎉 Challenge {status.upper()}!")
                break
        else:
            print(f"Error: {result.get('error')}")
        
        time.sleep(1)  # Small delay between trades
    
    # Final status
    print("\n4. Final challenge status:")
    final_status = get_challenge_status(challenge_id)
    
    print("\n" + "=" * 50)
    print("Test Complete")
    print("=" * 50)

if __name__ == "__main__":
    main()