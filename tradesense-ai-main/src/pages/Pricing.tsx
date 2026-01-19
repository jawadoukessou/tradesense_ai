import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket, CreditCard, Bitcoin, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PricingPlan {
  name: { en: string; fr: string; ar: string };
  price: string;
  priceUSD: number;
  currency: string;
  capital: string;
  capitalNumber: number;
  icon: typeof Zap;
  popular?: boolean;
  features: { en: string[]; fr: string[]; ar: string[] };
  color: string;
}

const plans: PricingPlan[] = [
  {
    name: { en: "Starter", fr: "Starter", ar: "المبتدئ" },
    price: "200",
    priceUSD: 20,
    currency: "DH",
    capital: "$5,000",
    capitalNumber: 5000,
    icon: Zap,
    color: "primary",
    features: {
      en: [
        "$5,000 Capital",
        "+10% Profit Target",
        "-5% Max Daily Loss",
        "Basic AI Signals",
        "Email Support",
      ],
      fr: [
        "Capital de $5,000",
        "Objectif profit +10%",
        "Max loss journalier -5%",
        "Signaux IA basiques",
        "Support email",
      ],
      ar: [
        "رأس مال $5,000",
        "هدف ربح +10%",
        "خسارة يومية قصوى -5%",
        "إشارات ذكاء اصطناعي أساسية",
        "دعم بالبريد الإلكتروني",
      ],
    },
  },
  {
    name: { en: "Pro", fr: "Pro", ar: "المحترف" },
    price: "500",
    priceUSD: 50,
    currency: "DH",
    capital: "$25,000",
    capitalNumber: 25000,
    icon: Rocket,
    popular: true,
    color: "accent",
    features: {
      en: [
        "$25,000 Capital",
        "+10% Profit Target",
        "-5% Max Daily Loss",
        "Advanced AI Signals",
        "24/7 Priority Support",
        "Leaderboard Access",
      ],
      fr: [
        "Capital de $25,000",
        "Objectif profit +10%",
        "Max loss journalier -5%",
        "Signaux IA avancés",
        "Support prioritaire 24/7",
        "Accès au Leaderboard",
      ],
      ar: [
        "رأس مال $25,000",
        "هدف ربح +10%",
        "خسارة يومية قصوى -5%",
        "إشارات ذكاء اصطناعي متقدمة",
        "دعم أولوية 24/7",
        "الوصول إلى المتصدرين",
      ],
    },
  },
  {
    name: { en: "Elite", fr: "Elite", ar: "النخبة" },
    price: "1000",
    priceUSD: 100,
    currency: "DH",
    capital: "$100,000",
    capitalNumber: 100000,
    icon: Crown,
    color: "gradient",
    features: {
      en: [
        "$100,000 Capital",
        "+8% Profit Target",
        "-4% Max Daily Loss",
        "Premium AI Signals",
        "Personal Manager",
        "Fast Withdrawals",
        "Elite Trader Badge",
      ],
      fr: [
        "Capital de $100,000",
        "Objectif profit +8%",
        "Max loss journalier -4%",
        "Signaux IA premium",
        "Manager personnel",
        "Retrait rapide",
        "Badge Trader Elite",
      ],
      ar: [
        "رأس مال $100,000",
        "هدف ربح +8%",
        "خسارة يومية قصوى -4%",
        "إشارات ذكاء اصطناعي مميزة",
        "مدير شخصي",
        "سحب سريع",
        "شارة المتداول النخبة",
      ],
    },
  },
];

const Pricing = () => {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "crypto" | "cmi" | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "success">("select");
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const texts = {
    en: {
      title: "Choose Your",
      titleHighlight: "Challenge",
      subtitle: "Select the plan that matches your goals. Higher capital means greater potential earnings.",
      popular: "Most Popular",
      capital: "Capital",
      processing: "Processing...",
      payPayPal: "Pay with PayPal",
      payCMI: "Pay with CMI",
      payCrypto: "Pay with Crypto",
      successTitle: "🎉 Payment Successful!",
      successDesc: "Your {plan} challenge is now active. Good luck!",
      cancelledTitle: "Payment Cancelled",
      cancelledDesc: "Your payment was cancelled. You can try again anytime.",
      questions: "Questions?",
      checkFAQ: "Check our FAQ",
      or: "or",
      contactUs: "contact us",
      loginRequired: "Please login first",
      loginRequiredDesc: "You need to be logged in to purchase a challenge.",
      selectPayment: "Select Payment Method",
      selectPaymentDesc: "Choose how you want to pay for your challenge",
      paymentProcessing: "Processing Payment",
      paymentProcessingDesc: "Please wait while we process your payment...",
      paymentSuccess: "Payment Successful!",
      paymentSuccessDesc: "Your challenge has been activated",
      goToDashboard: "Go to Dashboard",
      close: "Close",
    },
    fr: {
      title: "Choisissez Votre",
      titleHighlight: "Challenge",
      subtitle: "Sélectionnez le plan qui correspond à vos objectifs. Plus le capital est élevé, plus vos gains potentiels sont importants.",
      popular: "Plus Populaire",
      capital: "Capital",
      processing: "Traitement...",
      payPayPal: "Payer avec PayPal",
      payCMI: "Payer avec CMI",
      payCrypto: "Payer avec Crypto",
      successTitle: "🎉 Paiement Réussi !",
      successDesc: "Votre challenge {plan} est maintenant actif. Bonne chance !",
      cancelledTitle: "Paiement Annulé",
      cancelledDesc: "Votre paiement a été annulé. Vous pouvez réessayer à tout moment.",
      questions: "Des questions ?",
      checkFAQ: "Consultez notre FAQ",
      or: "ou",
      contactUs: "contactez-nous",
      loginRequired: "Veuillez vous connecter d'abord",
      loginRequiredDesc: "Vous devez être connecté pour acheter un challenge.",
      selectPayment: "Sélectionnez le mode de paiement",
      selectPaymentDesc: "Choisissez comment payer votre challenge",
      paymentProcessing: "Traitement du paiement",
      paymentProcessingDesc: "Veuillez patienter pendant que nous traitons votre paiement...",
      paymentSuccess: "Paiement réussi !",
      paymentSuccessDesc: "Votre challenge a été activé",
      goToDashboard: "Aller au Dashboard",
      close: "Fermer",
    },
    ar: {
      title: "اختر",
      titleHighlight: "تحديك",
      subtitle: "اختر الخطة المناسبة لأهدافك. رأس المال الأعلى يعني أرباح محتملة أكبر.",
      popular: "الأكثر شعبية",
      capital: "رأس المال",
      processing: "جاري المعالجة...",
      payPayPal: "الدفع عبر PayPal",
      payCMI: "الدفع عبر CMI",
      payCrypto: "الدفع بالعملات المشفرة",
      successTitle: "🎉 تم الدفع بنجاح!",
      successDesc: "تحدي {plan} الخاص بك نشط الآن. حظاً موفقاً!",
      cancelledTitle: "تم إلغاء الدفع",
      cancelledDesc: "تم إلغاء الدفع. يمكنك المحاولة مرة أخرى في أي وقت.",
      questions: "هل لديك أسئلة؟",
      checkFAQ: "راجع الأسئلة الشائعة",
      or: "أو",
      contactUs: "اتصل بنا",
      loginRequired: "يرجى تسجيل الدخول أولاً",
      loginRequiredDesc: "يجب أن تكون مسجل الدخول لشراء تحدي.",
      selectPayment: "اختر طريقة الدفع",
      selectPaymentDesc: "اختر كيف تريد الدفع لتحديك",
      paymentProcessing: "جاري معالجة الدفع",
      paymentProcessingDesc: "يرجى الانتظار بينما نعالج دفعتك...",
      paymentSuccess: "تم الدفع بنجاح!",
      paymentSuccessDesc: "تم تفعيل تحديك",
      goToDashboard: "الذهاب إلى لوحة التحكم",
      close: "إغلاق",
    },
  };

  const txt = texts[language];

  // Handle payment return
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'cancelled') {
      toast({
        title: txt.cancelledTitle,
        description: txt.cancelledDesc,
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const openPaymentModal = (plan: PricingPlan) => {
    if (!user) {
      toast({
        title: txt.loginRequired,
        description: txt.loginRequiredDesc,
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    setSelectedPlan(plan);
    setPaymentStep("select");
    setShowPaymentModal(true);
  };

  const handlePayPalPayment = async () => {
    if (!selectedPlan || !user) return;

    setPaymentStep("processing");
    setPaymentMethod("paypal");

    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          planName: selectedPlan.name.en,
          amount: selectedPlan.priceUSD,
          currency: 'USD',
          initialCapital: selectedPlan.capitalNumber,
        },
      });

      if (error) throw error;

      if (data?.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received');
      }
    } catch (error) {
      console.error('PayPal error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to initialize PayPal payment. Please try again.',
        variant: 'destructive',
      });
      setPaymentStep("select");
      setPaymentMethod(null);
    }
  };

  const handleMockPayment = async (method: "cmi" | "crypto") => {
    if (!selectedPlan || !user) return;

    setPaymentStep("processing");
    setPaymentMethod(method);

    // Simulate payment processing (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      // Create the challenge in the database
      const { data: challengeData, error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          plan_name: selectedPlan.name.en,
          initial_capital: selectedPlan.capitalNumber,
          current_balance: selectedPlan.capitalNumber,
          profit_target_percent: selectedPlan.name.en === "Elite" ? 8 : 10,
          max_daily_loss_percent: selectedPlan.name.en === "Elite" ? 4 : 5,
          max_total_loss_percent: selectedPlan.name.en === "Elite" ? 8 : 10,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Record the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          challenge_id: challengeData.id,
          amount: selectedPlan.priceUSD,
          currency: 'USD',
          payment_method: method.toUpperCase(),
          status: 'completed',
          transaction_id: `MOCK-${method.toUpperCase()}-${Date.now()}`,
        });

      if (paymentError) throw paymentError;

      setPaymentStep("success");
    } catch (error) {
      console.error('Mock payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
      setPaymentStep("select");
      setPaymentMethod(null);
    }
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    setPaymentStep("select");
    setPaymentMethod(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {txt.title} <span className="gradient-text">{txt.titleHighlight}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {txt.subtitle}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.name.en}
                className={`relative glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${
                  plan.popular ? "border-accent/50 shadow-lg shadow-accent/10" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-accent to-yellow-400 text-accent-foreground text-sm font-semibold">
                      {txt.popular}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div
                    className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      plan.color === "gradient"
                        ? "bg-gradient-to-br from-primary to-accent"
                        : plan.color === "accent"
                        ? "bg-accent/20"
                        : "bg-primary/20"
                    }`}
                  >
                    <plan.icon
                      className={`w-8 h-8 ${
                        plan.color === "gradient"
                          ? "text-foreground"
                          : plan.color === "accent"
                          ? "text-accent"
                          : "text-primary"
                      }`}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name[language]}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ms-1">{plan.currency}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    (~${plan.priceUSD} USD)
                  </p>
                  <p className="text-muted-foreground">
                    {txt.capital}: <span className="text-foreground font-semibold">{plan.capital}</span>
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features[language].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-profit mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "gold" : "hero"}
                  className="w-full"
                  onClick={() => openPaymentModal(plan)}
                >
                  <CreditCard className="w-4 h-4" />
                  {language === "en" ? "Get Started" : language === "fr" ? "Commencer" : "ابدأ الآن"}
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ or additional info */}
          <div className="mt-20 text-center">
            <p className="text-muted-foreground">
              {txt.questions}{" "}
              <a href="#" className="text-primary hover:underline">
                {txt.checkFAQ}
              </a>{" "}
              {txt.or}{" "}
              <a href="#" className="text-primary hover:underline">
                {txt.contactUs}
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStep === "select" && txt.selectPayment}
              {paymentStep === "processing" && txt.paymentProcessing}
              {paymentStep === "success" && txt.paymentSuccess}
            </DialogTitle>
            <DialogDescription>
              {paymentStep === "select" && (
                <>
                  {txt.selectPaymentDesc}
                  {selectedPlan && (
                    <span className="block mt-2 text-foreground font-semibold">
                      {selectedPlan.name[language]} - {selectedPlan.price} {selectedPlan.currency}
                    </span>
                  )}
                </>
              )}
              {paymentStep === "processing" && txt.paymentProcessingDesc}
              {paymentStep === "success" && txt.paymentSuccessDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {paymentStep === "select" && (
              <div className="space-y-3">
                <Button
                  variant="hero"
                  className="w-full justify-start gap-3"
                  onClick={handlePayPalPayment}
                >
                  <CreditCard className="w-5 h-5" />
                  {txt.payPayPal}
                  <span className="ml-auto text-xs opacity-70">Secure</span>
                </Button>
                <Button
                  variant="glass"
                  className="w-full justify-start gap-3"
                  onClick={() => handleMockPayment("cmi")}
                >
                  <Wallet className="w-5 h-5" />
                  {txt.payCMI}
                  <span className="ml-auto text-xs opacity-70">Morocco</span>
                </Button>
                <Button
                  variant="glass"
                  className="w-full justify-start gap-3"
                  onClick={() => handleMockPayment("crypto")}
                >
                  <Bitcoin className="w-5 h-5" />
                  {txt.payCrypto}
                  <span className="ml-auto text-xs opacity-70">BTC/ETH</span>
                </Button>
              </div>
            )}

            {paymentStep === "processing" && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-center">
                  {paymentMethod === "cmi" && "Connecting to CMI..."}
                  {paymentMethod === "crypto" && "Verifying blockchain transaction..."}
                  {paymentMethod === "paypal" && "Redirecting to PayPal..."}
                </p>
              </div>
            )}

            {paymentStep === "success" && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-profit/20 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-profit" />
                </div>
                <p className="text-center mb-6">
                  {txt.successDesc.replace("{plan}", selectedPlan?.name[language] || "")}
                </p>
                <div className="flex gap-3 w-full">
                  <Button
                    variant="glass"
                    className="flex-1"
                    onClick={closeModal}
                  >
                    {txt.close}
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={() => {
                      closeModal();
                      navigate('/dashboard');
                    }}
                  >
                    {txt.goToDashboard}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Pricing;
