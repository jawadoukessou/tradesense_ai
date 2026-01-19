import { Check, X, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ChallengeRules = () => {
  const { language } = useLanguage();

  const texts = {
    en: {
      title: "Challenge",
      titlePrefix: "Rules of the",
      subtitle: "Simple and transparent rules. Prove your trading skills and access our capital.",
      successTitle: "Success Conditions",
      successRules: [
        "Achieve +10% profit on initial capital",
        "Trade at least 5 different days",
        "Respect all risk management rules",
        "No market manipulation",
      ],
      failureTitle: "Failure Conditions",
      failureRules: [
        "Daily loss > -5% of capital",
        "Total loss > -10% of initial capital",
        "Violation of trading rules",
        "Use of prohibited strategies",
      ],
      warningTitle: "Important Warning",
      warningText: "Trading involves risks. Past performance does not guarantee future results. Our platform uses demo accounts for the challenge.",
    },
    fr: {
      title: "Challenge",
      titlePrefix: "Règles du",
      subtitle: "Des règles simples et transparentes. Prouvez vos compétences de trading et accédez à notre capital.",
      successTitle: "Conditions de Réussite",
      successRules: [
        "Atteindre +10% de profit sur le capital initial",
        "Trader minimum 5 jours différents",
        "Respecter toutes les règles de gestion du risque",
        "Aucune manipulation de marché",
      ],
      failureTitle: "Conditions d'Échec",
      failureRules: [
        "Perte journalière > -5% du capital",
        "Perte totale > -10% du capital initial",
        "Violation des règles de trading",
        "Utilisation de stratégies interdites",
      ],
      warningTitle: "Avertissement Important",
      warningText: "Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs. Notre plateforme utilise des comptes de démonstration pour le challenge.",
    },
    ar: {
      title: "التحدي",
      titlePrefix: "قواعد",
      subtitle: "قواعد بسيطة وشفافة. أثبت مهاراتك في التداول واحصل على رأس مالنا.",
      successTitle: "شروط النجاح",
      successRules: [
        "تحقيق +10% ربح على رأس المال الأولي",
        "التداول لمدة 5 أيام مختلفة على الأقل",
        "احترام جميع قواعد إدارة المخاطر",
        "عدم التلاعب بالسوق",
      ],
      failureTitle: "شروط الفشل",
      failureRules: [
        "خسارة يومية > -5% من رأس المال",
        "خسارة إجمالية > -10% من رأس المال الأولي",
        "انتهاك قواعد التداول",
        "استخدام استراتيجيات محظورة",
      ],
      warningTitle: "تحذير مهم",
      warningText: "التداول ينطوي على مخاطر. الأداء السابق لا يضمن النتائج المستقبلية. منصتنا تستخدم حسابات تجريبية للتحدي.",
    },
  };

  const txt = texts[language];
  const isRTL = language === 'ar';

  return (
    <section className="py-20 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 chart-grid opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {txt.titlePrefix} <span className="gradient-text">{txt.title}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {txt.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Success Conditions */}
          <div className="glass-card rounded-2xl p-8 border-success/20 hover:border-success/50 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">{txt.successTitle}</h3>
            </div>
            <ul className="space-y-4">
              {txt.successRules.map((rule, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Failure Conditions */}
          <div className="glass-card rounded-2xl p-8 border-destructive/20 hover:border-destructive/50 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold">{txt.failureTitle}</h3>
            </div>
            <ul className="space-y-4">
              {txt.failureRules.map((rule, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-6 border-accent/30 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-accent mb-1">{txt.warningTitle}</h4>
              <p className="text-sm text-muted-foreground">
                {txt.warningText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChallengeRules;
