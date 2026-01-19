import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  registrations: number;
}

interface ChallengeStatusData {
  name: string;
  value: number;
  color: string;
}

const AdminCharts = () => {
  const { language } = useLanguage();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [challengeStatusData, setChallengeStatusData] = useState<ChallengeStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  const texts = {
    en: {
      revenueTitle: 'Monthly Revenue',
      registrationsTitle: 'User Registrations',
      challengeStatusTitle: 'Challenge Status Distribution',
      revenue: 'Revenue',
      registrations: 'Registrations',
      active: 'Active',
      success: 'Success',
      failed: 'Failed',
      pending: 'Pending',
    },
    fr: {
      revenueTitle: 'Revenus Mensuels',
      registrationsTitle: 'Inscriptions Utilisateurs',
      challengeStatusTitle: 'Distribution des Statuts de Challenge',
      revenue: 'Revenus',
      registrations: 'Inscriptions',
      active: 'Actif',
      success: 'Réussi',
      failed: 'Échoué',
      pending: 'En attente',
    },
    ar: {
      revenueTitle: 'الإيرادات الشهرية',
      registrationsTitle: 'تسجيلات المستخدمين',
      challengeStatusTitle: 'توزيع حالة التحديات',
      revenue: 'الإيرادات',
      registrations: 'التسجيلات',
      active: 'نشط',
      success: 'ناجح',
      failed: 'فاشل',
      pending: 'معلق',
    },
  };

  const txt = texts[language];

  const monthNames = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      // Fetch payments for revenue chart
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at, status')
        .eq('status', 'completed');

      // Fetch profiles for registration chart
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at');

      // Fetch challenge statuses
      const { data: challenges } = await supabase
        .from('user_challenges')
        .select('status');

      // Process monthly data (last 6 months)
      const now = new Date();
      const monthlyStats: MonthlyData[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthRevenue = (payments || [])
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          })
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const monthRegistrations = (profiles || [])
          .filter(p => {
            const regDate = new Date(p.created_at);
            return regDate >= monthStart && regDate <= monthEnd;
          }).length;

        monthlyStats.push({
          month: monthNames[language][date.getMonth()],
          revenue: monthRevenue,
          registrations: monthRegistrations,
        });
      }

      setMonthlyData(monthlyStats);

      // Process challenge status data
      const statusCounts = {
        active: 0,
        success: 0,
        failed: 0,
        pending: 0,
      };

      (challenges || []).forEach(c => {
        if (c.status in statusCounts) {
          statusCounts[c.status as keyof typeof statusCounts]++;
        }
      });

      setChallengeStatusData([
        { name: txt.active, value: statusCounts.active, color: 'hsl(var(--primary))' },
        { name: txt.success, value: statusCounts.success, color: 'hsl(var(--profit))' },
        { name: txt.failed, value: statusCounts.failed, color: 'hsl(var(--loss))' },
        { name: txt.pending, value: statusCounts.pending, color: 'hsl(var(--muted-foreground))' },
      ]);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Revenue Chart */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">{txt.revenueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, txt.revenue]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Chart */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">{txt.registrationsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [value, txt.registrations]}
                />
                <Bar
                  dataKey="registrations"
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Challenge Status Pie Chart */}
      <Card className="glass-card border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{txt.challengeStatusTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={challengeStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {challengeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCharts;
