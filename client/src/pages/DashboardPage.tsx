import { motion } from 'framer-motion';
import { ArrowLeft, BadgePercent, ChevronRight, CreditCard, Gift, History, Sparkles, TrendingUp, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { paymentsAPI } from '@/services/api';
import { toast } from 'sonner';

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export default function DashboardPage() {
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('1');
  const [payPhone, setPayPhone] = useState('9999999999');
  const [payEmail, setPayEmail] = useState('test@example.com');
  const [isPaying, setIsPaying] = useState(false);
  const [lastIntentId, setLastIntentId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const isMobile = useMemo(() => window.matchMedia?.('(max-width: 767px)')?.matches ?? true, []);

  const returnUrl = useMemo(() => `${window.location.origin}/dashboard`, []);
  const notifyUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL as string | undefined;
    const apiOrigin =
      typeof configured === 'string' && configured.startsWith('http')
        ? new URL(configured).origin
        : window.location.origin;
    return `${apiOrigin}/api/payments/webhooks/cashfree`;
  }, []);

  const loadCashfreeSdk = async () => {
    if (window.Cashfree) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-cashfree-sdk="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('CASHFREE_SDK_LOAD_FAILED')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.dataset.cashfreeSdk = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('CASHFREE_SDK_LOAD_FAILED'));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const fromStorage = window.localStorage.getItem('lastPaymentIntentId');
    if (fromStorage && !lastIntentId) setLastIntentId(fromStorage);
    const qs = new URLSearchParams(window.location.search);
    const orderId =
      qs.get('order_id') || qs.get('orderId') || qs.get('cf_order_id') || qs.get('cashfree_order_id');
    const txStatus =
      qs.get('txStatus') || qs.get('tx_status') || qs.get('payment_status') || qs.get('status');
    if (orderId || txStatus) {
      toast.message('Returned from payment', {
        description: [orderId ? `order_id=${orderId}` : null, txStatus ? `status=${txStatus}` : null]
          .filter(Boolean)
          .join(' • '),
      });
    }
  }, []);

  useEffect(() => {
    if (!lastIntentId) return;
    window.localStorage.setItem('lastPaymentIntentId', lastIntentId);

    let lastSeen: string | null = null;
    const t = window.setInterval(async () => {
      try {
        const data = await paymentsAPI.getIntent(lastIntentId);
        const status = data?.status || data?.intent?.status;
        if (typeof status === 'string') {
          setLastStatus(status);
          if (status !== lastSeen && (status === 'PAID' || status === 'FAILED' || status === 'CANCELLED')) {
            lastSeen = status;
            if (status === 'PAID') toast.success('Payment successful.');
            else toast.error(`Payment ${status.toLowerCase()}.`);
          }
          if (status === 'PAID' || status === 'FAILED' || status === 'CANCELLED') window.clearInterval(t);
        }
      } catch {
        return;
      }
    }, 2500);
    return () => window.clearInterval(t);
  }, [lastIntentId]);

  if (isMobile) {
    return (
      <div className="mobile-stage">
        <div className="fit-shell">
          <div className="phone-screen">
            <section className="screen" style={{ paddingTop: 16, paddingBottom: 18 }}>
              <div className="flex items-center justify-between">
                <button className="app-icon-ghost" type="button" aria-label="Back" onClick={() => (window.location.href = '/home')}>
                  <ArrowLeft size={22} strokeWidth={2.4} />
                </button>
                <div className="text-xs font-extrabold tracking-wide text-muted-foreground">PAYMENTS &amp; OFFERS</div>
                <button className="app-icon-ghost" type="button" aria-label="Apply coupon">
                  <BadgePercent size={22} strokeWidth={2.2} className="text-green-700" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-green-100 bg-green-50/80 p-4">
                  <div className="text-xs font-bold text-green-700">SAVED THIS SESSION</div>
                  <div className="mt-2 text-4xl font-extrabold text-foreground">104₹</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-muted-foreground">SAVINGS TREND</div>
                    <div className="text-xs font-bold text-green-700">+12%</div>
                  </div>
                  <div className="mt-3 flex items-end gap-1.5 h-[44px]">
                    {[10, 18, 26, 36, 44].map((h, i) => (
                      <div key={i} className={`w-full rounded-md ${i === 4 ? 'bg-green-700' : 'bg-green-200'}`} style={{ height: h }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-extrabold text-foreground">Next Recommended Step</div>
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-orange-800 truncate">Compare with Samsung S23</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">Users often cross-check specs before finalizing.</div>
                    </div>
                    <button className="w-10 h-10 rounded-2xl bg-orange-600 text-white grid place-items-center" type="button" aria-label="Go">
                      <ChevronRight size={22} strokeWidth={2.6} />
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">Applied Student Discount</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">Save an additional ₹5,000+ with UniDays.</div>
                    </div>
                    <ChevronRight size={20} strokeWidth={2.4} className="text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-extrabold text-foreground">Saved Methods</div>
                <div className="mt-3 rounded-2xl border border-orange-100 bg-white/95 p-4 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground truncate">HDFC Card •••• 4242</div>
                    <div className="text-xs text-muted-foreground">Expires 12/28</div>
                  </div>
                  <div className="w-3 h-3 rounded-full border-4 border-orange-500" />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-foreground">UPI Deals</div>
                  <button className="text-xs font-extrabold text-green-700" type="button">View All</button>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { title: 'Google Pay', subtitle: 'Flat ₹50 Cashback' },
                    { title: 'PhonePe', subtitle: 'Win up to ₹500 scratch card' },
                    { title: 'BHIM UPI', subtitle: 'No active offers available' },
                  ].map((x) => (
                    <div key={x.title} className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Wallet className="w-5 h-5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">{x.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{x.subtitle}</div>
                        </div>
                      </div>
                      <ChevronRight size={18} strokeWidth={2.4} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-100 bg-white/95 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-foreground">Bundle Suggestions</div>
                  <button className="text-xs font-extrabold text-green-700" type="button">View All</button>
                </div>
                <div className="mt-3 space-y-3">
                  {[
                    { title: 'Apple iPhone 14 Pro Max', subtitle: 'Deep Purple • 256GB' },
                    { title: 'Gossen Pro Audio', subtitle: 'Studio Grade • Wireless' },
                  ].map((b) => (
                    <div key={b.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Sparkles className="w-5 h-5 text-orange-600" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">{b.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{b.subtitle}</div>
                        </div>
                      </div>
                      <button className="w-9 h-9 rounded-xl border border-orange-200 bg-orange-50 grid place-items-center" type="button" aria-label="Add">
                        <span className="text-xl font-black text-orange-700">+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="app-bottom-nav">
                <Button className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold" onClick={() => setPaymentsOpen(true)}>
                  confirm ₹ 2000
                </Button>
              </div>

              <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Pay with Cashfree</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount" inputMode="numeric" />
                    <Input value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="Phone" inputMode="tel" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentsOpen(false)}>Close</Button>
                    <Button
                      disabled={isPaying}
                      onClick={async () => {
                        const amt = Number(payAmount);
                        if (!Number.isFinite(amt) || amt <= 0) {
                          toast.error('Enter a valid amount.');
                          return;
                        }
                        setIsPaying(true);
                        try {
                          const created = await paymentsAPI.createIntent({
                            money: { amount: amt, currency: 'INR' },
                            customer: { customerId: `user_${payPhone || 'anon'}`, customerPhone: payPhone, customerEmail: payEmail },
                            returnUrl,
                            notifyUrl,
                            idempotencyKey: `demo_${Date.now()}`,
                          });
                          const intent = created?.intent;
                          const checkout = created?.checkout;
                          if (!intent?.intentId || !checkout?.paymentSessionId) throw new Error('PAYMENT_INTENT_CREATE_FAILED');
                          setLastIntentId(intent.intentId);
                          setLastStatus(intent.status);
                          window.localStorage.setItem('lastPaymentIntentId', intent.intentId);
                          await loadCashfreeSdk();
                          const cashfree = window.Cashfree?.({ mode: checkout?.env || 'sandbox' });
                          await cashfree?.checkout({ paymentSessionId: checkout.paymentSessionId, redirectTarget: '_modal' });
                        } catch {
                          toast.error('Payment init failed.');
                        } finally {
                          setIsPaying(false);
                        }
                      }}
                    >
                      {isPaying ? 'Starting…' : 'Pay'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {lastIntentId && (
                <div className="mt-4 text-xs text-muted-foreground">
                  intent: <span className="font-mono">{lastIntentId}</span>
                  {lastStatus ? <> • status: <span className="font-semibold">{lastStatus}</span></> : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: TrendingUp,
      label: 'Total Savings',
      value: '₹24,580',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: Gift,
      label: 'Cashback Earned',
      value: '₹3,240',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Zap,
      label: 'Deals Used',
      value: '47',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: History,
      label: 'Orders',
      value: '32',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const recentPurchases = [
    {
      id: '1',
      item: 'Gaming Laptop',
      date: 'May 5, 2026',
      amount: 64999,
      savings: 5200,
      cashback: 650,
      platform: 'Flipkart',
    },
    {
      id: '2',
      item: 'Biryani Delivery',
      date: 'May 4, 2026',
      amount: 299,
      savings: 150,
      cashback: 15,
      platform: 'Swiggy',
    },
    {
      id: '3',
      item: 'Airport Ride',
      date: 'May 3, 2026',
      amount: 320,
      savings: 120,
      cashback: 16,
      platform: 'Uber',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/30 to-white">
      <Header />

      <div className="container py-12">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">
            Here's your savings summary and recent activity
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-2xl bg-gradient-to-br ${stat.color} p-6 text-white shadow-lg`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Purchases */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-amber-100 p-6">
              <h2 className="text-2xl font-bold mb-6">Recent Purchases</h2>
              <div className="space-y-4">
                {recentPurchases.map((purchase, idx) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="border border-amber-100 rounded-lg p-4 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {purchase.item}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {purchase.date} • {purchase.platform}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-foreground">
                        ₹{purchase.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex-1 bg-green-50 rounded p-2">
                        <p className="text-muted-foreground">You Saved</p>
                        <p className="font-semibold text-green-600">
                          ₹{purchase.savings}
                        </p>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded p-2">
                        <p className="text-muted-foreground">Cashback</p>
                        <p className="font-semibold text-blue-600">
                          ₹{purchase.cashback}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-6">
                View All Purchases
              </Button>
            </div>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rewards Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg"
            >
              <h3 className="font-bold text-lg mb-2">Available Rewards</h3>
              <p className="text-3xl font-bold mb-4">₹3,240</p>
              <Button className="w-full bg-white text-orange-600 hover:bg-gray-100 font-semibold">
                Redeem Now
              </Button>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-amber-100 p-6"
            >
              <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  🔔 Price Alerts
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setPaymentsOpen(true)}
                >
                  💳 Test Cashfree Payment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  ❤️ Saved Deals
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  ⚙️ Preferences
                </Button>
              </div>
            </motion.div>

            {/* Tier Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-amber-100 p-6"
            >
              <h3 className="font-bold text-lg mb-4">Member Tier</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Gold</span>
                  <span className="text-sm text-muted-foreground">Level 3</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full w-3/4" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                ₹500 more to reach Platinum tier
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cashfree payment (test)</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount (INR)"
              inputMode="decimal"
            />
            <Input
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              placeholder="Phone"
              inputMode="tel"
            />
            <Input
              value={payEmail}
              onChange={(e) => setPayEmail(e.target.value)}
              placeholder="Email"
              inputMode="email"
            />

            {lastIntentId && (
              <div className="text-sm text-muted-foreground">
                Intent: <span className="font-mono">{lastIntentId}</span>
                {lastStatus ? <> • Status: <span className="font-semibold">{lastStatus}</span></> : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLastIntentId(null);
                setLastStatus(null);
                setPaymentsOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              disabled={isPaying}
              onClick={async () => {
                const amt = Number(payAmount);
                if (!Number.isFinite(amt) || amt <= 0) {
                  toast.error('Enter a valid amount.');
                  return;
                }
                setIsPaying(true);
                try {
                  const created = await paymentsAPI.createIntent({
                    money: { amount: amt, currency: 'INR' },
                    customer: {
                      customerId: `user_${payPhone || 'anon'}`,
                      customerPhone: payPhone,
                      customerEmail: payEmail,
                    },
                    returnUrl,
                    notifyUrl,
                    idempotencyKey: `demo_${Date.now()}`,
                  });

                  const intent = created?.intent;
                  const checkout = created?.checkout;
                  if (!intent?.intentId || !checkout?.paymentSessionId) {
                    throw new Error('PAYMENT_INTENT_CREATE_FAILED');
                  }

                  setLastIntentId(intent.intentId);
                  setLastStatus(intent.status);
                  window.localStorage.setItem('lastPaymentIntentId', intent.intentId);

                  await loadCashfreeSdk();
                  const cashfree = window.Cashfree?.({ mode: checkout?.env || 'sandbox' });
                  await cashfree?.checkout({
                    paymentSessionId: checkout.paymentSessionId,
                    redirectTarget: '_modal',
                  });
                } catch {
                  toast.error('Payment init failed.');
                } finally {
                  setIsPaying(false);
                }
              }}
            >
              {isPaying ? 'Starting…' : 'Pay with Cashfree'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
