import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Challenge {
  id: string;
  user_id: string;
  plan_name: string;
  status: 'active' | 'success' | 'failed' | 'pending';
  initial_capital: number;
  current_balance: number;
  total_pnl: number;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

const Admin = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'challenges' | 'payments'>('challenges');
  const [searchTerm, setSearchTerm] = useState('');

  const texts = {
    en: {
      title: 'Admin Panel',
      subtitle: 'Manage challenges and payments',
      challenges: 'Challenges',
      payments: 'Payments',
      user: 'User',
      plan: 'Plan',
      status: 'Status',
      balance: 'Balance',
      pnl: 'P&L',
      actions: 'Actions',
      markSuccess: 'Mark Success',
      markFailed: 'Mark Failed',
      amount: 'Amount',
      method: 'Method',
      date: 'Date',
      search: 'Search by email...',
      noResults: 'No results found',
      updated: 'Status updated successfully',
      error: 'Error updating status',
    },
    fr: {
      title: 'Panel Admin',
      subtitle: 'Gérer les challenges et paiements',
      challenges: 'Challenges',
      payments: 'Paiements',
      user: 'Utilisateur',
      plan: 'Plan',
      status: 'Statut',
      balance: 'Solde',
      pnl: 'P&L',
      actions: 'Actions',
      markSuccess: 'Marquer Réussi',
      markFailed: 'Marquer Échoué',
      amount: 'Montant',
      method: 'Méthode',
      date: 'Date',
      search: 'Rechercher par email...',
      noResults: 'Aucun résultat trouvé',
      updated: 'Statut mis à jour avec succès',
      error: 'Erreur lors de la mise à jour',
    },
    ar: {
      title: 'لوحة الإدارة',
      subtitle: 'إدارة التحديات والمدفوعات',
      challenges: 'التحديات',
      payments: 'المدفوعات',
      user: 'المستخدم',
      plan: 'الخطة',
      status: 'الحالة',
      balance: 'الرصيد',
      pnl: 'الربح/الخسارة',
      actions: 'الإجراءات',
      markSuccess: 'تحديد ناجح',
      markFailed: 'تحديد فاشل',
      amount: 'المبلغ',
      method: 'طريقة الدفع',
      date: 'التاريخ',
      search: 'البحث بالبريد الإلكتروني...',
      noResults: 'لم يتم العثور على نتائج',
      updated: 'تم تحديث الحالة بنجاح',
      error: 'خطأ في تحديث الحالة',
    },
  };

  const txt = texts[language];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch challenges with profiles
      const { data: challengesData, error: challengesError } = await supabase
        .from('user_challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      // Fetch profiles for challenges
      const userIds = [...new Set(challengesData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      const challengesWithProfiles = challengesData?.map(c => ({
        ...c,
        profile: profilesMap.get(c.user_id)
      })) || [];

      setChallenges(challengesWithProfiles);

      // Fetch payments with profiles
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const paymentUserIds = [...new Set(paymentsData?.map(p => p.user_id) || [])];
      const { data: paymentProfilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', paymentUserIds);

      const paymentProfilesMap = new Map(paymentProfilesData?.map(p => [p.id, p]));

      const paymentsWithProfiles = paymentsData?.map(p => ({
        ...p,
        profile: paymentProfilesMap.get(p.user_id)
      })) || [];

      setPayments(paymentsWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateChallengeStatus = async (challengeId: string, status: 'success' | 'failed') => {
    try {
      const { error } = await supabase
        .from('user_challenges')
        .update({ 
          status, 
          ended_at: new Date().toISOString() 
        })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: txt.updated,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: txt.error,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <Badge className="bg-profit/20 text-profit border-profit/30"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'failed':
        return <Badge className="bg-loss/20 text-loss border-loss/30"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'active':
        return <Badge className="bg-primary/20 text-primary border-primary/30">{status}</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  const filteredChallenges = challenges.filter(c => 
    c.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter(p => 
    p.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold">{txt.title}</span>
            </div>
            <p className="text-muted-foreground">{txt.subtitle}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 justify-center">
            <Button
              variant={activeTab === 'challenges' ? 'default' : 'outline'}
              onClick={() => setActiveTab('challenges')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              {txt.challenges}
            </Button>
            <Button
              variant={activeTab === 'payments' ? 'default' : 'outline'}
              onClick={() => setActiveTab('payments')}
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {txt.payments}
            </Button>
            <Button variant="ghost" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={txt.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : activeTab === 'challenges' ? (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50 border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.user}</th>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.plan}</th>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.status}</th>
                        <th className="px-6 py-4 text-end text-sm font-medium text-muted-foreground">{txt.balance}</th>
                        <th className="px-6 py-4 text-end text-sm font-medium text-muted-foreground">{txt.pnl}</th>
                        <th className="px-6 py-4 text-end text-sm font-medium text-muted-foreground">{txt.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredChallenges.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                            {txt.noResults}
                          </td>
                        </tr>
                      ) : (
                        filteredChallenges.map((challenge) => (
                          <tr key={challenge.id} className="hover:bg-secondary/30">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium">{challenge.profile?.full_name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{challenge.profile?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">{challenge.plan_name}</td>
                            <td className="px-6 py-4">{getStatusBadge(challenge.status)}</td>
                            <td className="px-6 py-4 text-end font-mono">${challenge.current_balance.toFixed(2)}</td>
                            <td className="px-6 py-4 text-end">
                              <span className={challenge.total_pnl >= 0 ? 'text-profit' : 'text-loss'}>
                                {challenge.total_pnl >= 0 ? '+' : ''}{challenge.total_pnl.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-end">
                              {challenge.status === 'active' && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-profit border-profit/30 hover:bg-profit/10"
                                    onClick={() => updateChallengeStatus(challenge.id, 'success')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-loss border-loss/30 hover:bg-loss/10"
                                    onClick={() => updateChallengeStatus(challenge.id, 'failed')}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50 border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.user}</th>
                        <th className="px-6 py-4 text-end text-sm font-medium text-muted-foreground">{txt.amount}</th>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.method}</th>
                        <th className="px-6 py-4 text-start text-sm font-medium text-muted-foreground">{txt.status}</th>
                        <th className="px-6 py-4 text-end text-sm font-medium text-muted-foreground">{txt.date}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                            {txt.noResults}
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-secondary/30">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium">{payment.profile?.full_name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{payment.profile?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-end font-mono font-bold">
                              {payment.amount} {payment.currency}
                            </td>
                            <td className="px-6 py-4">{payment.payment_method}</td>
                            <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                            <td className="px-6 py-4 text-end text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
