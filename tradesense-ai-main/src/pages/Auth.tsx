import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSelector } from '@/components/LanguageSelector';

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const { t, language } = useLanguage();

  const loginSchema = z.object({
    email: z.string().trim().email({ message: language === 'fr' ? "Veuillez entrer une adresse email valide" : language === 'ar' ? "الرجاء إدخال بريد إلكتروني صالح" : "Please enter a valid email address" }),
    password: z.string().min(6, { message: language === 'fr' ? "Le mot de passe doit contenir au moins 6 caractères" : language === 'ar' ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters" }),
  });

  const signupSchema = z.object({
    fullName: z.string().trim().min(2, { message: language === 'fr' ? "Le nom doit contenir au moins 2 caractères" : language === 'ar' ? "يجب أن يكون الاسم حرفين على الأقل" : "Name must be at least 2 characters" }).max(100),
    email: z.string().trim().email({ message: language === 'fr' ? "Veuillez entrer une adresse email valide" : language === 'ar' ? "الرجاء إدخال بريد إلكتروني صالح" : "Please enter a valid email address" }).max(255),
    password: z.string().min(6, { message: language === 'fr' ? "Le mot de passe doit contenir au moins 6 caractères" : language === 'ar' ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters" }).max(72),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: language === 'fr' ? "Les mots de passe ne correspondent pas" : language === 'ar' ? "كلمات المرور غير متطابقة" : "Passwords don't match",
    path: ["confirmPassword"],
  });

  const forgotSchema = z.object({
    email: z.string().trim().email({ message: language === 'fr' ? "Veuillez entrer une adresse email valide" : language === 'ar' ? "الرجاء إدخال بريد إلكتروني صالح" : "Please enter a valid email address" }),
  });

  type LoginForm = z.infer<typeof loginSchema>;
  type SignupForm = z.infer<typeof signupSchema>;
  type ForgotForm = z.infer<typeof forgotSchema>;

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [forgotForm, setForgotForm] = useState<ForgotForm>({ email: '' });

  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      const messages = {
        en: {
          invalid: "Invalid email or password. Please try again.",
          notConfirmed: "Please verify your email before signing in.",
          tooMany: "Too many attempts. Please wait a moment and try again.",
          default: "An error occurred during sign in",
        },
        fr: {
          invalid: "Email ou mot de passe incorrect. Veuillez réessayer.",
          notConfirmed: "Veuillez vérifier votre email avant de vous connecter.",
          tooMany: "Trop de tentatives. Veuillez patienter un moment.",
          default: "Une erreur s'est produite lors de la connexion",
        },
        ar: {
          invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          notConfirmed: "يرجى التحقق من بريدك الإلكتروني قبل تسجيل الدخول.",
          tooMany: "محاولات كثيرة جداً. يرجى الانتظار لحظة.",
          default: "حدث خطأ أثناء تسجيل الدخول",
        },
      };
      
      let message = messages[language].default;
      if (error.message.includes("Invalid login credentials")) {
        message = messages[language].invalid;
      } else if (error.message.includes("Email not confirmed")) {
        message = messages[language].notConfirmed;
      } else if (error.message.includes("Too many requests")) {
        message = messages[language].tooMany;
      }
      
      toast({
        title: language === 'fr' ? "Échec de connexion" : language === 'ar' ? "فشل تسجيل الدخول" : "Sign In Failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t.auth.welcomeBack + "!",
      description: language === 'fr' ? "Vous êtes maintenant connecté." : language === 'ar' ? "لقد قمت بتسجيل الدخول بنجاح." : "You have successfully signed in.",
    });
    navigate('/dashboard');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    setLoading(false);

    if (error) {
      const messages = {
        en: {
          registered: "This email is already registered. Please sign in instead.",
          rateLimit: "Too many attempts. Please wait a moment and try again.",
          default: "An error occurred during sign up",
        },
        fr: {
          registered: "Cet email est déjà enregistré. Veuillez vous connecter.",
          rateLimit: "Trop de tentatives. Veuillez patienter un moment.",
          default: "Une erreur s'est produite lors de l'inscription",
        },
        ar: {
          registered: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.",
          rateLimit: "محاولات كثيرة جداً. يرجى الانتظار لحظة.",
          default: "حدث خطأ أثناء إنشاء الحساب",
        },
      };
      
      let message = messages[language].default;
      if (error.message.includes("already registered")) {
        message = messages[language].registered;
      } else if (error.message.includes("Password")) {
        message = error.message;
      } else if (error.message.includes("rate limit")) {
        message = messages[language].rateLimit;
      }
      
      toast({
        title: language === 'fr' ? "Échec de l'inscription" : language === 'ar' ? "فشل إنشاء الحساب" : "Sign Up Failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: language === 'fr' ? "Compte créé !" : language === 'ar' ? "تم إنشاء الحساب!" : "Account created!",
      description: language === 'fr' ? "Bienvenue sur TradeSense AI. Vous pouvez maintenant trader." : language === 'ar' ? "مرحباً بك في TradeSense AI. يمكنك البدء في التداول." : "Welcome to TradeSense AI. You can now start trading.",
    });
    navigate('/dashboard');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = forgotSchema.safeParse(forgotForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(forgotForm.email);
    setLoading(false);

    if (error) {
      toast({
        title: language === 'fr' ? "Erreur" : language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const resetTexts = {
      en: { title: "Email sent!", desc: "Check your inbox to reset your password." },
      fr: { title: "Email envoyé !", desc: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe." },
      ar: { title: "تم الإرسال!", desc: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور." },
    };

    toast({
      title: resetTexts[language].title,
      description: resetTexts[language].desc,
    });
    
    setMode('login');
    setForgotForm({ email: '' });
  };

  const confirmPasswordLabel = {
    en: "Confirm Password",
    fr: "Confirmer le mot de passe",
    ar: "تأكيد كلمة المرور",
  };

  const loadingText = {
    en: { signIn: "Signing in...", signUp: "Creating account...", reset: "Sending..." },
    fr: { signIn: "Connexion...", signUp: "Création du compte...", reset: "Envoi..." },
    ar: { signIn: "جاري تسجيل الدخول...", signUp: "جاري إنشاء الحساب...", reset: "جاري الإرسال..." },
  };

  const forgotTexts = {
    en: { title: "Reset Password", desc: "Enter your email to receive a reset link", button: "Send Reset Link", back: "Back to login" },
    fr: { title: "Réinitialiser le mot de passe", desc: "Entrez votre email pour recevoir un lien de réinitialisation", button: "Envoyer le lien", back: "Retour à la connexion" },
    ar: { title: "إعادة تعيين كلمة المرور", desc: "أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين", button: "إرسال الرابط", back: "العودة لتسجيل الدخول" },
  };

  const forgotPasswordText = {
    en: "Forgot password?",
    fr: "Mot de passe oublié ?",
    ar: "نسيت كلمة المرور؟",
  };

  const getCardTitle = () => {
    if (mode === 'forgot') return forgotTexts[language].title;
    return mode === 'login' ? t.auth.welcomeBack : t.auth.createAccount;
  };

  const getCardDescription = () => {
    if (mode === 'forgot') return forgotTexts[language].desc;
    return mode === 'login' ? t.auth.signInToContinue : t.auth.startJourney;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">TradeSense AI</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {getCardTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {getCardDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t.auth.email}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotForm.email}
                    onChange={(e) => setForgotForm({ email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {loadingText[language].reset}
                    </>
                  ) : (
                    forgotTexts[language].button
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {forgotTexts[language].back}
                </button>
              </form>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrors({});
                      }}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {forgotPasswordText[language]}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className={errors.password ? 'border-destructive pe-10' : 'pe-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {loadingText[language].signIn}
                    </>
                  ) : (
                    t.auth.signIn
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.auth.noAccount} <span className="text-primary font-medium">{t.auth.signUp}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t.auth.fullName}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t.auth.email}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      className={errors.password ? 'border-destructive pe-10' : 'pe-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{confirmPasswordLabel[language]}</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {loadingText[language].signUp}
                    </>
                  ) : (
                    t.auth.signUp
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.auth.hasAccount} <span className="text-primary font-medium">{t.auth.signIn}</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 text-center text-sm text-muted-foreground">
        © 2024 TradeSense AI. {t.footer.rights}.
      </footer>
    </div>
  );
};

export default Auth;
