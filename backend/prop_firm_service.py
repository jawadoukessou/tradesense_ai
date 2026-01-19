"""
Prop Firm Challenge Tracking Service

Implements the core Prop Firm rules:
- Starting balance: $5,000
- Daily loss limit: 5% 
- Total loss limit: 10%
- Profit target: 10%
- Background task evaluation after each trade
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from supabase import Client
import logging

logger = logging.getLogger(__name__)

class PropFirmChallengeEvaluator:
    """Service to evaluate Prop Firm challenge rules"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.STARTING_BALANCE = 5000.0
        self.DAILY_LOSS_LIMIT_PERCENT = 5.0
        self.TOTAL_LOSS_LIMIT_PERCENT = 10.0
        self.PROFIT_TARGET_PERCENT = 10.0
    
    def create_new_challenge(self, user_id: str, initial_balance: float = None) -> Dict:
        """
        Create a new Prop Firm challenge for a user
        
        Args:
            user_id: User UUID
            initial_balance: Starting balance (defaults to $5,000)
            
        Returns:
            Dictionary with challenge data
        """
        balance = initial_balance or self.STARTING_BALANCE
        
        challenge_data = {
            'user_id': user_id,
            'initial_capital': balance,
            'current_balance': balance,
            'total_pnl': 0.0,
            'daily_pnl': 0.0,
            'status': 'active',
            'started_at': datetime.utcnow().isoformat(),
            'max_daily_loss_percent': self.DAILY_LOSS_LIMIT_PERCENT,
            'max_total_loss_percent': self.TOTAL_LOSS_LIMIT_PERCENT,
            'profit_target_percent': self.PROFIT_TARGET_PERCENT,
            'daily_reset_time': datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        }
        
        try:
            response = self.supabase.table('user_challenges').insert(challenge_data).execute()
            
            if response.error:
                logger.error(f"Failed to create challenge: {response.error}")
                return {'error': str(response.error)}
            
            return response.data[0] if response.data else {'error': 'No data returned'}
            
        except Exception as e:
            logger.error(f"Error creating challenge: {str(e)}")
            return {'error': str(e)}
    
    def evaluate_challenge_rules(self, challenge_id: str) -> Dict:
        """
        Evaluate all Prop Firm rules for a challenge
        
        Args:
            challenge_id: Challenge UUID
            
        Returns:
            Dictionary with evaluation results and updated status
        """
        try:
            # Get challenge data
            challenge_response = self.supabase.table('user_challenges') \
                .select('*') \
                .eq('id', challenge_id) \
                .single() \
                .execute()
            
            if challenge_response.error:
                logger.error(f"Challenge not found: {challenge_response.error}")
                return {'error': 'Challenge not found'}
            
            challenge = challenge_response.data
            
            # Skip if already completed
            if challenge['status'] in ['success', 'failed']:
                return {
                    'status': challenge['status'],
                    'message': f'Challenge already {challenge["status"]}',
                    'challenge': challenge
                }
            
            # Calculate key metrics
            initial_capital = challenge['initial_capital']
            current_balance = challenge['current_balance']
            
            # Profit/Loss calculations
            absolute_pnl = current_balance - initial_capital
            profit_percentage = (absolute_pnl / initial_capital) * 100
            loss_percentage = abs(min(profit_percentage, 0))
            
            # Daily loss calculation
            daily_pnl = challenge['daily_pnl']
            daily_loss_percentage = abs(min((daily_pnl / initial_capital) * 100, 0))
            
            # Total loss calculation
            total_loss_percentage = abs(min(profit_percentage, 0))
            
            logger.info(f"Challenge {challenge_id} evaluation:")
            logger.info(f"  Balance: ${current_balance:,.2f}")
            logger.info(f"  PnL: ${absolute_pnl:,.2f} ({profit_percentage:+.2f}%)")
            logger.info(f"  Daily Loss: {daily_loss_percentage:.2f}%")
            logger.info(f"  Total Loss: {total_loss_percentage:.2f}%")
            
            # Apply Prop Firm rules
            new_status = 'active'
            rule_triggered = None
            
            # Rule 1: Daily loss limit (5%)
            if daily_loss_percentage >= self.DAILY_LOSS_LIMIT_PERCENT:
                new_status = 'failed'
                rule_triggered = f"daily_loss_limit_exceeded_{self.DAILY_LOSS_LIMIT_PERCENT}percent"
                logger.warning(f"Challenge {challenge_id} FAILED: Daily loss limit exceeded ({daily_loss_percentage:.2f}%)")
            
            # Rule 2: Total loss limit (10%)
            elif total_loss_percentage >= self.TOTAL_LOSS_LIMIT_PERCENT:
                new_status = 'failed'
                rule_triggered = f"total_loss_limit_exceeded_{self.TOTAL_LOSS_LIMIT_PERCENT}percent"
                logger.warning(f"Challenge {challenge_id} FAILED: Total loss limit exceeded ({total_loss_percentage:.2f}%)")
            
            # Rule 3: Profit target (10%)
            elif profit_percentage >= self.PROFIT_TARGET_PERCENT:
                new_status = 'success'
                rule_triggered = f"profit_target_reached_{self.PROFIT_TARGET_PERCENT}percent"
                logger.info(f"Challenge {challenge_id} SUCCESS: Profit target reached ({profit_percentage:.2f}%)")
            
            # Update challenge if status changed
            if new_status != challenge['status']:
                update_data = {
                    'status': new_status,
                    'ended_at': datetime.utcnow().isoformat() if new_status in ['success', 'failed'] else None
                }
                
                if rule_triggered:
                    update_data['failure_reason'] = rule_triggered if new_status == 'failed' else None
                    update_data['success_reason'] = rule_triggered if new_status == 'success' else None
                
                update_response = self.supabase.table('user_challenges') \
                    .update(update_data) \
                    .eq('id', challenge_id) \
                    .execute()
                
                if update_response.error:
                    logger.error(f"Failed to update challenge status: {update_response.error}")
                    return {'error': str(update_response.error)}
                
                logger.info(f"Challenge {challenge_id} status updated to: {new_status}")
            
            return {
                'status': new_status,
                'rule_triggered': rule_triggered,
                'metrics': {
                    'current_balance': current_balance,
                    'profit_percentage': profit_percentage,
                    'loss_percentage': loss_percentage,
                    'daily_loss_percentage': daily_loss_percentage,
                    'total_loss_percentage': total_loss_percentage,
                    'absolute_pnl': absolute_pnl
                },
                'limits': {
                    'daily_loss_limit': self.DAILY_LOSS_LIMIT_PERCENT,
                    'total_loss_limit': self.TOTAL_LOSS_LIMIT_PERCENT,
                    'profit_target': self.PROFIT_TARGET_PERCENT
                },
                'challenge': challenge_response.data
            }
            
        except Exception as e:
            logger.error(f"Error evaluating challenge rules: {str(e)}")
            return {'error': str(e)}
    
    def process_trade_completion(self, trade_id: str, user_id: str) -> Dict:
        """
        Process a completed trade and trigger challenge evaluation
        
        This is the main entry point called after each trade
        
        Args:
            trade_id: Trade UUID
            user_id: User UUID
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Get the completed trade
            trade_response = self.supabase.table('trades') \
                .select('*, challenge_id') \
                .eq('id', trade_id) \
                .eq('user_id', user_id) \
                .eq('is_open', False) \
                .single() \
                .execute()
            
            if trade_response.error:
                logger.error(f"Trade not found or still open: {trade_response.error}")
                return {'error': 'Trade not found or still open'}
            
            trade = trade_response.data
            challenge_id = trade['challenge_id']
            
            logger.info(f"Processing completed trade {trade_id} for challenge {challenge_id}")
            
            # Evaluate challenge rules
            evaluation_result = self.evaluate_challenge_rules(challenge_id)
            
            if 'error' in evaluation_result:
                return evaluation_result
            
            # Log the trade impact
            logger.info(f"Trade {trade_id} impact: PnL ${trade['pnl']:,.2f}")
            
            return {
                'success': True,
                'trade_id': trade_id,
                'challenge_id': challenge_id,
                'evaluation': evaluation_result,
                'trade_pnl': trade['pnl']
            }
            
        except Exception as e:
            logger.error(f"Error processing trade completion: {str(e)}")
            return {'error': str(e)}
    
    def reset_daily_metrics(self, challenge_id: str = None) -> Dict:
        """
        Reset daily PnL for challenges (typically called at midnight)
        
        Args:
            challenge_id: Specific challenge to reset (None for all active)
            
        Returns:
            Dictionary with reset results
        """
        try:
            # Build query
            query = self.supabase.table('user_challenges').select('*')
            
            if challenge_id:
                query = query.eq('id', challenge_id)
            else:
                query = query.in_('status', ['active'])
            
            response = query.execute()
            
            if response.error:
                logger.error(f"Error fetching challenges for daily reset: {response.error}")
                return {'error': str(response.error)}
            
            reset_count = 0
            failed_resets = []
            
            for challenge in response.data:
                update_response = self.supabase.table('user_challenges') \
                    .update({
                        'daily_pnl': 0.0,
                        'daily_reset_time': datetime.utcnow().isoformat()
                    }) \
                    .eq('id', challenge['id']) \
                    .execute()
                
                if update_response.error:
                    logger.error(f"Failed to reset daily PnL for challenge {challenge['id']}: {update_response.error}")
                    failed_resets.append(challenge['id'])
                else:
                    reset_count += 1
                    logger.info(f"Daily PnL reset for challenge {challenge['id']}")
            
            return {
                'success': True,
                'reset_count': reset_count,
                'failed_resets': failed_resets,
                'total_processed': len(response.data)
            }
            
        except Exception as e:
            logger.error(f"Error resetting daily metrics: {str(e)}")
            return {'error': str(e)}
    
    def get_challenge_summary(self, challenge_id: str) -> Dict:
        """
        Get comprehensive challenge summary with all metrics
        
        Args:
            challenge_id: Challenge UUID
            
        Returns:
            Dictionary with challenge summary
        """
        try:
            challenge_response = self.supabase.table('user_challenges') \
                .select('*, trades(*)') \
                .eq('id', challenge_id) \
                .single() \
                .execute()
            
            if challenge_response.error:
                return {'error': 'Challenge not found'}
            
            challenge = challenge_response.data
            trades = challenge.pop('trades', [])
            
            # Calculate additional metrics
            winning_trades = [t for t in trades if t.get('pnl', 0) > 0]
            losing_trades = [t for t in trades if t.get('pnl', 0) < 0]
            
            summary = {
                'challenge': challenge,
                'trade_statistics': {
                    'total_trades': len(trades),
                    'winning_trades': len(winning_trades),
                    'losing_trades': len(losing_trades),
                    'win_rate': len(winning_trades) / len(trades) * 100 if trades else 0,
                    'total_pnl': sum(t.get('pnl', 0) for t in trades),
                    'average_win': sum(t.get('pnl', 0) for t in winning_trades) / len(winning_trades) if winning_trades else 0,
                    'average_loss': sum(t.get('pnl', 0) for t in losing_trades) / len(losing_trades) if losing_trades else 0
                },
                'current_status': {
                    'balance': challenge['current_balance'],
                    'remaining_to_profit_target': max(0, (challenge['initial_capital'] * (1 + self.PROFIT_TARGET_PERCENT/100)) - challenge['current_balance']),
                    'remaining_before_daily_failure': max(0, challenge['initial_capital'] * (1 - self.DAILY_LOSS_LIMIT_PERCENT/100) - challenge['current_balance']),
                    'remaining_before_total_failure': max(0, challenge['initial_capital'] * (1 - self.TOTAL_LOSS_LIMIT_PERCENT/100) - challenge['current_balance'])
                }
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting challenge summary: {str(e)}")
            return {'error': str(e)}

# Initialize the service
prop_firm_evaluator = None

def get_prop_firm_evaluator(supabase_client):
    """Get singleton instance of Prop Firm evaluator"""
    global prop_firm_evaluator
    if prop_firm_evaluator is None:
        prop_firm_evaluator = PropFirmChallengeEvaluator(supabase_client)
    return prop_firm_evaluator