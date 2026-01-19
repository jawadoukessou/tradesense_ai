import { Target, TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChallenge } from "@/hooks/useChallenge";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

const ChallengeStatus = () => {
  const { language } = useLanguage();
  const { challenge, loading } = useChallenge();

  const texts = {
    en: {
      title: "Challenge Status",
      capital: "Initial Capital",
      balance: "Current Balance",
      dailyPnl: "Daily P&L",
      totalPnl: "Total P&L",
      profitTarget: "Profit Target",
      maxDailyLoss: "Max Daily Loss",
      maxTotalLoss: "Max Total Loss",
      status: "Status",
      active: "Active",
      success: "Funded!",
      failed: "Failed",
      pending: "Pending",
      noChallenge: "No Active Challenge",
      getStarted: "Get Started",
      buyChallenge: "Purchase a challenge to start your trading journey",
      nearTarget: "You're close to the target! Keep it up.",
    },
    fr: {
      title: "Statut du Challenge",
      capital: "Capital Initial",
      balance: "Solde Actuel",
      dailyPnl: "P&L Journalier",
      totalPnl: "P&L Total",
      profitTarget: "Objectif Profit",
      maxDailyLoss: "Perte Max Journalière",
      maxTotalLoss: "Perte Max Totale",
      status: "Statut",
      active: "Actif",
      success: "Financé !",
      failed: "Échoué",
      pending: "En attente",
      noChallenge: "Aucun Challenge Actif",
      getStarted: "Commencer",
      buyChallenge: "Achetez un challenge pour commencer votre parcours de trading",
      nearTarget: "Vous êtes proche de l'objectif ! Continuez ainsi.",
    },
    ar: {
      title: "حالة التحدي",
      capital: "رأس المال الأولي",
      balance: "الرصيد الحالي",
      dailyPnl: "الربح/الخسارة اليومي",
      totalPnl: "الربح/الخسارة الإجمالي",
      profitTarget: "هدف الربح",
      maxDailyLoss: "الحد الأقصى للخسارة اليومية",
      maxTotalLoss: "الحد الأقصى للخسارة الإجمالية",
      status: "الحالة",
      active: "نشط",
      success: "ممول!",
      failed: "فشل",
      pending: "قيد الانتظار",
      noChallenge: "لا يوجد تحدي نشط",
      getStarted: "ابدأ الآن",
      buyChallenge: "اشترِ تحديًا لبدء رحلتك في التداول",
      nearTarget: "أنت قريب من الهدف! استمر.",
    },
  };

  const txt = texts[language];

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-accent mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">{txt.noChallenge}</h3>
        <p className="text-muted-foreground text-sm mb-4">{txt.buyChallenge}</p>
        <Link to="/pricing">
          <Button variant="hero" className="w-full">
            {txt.getStarted}
          </Button>
        </Link>
      </div>
    );
  }

  const profitPercent = (challenge.total_pnl / challenge.initial_capital) * 100;
  const dailyPercent = (challenge.daily_pnl / challenge.initial_capital) * 100;
  const dailyLossPercent = Math.abs(Math.min(0, challenge.daily_pnl)) / challenge.initial_capital * 100;
  const totalLossPercent = Math.abs(Math.min(0, challenge.total_pnl)) / challenge.initial_capital * 100;

  const profitProgress = Math.min(100, Math.max(0, (profitPercent / challenge.profit_target_percent) * 100));
  const dailyLossProgress = Math.min(100, (dailyLossPercent / challenge.max_daily_loss_percent) * 100);
  const totalLossProgress = Math.min(100, (totalLossPercent / challenge.max_total_loss_percent) * 100);

  const isNearTarget = profitPercent >= challenge.profit_target_percent * 0.8;

  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-profit/20 text-profit text-sm font-semibold">
            <CheckCircle className="w-4 h-4" />
            {txt.success}
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-loss/20 text-loss text-sm font-semibold">
            <XCircle className="w-4 h-4" />
            {txt.failed}
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-semibold">
            {txt.pending}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold">
            {txt.active}
          </span>
        );
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{txt.title}</h3>
            <p className="text-xs text-muted-foreground">{challenge.plan_name}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Balance */}
      <div className="p-4 rounded-xl bg-secondary/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{txt.balance}</span>
          <span className="text-sm text-muted-foreground">{txt.capital}: ${challenge.initial_capital.toLocaleString()}</span>
        </div>
        <p className="text-3xl font-bold font-mono">
          ${challenge.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${challenge.total_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
          {challenge.total_pnl >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-mono text-sm">
            {challenge.total_pnl >= 0 ? '+' : ''}${challenge.total_pnl.toFixed(2)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Daily & Total PnL */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-secondary/30">
          <p className="text-xs text-muted-foreground mb-1">{txt.dailyPnl}</p>
          <div className={`text-lg font-bold font-mono ${challenge.daily_pnl >= 0 ? "text-profit" : "text-loss"}`}>
            {challenge.daily_pnl >= 0 ? "+" : ""}${challenge.daily_pnl.toFixed(2)}
          </div>
          <p className={`text-xs font-mono ${challenge.daily_pnl >= 0 ? "text-profit" : "text-loss"}`}>
            {challenge.daily_pnl >= 0 ? "+" : ""}{dailyPercent.toFixed(2)}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/30">
          <p className="text-xs text-muted-foreground mb-1">{txt.totalPnl}</p>
          <div className={`text-lg font-bold font-mono ${challenge.total_pnl >= 0 ? "text-profit" : "text-loss"}`}>
            {challenge.total_pnl >= 0 ? "+" : ""}${challenge.total_pnl.toFixed(2)}
          </div>
          <p className={`text-xs font-mono ${challenge.total_pnl >= 0 ? "text-profit" : "text-loss"}`}>
            {challenge.total_pnl >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Profit Target */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm">{txt.profitTarget} (+{challenge.profit_target_percent}%)</span>
            </div>
            <span className="text-sm font-mono text-primary">{profitProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
              style={{ width: `${profitProgress}%` }}
            />
          </div>
        </div>

        {/* Daily Loss Limit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm">{txt.maxDailyLoss} (-{challenge.max_daily_loss_percent}%)</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{dailyLossProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dailyLossProgress > 80 ? "bg-loss" : dailyLossProgress > 50 ? "bg-accent" : "bg-muted-foreground"
              }`}
              style={{ width: `${dailyLossProgress}%` }}
            />
          </div>
        </div>

        {/* Total Loss Limit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-loss" />
              <span className="text-sm">{txt.maxTotalLoss} (-{challenge.max_total_loss_percent}%)</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{totalLossProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalLossProgress > 80 ? "bg-loss" : totalLossProgress > 50 ? "bg-accent" : "bg-muted-foreground"
              }`}
              style={{ width: `${totalLossProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Near Target Message */}
      {challenge.status === "active" && isNearTarget && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-profit/10 border border-profit/20">
          <CheckCircle className="w-5 h-5 text-profit" />
          <p className="text-sm text-profit">{txt.nearTarget}</p>
        </div>
      )}
    </div>
  );
};

export default ChallengeStatus;
