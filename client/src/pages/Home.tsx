import { motion } from 'framer-motion';
import { ArrowRight, Zap, TrendingDown, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import DomainCard from '@/components/shared/DomainCard';
import AISearchInput from '@/components/ai/AISearchInput';
import AIRecommendationCard from '@/components/ai/AIRecommendationCard';
import { DOMAINS, FEATURES, TESTIMONIALS, ECOMMERCE_PLATFORMS } from '@/constants';
import { Link } from 'wouter';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/50 to-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full opacity-20 blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-full opacity-20 blur-3xl"
          />
        </div>

        <div className="container relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-sm font-semibold text-amber-900">
                🚀 AI-Powered Deal Aggregation
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Find the Best Deals
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Across Everything
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={itemVariants}
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Biome uses AI to search across all platforms, apply coupons automatically, predict price drops, and save you money on every purchase.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link
                href="/search"
                className="inline-flex items-center justify-center w-full sm:w-[220px] h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 text-lg font-semibold rounded-lg"
              >
                Start Searching
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Button
                variant="outline"
                className="w-full sm:w-[220px] h-14 px-8 text-lg font-semibold border-2 border-amber-200 hover:bg-amber-50 rounded-lg"
              >
                Watch Demo
              </Button>
            </motion.div>

            {/* AI Search Input */}
            <motion.div variants={itemVariants} className="mb-12">
              <AISearchInput
                placeholder="Try: 'Laptop under ₹70,000' or 'Biryani delivery'"
                onSearch={(query) => console.log('Search:', query)}
              />
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-4 md:gap-8 text-center"
            >
              {[
                { number: '₹5Cr+', label: 'Saved by Users' },
                { number: '500K+', label: 'Active Users' },
                { number: '5', label: 'Domains Covered' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl md:text-3xl font-bold text-amber-600">{stat.number}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Domain Showcase */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Shop Across All Domains
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From shopping to food, rides to travel, we've got you covered
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Object.entries(DOMAINS).map(([key, domain], idx) => (
              <DomainCard
                key={key}
                icon={domain.icon}
                label={domain.label}
                description={domain.description}
                href={`/${key}`}
                color={domain.color}
                delay={idx * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-amber-50 to-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose Biome?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to save you time and money
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Recommendations Preview */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              AI-Powered Recommendations
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how Biome finds the best deals for you
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AIRecommendationCard
              title="Gaming Laptop"
              description="RTX 4060 • 16GB RAM • 512GB SSD"
              savings={5200}
              confidence={0.95}
              platform="Flipkart"
              icon="💻"
              delay={0}
            />
            <AIRecommendationCard
              title="Biryani Delivery"
              description="Hyderabadi style • 2 portions • Free dessert"
              savings={150}
              confidence={0.88}
              platform="Swiggy"
              icon="🍛"
              delay={0.1}
            />
            <AIRecommendationCard
              title="Airport Ride"
              description="Premium cab • 4.9 rating • 6 min ETA"
              savings={320}
              confidence={0.92}
              platform="Uber"
              icon="🚗"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Platform Integrations */}
      <section className="py-20 bg-gradient-to-b from-white to-amber-50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Integrated with Top Platforms
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We search across all your favorite platforms
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8 items-center">
            {ECOMMERCE_PLATFORMS.map((platform, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <span className="text-2xl">{platform.logo}</span>
                <span className="font-semibold text-foreground">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Thousands
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real users, real savings
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{testimonial.image}</div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-lg">⭐</span>
                  ))}
                </div>
                <p className="text-foreground italic">"{testimonial.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.3),transparent)]" />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Save Money?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of users who are already saving with Biome
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-md"
            >
              Start Searching Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
