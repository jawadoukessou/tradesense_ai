"""
Background Task Scheduler for Prop Firm Challenges

Runs periodic evaluations of active challenges to ensure compliance with Prop Firm rules.
This can be run as a separate process or integrated into the main Flask app.
"""

import schedule
import time
import threading
from datetime import datetime
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from prop_firm_service import get_prop_firm_evaluator
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class PropFirmBackgroundScheduler:
    """Scheduler for background Prop Firm challenge evaluations"""
    
    def __init__(self):
        # Initialize Supabase client
        self.SUPABASE_URL = os.getenv("SUPABASE_URL")
        self.SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.SUPABASE_URL or not self.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Supabase credentials not found in environment variables")
        
        self.supabase: Client = create_client(self.SUPABASE_URL, self.SUPABASE_SERVICE_ROLE_KEY)
        self.prop_firm_evaluator = get_prop_firm_evaluator(self.supabase)
        
        # Scheduling intervals (in minutes)
        self.EVALUATION_INTERVAL = 5  # Check active challenges every 5 minutes
        self.DAILY_RESET_HOUR = 0     # Reset daily metrics at midnight UTC
        self.HEARTBEAT_INTERVAL = 30  # Log heartbeat every 30 minutes
        
        self.running = False
        self.scheduler_thread = None
    
    def evaluate_active_challenges(self):
        """Evaluate all active Prop Firm challenges"""
        try:
            logger.info("Starting evaluation of active challenges...")
            
            # Get all active challenges
            response = self.supabase.table('user_challenges') \
                .select('id, user_id, status') \
                .in_('status', ['active']) \
                .execute()
            
            if response.error:
                logger.error(f"Failed to fetch active challenges: {response.error}")
                return
            
            active_challenges = response.data
            logger.info(f"Found {len(active_challenges)} active challenges to evaluate")
            
            evaluation_results = {
                'total_evaluated': len(active_challenges),
                'successes': 0,
                'failures': 0,
                'unchanged': 0,
                'errors': 0
            }
            
            # Evaluate each challenge
            for challenge in active_challenges:
                try:
                    result = self.prop_firm_evaluator.evaluate_challenge_rules(challenge['id'])
                    
                    if 'error' in result:
                        logger.error(f"Error evaluating challenge {challenge['id']}: {result['error']}")
                        evaluation_results['errors'] += 1
                    else:
                        status = result.get('status', 'unknown')
                        if status in ['success', 'failed']:
                            logger.info(f"Challenge {challenge['id']} status changed to: {status}")
                            if status == 'success':
                                evaluation_results['successes'] += 1
                            else:
                                evaluation_results['failures'] += 1
                        else:
                            evaluation_results['unchanged'] += 1
                            
                except Exception as e:
                    logger.error(f"Exception evaluating challenge {challenge['id']}: {str(e)}")
                    evaluation_results['errors'] += 1
            
            logger.info(f"Evaluation complete - "
                       f"Successes: {evaluation_results['successes']}, "
                       f"Failures: {evaluation_results['failures']}, "
                       f"Errors: {evaluation_results['errors']}")
            
        except Exception as e:
            logger.error(f"Error in evaluate_active_challenges: {str(e)}")
    
    def daily_reset_job(self):
        """Perform daily reset of metrics"""
        try:
            logger.info("Performing daily metrics reset...")
            result = self.prop_firm_evaluator.reset_daily_metrics()
            
            if 'error' in result:
                logger.error(f"Daily reset failed: {result['error']}")
            else:
                logger.info(f"Daily reset completed: {result['reset_count']} challenges reset")
                
        except Exception as e:
            logger.error(f"Error in daily_reset_job: {str(e)}")
    
    def heartbeat(self):
        """Log system heartbeat"""
        logger.info(f"Prop Firm Background Scheduler is running - "
                   f"Active challenges monitoring every {self.EVALUATION_INTERVAL} minutes")
    
    def start_scheduler(self):
        """Start the background scheduler"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
        
        logger.info("Starting Prop Firm Background Scheduler...")
        
        # Schedule jobs
        schedule.every(self.EVALUATION_INTERVAL).minutes.do(self.evaluate_active_challenges)
        schedule.every().day.at(f"{self.DAILY_RESET_HOUR:02d}:00").do(self.daily_reset_job)
        schedule.every(self.HEARTBEAT_INTERVAL).minutes.do(self.heartbeat)
        
        # Run initial evaluation
        self.evaluate_active_challenges()
        self.heartbeat()
        
        self.running = True
        
        # Scheduler loop
        while self.running:
            schedule.run_pending()
            time.sleep(1)
        
        logger.info("Prop Firm Background Scheduler stopped")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        logger.info("Stopping Prop Firm Background Scheduler...")
        self.running = False
        
        # Clear all scheduled jobs
        schedule.clear()
    
    def run_in_background(self):
        """Run scheduler in a background thread"""
        if self.scheduler_thread and self.scheduler_thread.is_alive():
            logger.warning("Background scheduler thread is already running")
            return
        
        self.scheduler_thread = threading.Thread(
            target=self.start_scheduler,
            daemon=True,
            name="PropFirmScheduler"
        )
        self.scheduler_thread.start()
        logger.info("Background scheduler thread started")

# Global scheduler instance
scheduler_instance = None

def get_scheduler():
    """Get singleton scheduler instance"""
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = PropFirmBackgroundScheduler()
    return scheduler_instance

def start_background_scheduler():
    """Convenience function to start the scheduler"""
    scheduler = get_scheduler()
    scheduler.run_in_background()
    return scheduler

# For standalone execution
if __name__ == "__main__":
    print("Starting Prop Firm Background Scheduler...")
    print("Press Ctrl+C to stop")
    
    try:
        scheduler = get_scheduler()
        scheduler.start_scheduler()
    except KeyboardInterrupt:
        print("\nReceived interrupt signal, shutting down...")
        if scheduler_instance:
            scheduler_instance.stop_scheduler()
        print("Scheduler stopped")