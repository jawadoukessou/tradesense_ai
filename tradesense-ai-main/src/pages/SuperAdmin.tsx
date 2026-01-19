import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminCharts from '@/components/AdminCharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShieldCheck, 
  CreditCard, 
  Settings,
  Save,
  ExternalLink,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Search,
  MoreVertical,
  Shield,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role?: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  activeChallenges: number;
}

const SuperAdmin = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalSecret, setPaypalSecret] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    activeChallenges: 0,
  });
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'settings'>('stats');

  const texts = {
    en: {
      title: 'Super Admin',
      subtitle: 'Platform configuration and integrations',
      paypalTitle: 'PayPal Integration',
      paypalDesc: 'Connect your PayPal Business account to receive payments',
      clientId: 'Client ID',
      clientSecret: 'Client Secret',
      connect: 'Connect PayPal',
      connected: 'PayPal Connected',
      disconnect: 'Disconnect',
      saved: 'Configuration saved successfully',
      getCredentials: 'Get PayPal Credentials',
      settingsTitle: 'Platform Settings',
      settingsDesc: 'General platform configuration',
      statsTab: 'Statistics',
      usersTab: 'Users',
      settingsTab: 'Settings',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      totalRevenue: 'Total Revenue',
      activeChallenges: 'Active Challenges',
      userManagement: 'User Management',
      searchUsers: 'Search users...',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      joinedAt: 'Joined',
      actions: 'Actions',
      makeAdmin: 'Make Admin',
      makeModerator: 'Make Moderator',
      removeRole: 'Remove Admin Role',
      deleteUser: 'Delete User',
      admin: 'Admin',
      moderator: 'Moderator',
      user: 'User',
      roleUpdated: 'Role updated successfully',
      noUsers: 'No users found',
    },
    fr: {
      title: 'Super Admin',
      subtitle: 'Configuration et intégrations de la plateforme',
      paypalTitle: 'Intégration PayPal',
      paypalDesc: 'Connectez votre compte PayPal Business pour recevoir les paiements',
      clientId: 'Client ID',
      clientSecret: 'Client Secret',
      connect: 'Connecter PayPal',
      connected: 'PayPal Connecté',
      disconnect: 'Déconnecter',
      saved: 'Configuration enregistrée avec succès',
      getCredentials: 'Obtenir les identifiants PayPal',
      settingsTitle: 'Paramètres Plateforme',
      settingsDesc: 'Configuration générale de la plateforme',
      statsTab: 'Statistiques',
      usersTab: 'Utilisateurs',
      settingsTab: 'Paramètres',
      totalUsers: 'Total Utilisateurs',
      activeUsers: 'Utilisateurs Actifs',
      totalRevenue: 'Revenu Total',
      activeChallenges: 'Challenges Actifs',
      userManagement: 'Gestion des Utilisateurs',
      searchUsers: 'Rechercher des utilisateurs...',
      name: 'Nom',
      email: 'Email',
      role: 'Rôle',
      joinedAt: 'Inscrit le',
      actions: 'Actions',
      makeAdmin: 'Rendre Admin',
      makeModerator: 'Rendre Modérateur',
      removeRole: 'Retirer le rôle Admin',
      deleteUser: 'Supprimer l\'utilisateur',
      admin: 'Admin',
      moderator: 'Modérateur',
      user: 'Utilisateur',
      roleUpdated: 'Rôle mis à jour avec succès',
      noUsers: 'Aucun utilisateur trouvé',
    },
    ar: {
      title: 'المدير الأعلى',
      subtitle: 'تكوين المنصة والتكاملات',
      paypalTitle: 'تكامل PayPal',
      paypalDesc: 'قم بتوصيل حساب PayPal Business الخاص بك لتلقي المدفوعات',
      clientId: 'معرف العميل',
      clientSecret: 'سر العميل',
      connect: 'ربط PayPal',
      connected: 'PayPal متصل',
      disconnect: 'قطع الاتصال',
      saved: 'تم حفظ التكوين بنجاح',
      getCredentials: 'احصل على بيانات اعتماد PayPal',
      settingsTitle: 'إعدادات المنصة',
      settingsDesc: 'التكوين العام للمنصة',
      statsTab: 'الإحصائيات',
      usersTab: 'المستخدمون',
      settingsTab: 'الإعدادات',
      totalUsers: 'إجمالي المستخدمين',
      activeUsers: 'المستخدمون النشطون',
      totalRevenue: 'إجمالي الإيرادات',
      activeChallenges: 'التحديات النشطة',
      userManagement: 'إدارة المستخدمين',
      searchUsers: 'البحث عن مستخدمين...',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      role: 'الدور',
      joinedAt: 'تاريخ الانضمام',
      actions: 'الإجراءات',
      makeAdmin: 'جعله مديراً',
      makeModerator: 'جعله مشرفاً',
      removeRole: 'إزالة دور المدير',
      deleteUser: 'حذف المستخدم',
      admin: 'مدير',
      moderator: 'مشرف',
      user: 'مستخدم',
      roleUpdated: 'تم تحديث الدور بنجاح',
      noUsers: 'لم يتم العثور على مستخدمين',
    },
  };

  const txt = texts[language];
  const isRTL = language === 'ar';

  // Fetch users and stats
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'user',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error fetching users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active challenges
      const { count: activeChallenges } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Total revenue from completed payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Users with active challenges (active users)
      const { count: activeUsers } = await supabase
        .from('user_challenges')
        .select('user_id', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalRevenue,
        activeChallenges: activeChallenges || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'moderator' | 'user') => {
    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({ title: txt.roleUpdated });
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error updating role',
        variant: 'destructive',
      });
    }
  };

  const handleConnectPaypal = () => {
    if (!paypalClientId || !paypalSecret) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsConnected(true);
    toast({
      title: txt.saved,
    });
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return txt.admin;
      case 'moderator':
        return txt.moderator;
      default:
        return txt.user;
    }
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div 
            className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 border border-accent/30 shadow-lg shadow-accent/10 mb-6">
              <ShieldCheck className="w-7 h-7 text-accent" />
              <span className="text-xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {txt.title}
              </span>
            </div>
            <p className="text-muted-foreground text-lg">{txt.subtitle}</p>
          </div>

          {/* Tabs */}
          <div 
            className="flex justify-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: '100ms' }}
          >
            {[
              { id: 'stats', label: txt.statsTab, icon: TrendingUp },
              { id: 'users', label: txt.usersTab, icon: Users },
              { id: 'settings', label: txt.settingsTab, icon: Settings },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`gap-2 px-6 py-5 text-base transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'shadow-lg shadow-primary/25 scale-105' 
                    : 'hover:scale-105 hover:border-primary/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    label: txt.totalUsers, 
                    value: stats.totalUsers, 
                    icon: Users, 
                    color: 'primary',
                    gradient: 'from-primary/20 to-primary/5'
                  },
                  { 
                    label: txt.activeUsers, 
                    value: stats.activeUsers, 
                    icon: Activity, 
                    color: 'profit',
                    gradient: 'from-profit/20 to-profit/5'
                  },
                  { 
                    label: txt.totalRevenue, 
                    value: `$${stats.totalRevenue.toLocaleString()}`, 
                    icon: DollarSign, 
                    color: 'accent',
                    gradient: 'from-accent/20 to-accent/5'
                  },
                  { 
                    label: txt.activeChallenges, 
                    value: stats.activeChallenges, 
                    icon: TrendingUp, 
                    color: 'cyan-500',
                    gradient: 'from-cyan-500/20 to-cyan-500/5'
                  },
                ].map((stat, index) => (
                  <Card 
                    key={stat.label}
                    className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${stat.gradient} backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
                    style={{ animationDelay: `${(index + 2) * 100}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
                    <CardContent className="relative pt-6 pb-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl bg-${stat.color}/20 flex items-center justify-center shadow-inner`}>
                          <stat.icon className={`w-7 h-7 text-${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts Section */}
              <div 
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: '600ms' }}
              >
                <AdminCharts />
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-border/50 pb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        {txt.userManagement}
                      </CardTitle>
                      <CardDescription className="text-base">{txt.totalUsers}: <span className="font-semibold text-foreground">{users.length}</span></CardDescription>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={txt.searchUsers}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-muted-foreground">Loading users...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                      <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">{txt.noUsers}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold">{txt.name}</TableHead>
                            <TableHead className="font-semibold">{txt.email}</TableHead>
                            <TableHead className="font-semibold">{txt.role}</TableHead>
                            <TableHead className="font-semibold">{txt.joinedAt}</TableHead>
                            <TableHead className="text-end font-semibold">{txt.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user, index) => (
                            <TableRow 
                              key={user.id}
                              className="hover:bg-muted/20 transition-colors animate-in fade-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <TableCell className="font-medium py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                                    {(user.full_name || user.email || '?')[0].toUpperCase()}
                                  </div>
                                  {user.full_name || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.email || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={getRoleBadgeVariant(user.role || 'user')}
                                  className="font-medium px-3 py-1"
                                >
                                  {getRoleLabel(user.role || 'user')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(user.created_at)}
                              </TableCell>
                              <TableCell className="text-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="hover:bg-primary/10 transition-colors"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {user.role !== 'admin' && (
                                      <DropdownMenuItem 
                                        onClick={() => updateUserRole(user.id, 'admin')}
                                        className="cursor-pointer"
                                      >
                                        <Shield className="w-4 h-4 mr-2 text-destructive" />
                                        {txt.makeAdmin}
                                      </DropdownMenuItem>
                                    )}
                                    {user.role !== 'moderator' && (
                                      <DropdownMenuItem 
                                        onClick={() => updateUserRole(user.id, 'moderator')}
                                        className="cursor-pointer"
                                      >
                                        <Shield className="w-4 h-4 mr-2 text-secondary-foreground" />
                                        {txt.makeModerator}
                                      </DropdownMenuItem>
                                    )}
                                    {user.role === 'admin' && (
                                      <DropdownMenuItem 
                                        onClick={() => updateUserRole(user.id, 'user')}
                                        className="cursor-pointer text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {txt.removeRole}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto grid gap-8">
              {/* PayPal Integration Card */}
              <Card 
                className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0070ba]/5 to-transparent pointer-events-none" />
                <CardHeader className="relative border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0070ba]/30 to-[#0070ba]/10 flex items-center justify-center shadow-lg">
                      <CreditCard className="w-7 h-7 text-[#0070ba]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{txt.paypalTitle}</CardTitle>
                      <CardDescription className="text-base">{txt.paypalDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-6 pt-6">
                  {isConnected ? (
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-profit/20 to-profit/5 border border-profit/30 shadow-inner">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-profit/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-profit" />
                        </div>
                        <span className="font-semibold text-profit text-lg">{txt.connected}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsConnected(false)}
                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                      >
                        {txt.disconnect}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="clientId" className="text-base font-medium">{txt.clientId}</Label>
                          <Input
                            id="clientId"
                            placeholder="AXx..."
                            value={paypalClientId}
                            onChange={(e) => setPaypalClientId(e.target.value)}
                            className="h-12 bg-background/50 border-border/50 focus:border-[#0070ba]/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clientSecret" className="text-base font-medium">{txt.clientSecret}</Label>
                          <Input
                            id="clientSecret"
                            type="password"
                            placeholder="••••••••"
                            value={paypalSecret}
                            onChange={(e) => setPaypalSecret(e.target.value)}
                            className="h-12 bg-background/50 border-border/50 focus:border-[#0070ba]/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-2">
                        <Button 
                          onClick={handleConnectPaypal} 
                          className="gap-2 h-12 px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                        >
                          <Save className="w-5 h-5" />
                          {txt.connect}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="gap-2 h-12 px-6 hover:border-[#0070ba]/50 hover:text-[#0070ba] transition-colors"
                          onClick={() => window.open('https://developer.paypal.com/dashboard/applications', '_blank')}
                        >
                          <ExternalLink className="w-5 h-5" />
                          {txt.getCredentials}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Platform Settings Card */}
              <Card 
                className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: '100ms' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <CardHeader className="relative border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-lg">
                      <Settings className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{txt.settingsTitle}</CardTitle>
                      <CardDescription className="text-base">{txt.settingsDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center space-y-3">
                      <Settings className="w-12 h-12 mx-auto text-muted-foreground/50 animate-pulse" />
                      <p className="text-base">Additional platform settings coming soon...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuperAdmin;
