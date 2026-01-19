import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { usePriceAlerts, PriceAlert } from "@/hooks/usePriceAlerts";
import { useNotifications } from "@/hooks/useNotifications";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

const AVAILABLE_ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "XAU", name: "Gold" },
];

const PriceAlerts = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { alerts, isLoading, createAlert, deleteAlert, toggleAlert } = usePriceAlerts();
  const { permission, requestPermission, sendNotification, isSupported } = useNotifications();
  const { prices } = useMarketPrices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const triggeredAlertsRef = useRef<Set<string>>(new Set());

  const content = {
    en: {
      title: "Price Alerts",
      subtitle: "Get notified when prices hit your targets",
      createAlert: "Create Alert",
      asset: "Asset",
      targetPrice: "Target Price",
      condition: "Condition",
      above: "Above",
      below: "Below",
      active: "Active",
      triggered: "Triggered",
      noAlerts: "No alerts set",
      enableNotifications: "Enable Notifications",
      notificationsEnabled: "Notifications Enabled",
      notificationsBlocked: "Notifications Blocked",
      create: "Create",
      cancel: "Cancel",
      loginRequired: "Login to set alerts",
    },
    fr: {
      title: "Alertes de Prix",
      subtitle: "Soyez notifié quand les prix atteignent vos objectifs",
      createAlert: "Créer une Alerte",
      asset: "Actif",
      targetPrice: "Prix Cible",
      condition: "Condition",
      above: "Au-dessus",
      below: "En-dessous",
      active: "Active",
      triggered: "Déclenchée",
      noAlerts: "Aucune alerte définie",
      enableNotifications: "Activer les Notifications",
      notificationsEnabled: "Notifications Activées",
      notificationsBlocked: "Notifications Bloquées",
      create: "Créer",
      cancel: "Annuler",
      loginRequired: "Connectez-vous pour définir des alertes",
    },
    ar: {
      title: "تنبيهات الأسعار",
      subtitle: "احصل على إشعارات عندما تصل الأسعار إلى أهدافك",
      createAlert: "إنشاء تنبيه",
      asset: "الأصل",
      targetPrice: "السعر المستهدف",
      condition: "الشرط",
      above: "فوق",
      below: "تحت",
      active: "نشط",
      triggered: "مُفعَّل",
      noAlerts: "لا توجد تنبيهات",
      enableNotifications: "تفعيل الإشعارات",
      notificationsEnabled: "الإشعارات مفعلة",
      notificationsBlocked: "الإشعارات محظورة",
      create: "إنشاء",
      cancel: "إلغاء",
      loginRequired: "سجل الدخول لتعيين التنبيهات",
    },
  };

  const t = content[language as keyof typeof content] || content.en;

  // Check alerts against current prices
  useEffect(() => {
    if (!prices || alerts.length === 0) return;

    alerts.forEach((alert) => {
      if (!alert.is_active || alert.triggered_at) return;
      if (triggeredAlertsRef.current.has(alert.id)) return;

      const currentPrice = prices[alert.asset_symbol];
      if (!currentPrice) return;

      const shouldTrigger =
        (alert.condition === "above" && currentPrice >= alert.target_price) ||
        (alert.condition === "below" && currentPrice <= alert.target_price);

      if (shouldTrigger) {
        triggeredAlertsRef.current.add(alert.id);
        
        // Send notification
        sendNotification(`${alert.asset_symbol} Price Alert!`, {
          body: `${alert.asset_symbol} is now ${alert.condition === "above" ? "above" : "below"} $${alert.target_price.toLocaleString()}. Current: $${currentPrice.toLocaleString()}`,
          tag: alert.id,
          requireInteraction: true,
        });

        // Also show toast for in-app notification
        console.log(`Alert triggered: ${alert.asset_symbol} ${alert.condition} $${alert.target_price}`);
      }
    });
  }, [prices, alerts, sendNotification]);

  const handleCreateAlert = async () => {
    if (!targetPrice || !selectedAsset) return;

    await createAlert(selectedAsset, parseFloat(targetPrice), condition);
    setTargetPrice("");
    setIsDialogOpen(false);
  };

  const getCurrentPrice = (symbol: string) => {
    return prices?.[symbol] || 0;
  };

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t.loginRequired}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" dir={language === "ar" ? "rtl" : "ltr"}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Permission Button */}
          {isSupported && permission !== "granted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestPermission}
              className="flex items-center gap-2"
            >
              <BellOff className="h-4 w-4" />
              {t.enableNotifications}
            </Button>
          )}
          {permission === "granted" && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500">
              <Bell className="h-3 w-3 mr-1" />
              {t.notificationsEnabled}
            </Badge>
          )}
          {permission === "denied" && (
            <Badge variant="outline" className="bg-red-500/10 text-red-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t.notificationsBlocked}
            </Badge>
          )}

          {/* Create Alert Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t.createAlert}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.createAlert}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t.asset}</label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ASSETS.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                          <span className="text-muted-foreground ml-2">
                            (${getCurrentPrice(asset.symbol).toLocaleString()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t.condition}</label>
                  <Select value={condition} onValueChange={(v) => setCondition(v as "above" | "below")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          {t.above}
                        </div>
                      </SelectItem>
                      <SelectItem value="below">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          {t.below}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t.targetPrice}</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    {t.cancel}
                  </Button>
                  <Button onClick={handleCreateAlert} className="flex-1">
                    {t.create}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t.noAlerts}</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                currentPrice={getCurrentPrice(alert.asset_symbol)}
                onDelete={deleteAlert}
                onToggle={toggleAlert}
                t={t}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface AlertItemProps {
  alert: PriceAlert;
  currentPrice: number;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  t: Record<string, string>;
}

const AlertItem = ({ alert, currentPrice, onDelete, onToggle, t }: AlertItemProps) => {
  const progress =
    alert.condition === "above"
      ? Math.min((currentPrice / alert.target_price) * 100, 100)
      : Math.min((alert.target_price / currentPrice) * 100, 100);

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            alert.condition === "above"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {alert.condition === "above" ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            {alert.asset_symbol}
            <Badge variant={alert.is_active ? "default" : "secondary"} className="text-xs">
              {alert.is_active ? t.active : t.triggered}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {alert.condition === "above" ? t.above : t.below} ${alert.target_price.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Current: ${currentPrice.toLocaleString()} ({progress.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={alert.is_active}
          onCheckedChange={(checked) => onToggle(alert.id, checked)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(alert.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PriceAlerts;
