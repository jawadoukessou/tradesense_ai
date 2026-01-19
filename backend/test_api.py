import requests
import json
from datetime import datetime

# Test the Flask backend API endpoints

BASE_URL = "http://localhost:5000"

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_scrape_morocco_stocks():
    """Test the stock scraping endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/scrape-morocco-stocks")
        print(f"Stock scraping: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Stock scraping failed: {e}")
        return False

def main():
    print("Testing Flask Backend API Endpoints...")
    print("="*50)
    
    # Test health check
    print("\n1. Testing Health Check...")
    health_ok = test_health_check()
    
    # Test stock scraping
    print("\n2. Testing Stock Scraping...")
    stocks_ok = test_scrape_morocco_stocks()
    
    print("\n" + "="*50)
    print(f"Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"Stock Scraping: {'PASS' if stocks_ok else 'FAIL'}")
    
    if health_ok and stocks_ok:
        print("\nBasic API tests passed!")
        print("Note: Authentication-requiring endpoints need valid tokens to test.")
    else:
        print("\nSome tests failed. Please check the Flask backend.")

if __name__ == "__main__":
    main()