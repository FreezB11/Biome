import { motion } from 'framer-motion';
import { Star, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AISearchInput from '@/components/ai/AISearchInput';
import apiClient, { ecommerceAPI } from '@/services/api';
import type { BackendSearchResult } from '@/types';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EcommercePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackendSearchResult | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compare, setCompare] = useState<{
    productId: string;
    comparisons: Array<{ provider: string; price: number; itemUrl: string }>;
    best: { provider: string; price: number; itemUrl: string } | null;
  } | null>(null);

  const runSearch = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setIsLoading(true);
    try {
      const resp = await apiClient.post<BackendSearchResult>('/search/shopping', { query });
      setResult(resp.data);
    } catch {
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const openComparison = async (productId: string) => {
    try {
      const data = await ecommerceAPI.getPriceComparison(productId);
      setCompare({
        productId: data.productId,
        comparisons: data.comparisons,
        best: data.best ?? null,
      });
      setCompareOpen(true);
    } catch {
      setCompare(null);
      setCompareOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/30 to-white">
      <Header />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-r from-amber-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.3),transparent)]" />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🛍️ Shop Smart, Save More
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Find the best products at the lowest prices across Amazon, Flipkart, Myntra, and more
            </p>
            <div className="max-w-xl">
              <AISearchInput
                placeholder="Search for products..."
                onSearch={runSearch}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Instant Comparison',
                description: 'Compare prices across all platforms in seconds',
              },
              {
                icon: '🎟️',
                title: 'Auto Coupon Apply',
                description: 'We apply the best coupons automatically',
              },
              {
                icon: '📉',
                title: 'Price Tracking',
                description: 'Get notified when prices drop',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl bg-amber-50 border border-amber-100 text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-2">{result ? 'Search Results' : 'Trending Products'}</h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLoading ? 'Searching…' : 'Compare prices across platforms and open checkout links.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(result?.items ?? []).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border border-amber-100 overflow-hidden hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center relative">
                  <div className="text-6xl mb-4">🛒</div>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">{product.name}</h3>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {product.rating ?? 0} ({product.reviewsCount ?? 0})
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-orange-600">
                      ₹{product.finalPrice.amount.toLocaleString()}
                    </p>
                    {product.listPrice?.amount && product.listPrice.amount > product.finalPrice.amount && (
                      <p className="text-sm text-muted-foreground line-through">
                        ₹{product.listPrice.amount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Available on {product.provider}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      onClick={() => window.open(product.itemUrl, '_blank')}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Checkout
                    </Button>
                    <Button variant="outline" onClick={() => openComparison(product.id)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Compare
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Price comparison</DialogTitle>
          </DialogHeader>
          {!compare && <div className="text-sm text-muted-foreground">Could not load comparison.</div>}
          {compare && (
            <div className="space-y-3">
              {compare.comparisons.map((c) => (
                <div
                  key={c.provider}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    compare.best?.provider === c.provider ? 'border-amber-300 bg-amber-50' : 'border-amber-100'
                  }`}
                >
                  <div className="font-medium">{c.provider}</div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">₹{Number(c.price).toLocaleString()}</div>
                    <Button size="sm" variant="outline" onClick={() => window.open(c.itemUrl, '_blank')}>
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
