'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FeatureCard } from '@/components/feature-card'
import { PricingCard } from '@/components/pricing-card'
import { Search, Bell, TrendingUp, FileText, Shield, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">CompetitorPulse</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="#features">Features</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              Track Your Competitors in Real-Time
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground text-pretty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              Stay ahead of the competition with automated monitoring, intelligent alerts, and AI-powered insights.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Button size="lg" asChild>
                <Link href="/signup">Start Tracking Competitors</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </motion.div>

            {/* Small feature preview cards */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { label: 'Real-time', value: '24/7' },
                { label: 'Competitors', value: '100+' },
                { label: 'Reports', value: 'AI' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border bg-card p-4 text-center"
                >
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="rounded-xl border bg-card p-6 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  Live Dashboard
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-muted"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 bg-muted/30">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Powerful Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to stay ahead of your competition
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Track Changes"
            description="Monitor competitor websites for changes in pricing, features, content, and more with real-time notifications."
            icon={Search}
            index={0}
          />
          <FeatureCard
            title="Intelligent Alerts"
            description="Get notified instantly when competitors make significant changes with customizable alert rules."
            icon={Bell}
            index={1}
          />
          <FeatureCard
            title="AI Reports"
            description="Generate comprehensive competitor analysis reports powered by AI to identify trends and opportunities."
            icon={FileText}
            index={2}
          />
          <FeatureCard
            title="Market Insights"
            description="Discover market trends and competitive positioning with advanced analytics and visualizations."
            icon={TrendingUp}
            index={3}
          />
          <FeatureCard
            title="Secure & Private"
            description="Enterprise-grade security ensures your competitive intelligence stays confidential and protected."
            icon={Shield}
            index={4}
          />
          <FeatureCard
            title="Lightning Fast"
            description="Get results in seconds with our optimized scanning engine and real-time processing infrastructure."
            icon={Zap}
            index={5}
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <PricingCard
            name="Basic"
            price="$29"
            description="Perfect for startups"
            features={[
              'Track up to 10 competitors',
              'Daily change detection',
              'Email alerts',
              'Basic reports',
              'Community support',
            ]}
            index={0}
            onGetStarted={() => window.location.href = '/pricing'}
          />
          <PricingCard
            name="Pro"
            price="$99"
            description="For growing businesses"
            features={[
              'Track up to 30 competitors',
              'Real-time change detection',
              'Priority alerts',
              'AI-powered reports',
              'API access',
              'Priority support',
            ]}
            highlighted
            index={1}
            onGetStarted={() => window.location.href = '/pricing'}
          />
          <PricingCard
            name="Enterprise"
            price="Custom"
            description="For large organizations"
            features={[
              'Track up to 100 competitors',
              'Real-time detection',
              'Custom alerts & workflows',
              'Advanced AI insights',
              'White-label options',
              'Dedicated support',
            ]}
            index={2}
            onGetStarted={() => window.location.href = '/pricing'}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2025 CompetitorPulse. All rights reserved.</p>
            <nav className="flex gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="#">Privacy</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="#">Terms</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="#">Contact</Link>
              </Button>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}

