import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Calendar, Save, LogOut, KeyRound } from "lucide-react";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");

  const texts = {
    en: {
      title: "Profile",
      subtitle: "Manage your account settings",
      personalInfo: "Personal Information",
      personalInfoDesc: "Update your personal details",
      fullName: "Full Name",
      email: "Email",
      memberSince: "Member Since",
      accountStatus: "Account Status",
      active: "Active",
      save: "Save Changes",
      saving: "Saving...",
      signOut: "Sign Out",
      success: "Profile updated successfully",
      error: "Failed to update profile",
      security: "Security",
      securityDesc: "Manage your account security",
      changePassword: "Change Password",
      lastUpdated: "Last Updated",
    },
    fr: {
      title: "Profil",
      subtitle: "Gérez les paramètres de votre compte",
      personalInfo: "Informations Personnelles",
      personalInfoDesc: "Mettez à jour vos informations personnelles",
      fullName: "Nom Complet",
      email: "Email",
      memberSince: "Membre Depuis",
      accountStatus: "Statut du Compte",
      active: "Actif",
      save: "Enregistrer",
      saving: "Enregistrement...",
      signOut: "Déconnexion",
      success: "Profil mis à jour avec succès",
      error: "Échec de la mise à jour du profil",
      security: "Sécurité",
      securityDesc: "Gérez la sécurité de votre compte",
      changePassword: "Changer le Mot de Passe",
      lastUpdated: "Dernière Mise à Jour",
    },
    ar: {
      title: "الملف الشخصي",
      subtitle: "إدارة إعدادات حسابك",
      personalInfo: "المعلومات الشخصية",
      personalInfoDesc: "تحديث بياناتك الشخصية",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      memberSince: "عضو منذ",
      accountStatus: "حالة الحساب",
      active: "نشط",
      save: "حفظ التغييرات",
      saving: "جاري الحفظ...",
      signOut: "تسجيل الخروج",
      success: "تم تحديث الملف الشخصي بنجاح",
      error: "فشل تحديث الملف الشخصي",
      security: "الأمان",
      securityDesc: "إدارة أمان حسابك",
      changePassword: "تغيير كلمة المرور",
      lastUpdated: "آخر تحديث",
    },
  };

  const txt = texts[language];
  const isRTL = language === "ar";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFullName(data.full_name || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: txt.success,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: txt.error,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ar" ? "ar-SA" : language === "fr" ? "fr-FR" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded-2xl"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">{txt.title}</span>
            </h1>
            <p className="text-muted-foreground mt-2">{txt.subtitle}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Card */}
            <Card className="glass-card md:col-span-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{profile?.full_name || user?.email}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit/10 text-profit">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">{txt.active}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{txt.memberSince}</p>
                      <p className="font-medium">{profile?.created_at ? formatDate(profile.created_at) : "-"}</p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {txt.signOut}
                </Button>
              </CardContent>
            </Card>

            {/* Settings Cards */}
            <div className="md:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {txt.personalInfo}
                  </CardTitle>
                  <CardDescription>{txt.personalInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{txt.fullName}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={txt.fullName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{txt.email}</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input id="email" value={profile?.email || user?.email || ""} disabled className="bg-muted/50" />
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? txt.saving : txt.save}
                  </Button>
                </CardContent>
              </Card>

              {/* Security */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    {txt.security}
                  </CardTitle>
                  <CardDescription>{txt.securityDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordDialog
                    language={language}
                    trigger={
                      <Button variant="outline">
                        <KeyRound className="w-4 h-4 mr-2" />
                        {txt.changePassword}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
