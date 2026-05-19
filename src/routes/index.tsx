import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Mic,
  QrCode,
  ChefHat,
  Bell,
  Building2,
  BarChart3,
  Sparkles,
  Wifi,
  ShieldCheck,
  ArrowRight,
  Check,
  Play,
  Star,
} from "lucide-react";
import heroImg from "@/assets/orderflow-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrderFlow AI — Smart ordering for every table" },
      {
        name: "description",
        content:
          "AI-powered QR & voice ordering for restaurants. Multi-tenant SaaS with real-time kitchen flow, waiter calls, and analytics. Set up in minutes.",
      },
      { property: "og:title", content: "OrderFlow AI — Smart ordering for every table" },
      {
        property: "og:description",
        content: "AI-powered QR & voice ordering for restaurants. Set up in minutes.",
      },
    ],
  }),
  component: LandingPage,
});

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
        <Mic className="h-4 w-4 text-white" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        OrderFlow <span className="text-primary">AI</span>
      </span>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
              <Link to="/auth">
                Get started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute left-1/3 top-40 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-20 text-center md:pt-24 md:pb-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI Voice Ordering · Now in beta
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            AI-Powered Ordering for Restaurants —
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {" "}QR & Voice in seconds
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Smart ordering for every table. Customers scan, speak, or tap — orders flow straight
            to your kitchen in real time. No app install. No waitstaff bottleneck.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-primary px-7 text-base hover:bg-primary/90">
              <Link to="/auth">
                Sign up as a Restaurant
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-7 text-base">
              <a href="#demo">
                <Play className="mr-1 h-4 w-4" />
                Watch Demo
              </a>
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Free trial</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Setup in 5 min</span>
          </div>

          {/* Hero product shot */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10">
              <img
                src={heroImg}
                alt="OrderFlow AI dashboards on phone, tablet, and laptop"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border/60 bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted by modern restaurants worldwide
          </p>
          <div className="mt-5 grid grid-cols-2 gap-6 text-center text-sm font-semibold text-muted-foreground sm:grid-cols-3 md:grid-cols-6">
            {["Sora Kitchen", "Geni Geni", "Bistro 21", "Nori House", "La Tavola", "The Counter"].map(
              (n) => (
                <div key={n} className="opacity-70 transition hover:opacity-100">{n}</div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything your restaurant needs to run faster
          </h2>
          <p className="mt-4 text-muted-foreground">
            From the moment a guest sits down to the kitchen ticket — one platform, zero friction.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Mic,
              title: "AI Voice Ordering",
              desc: "Guests press the mic and speak naturally. Our AI parses items, modifiers, and quantities.",
            },
            {
              icon: QrCode,
              title: "QR Table Ordering",
              desc: "Each table gets a unique QR. No app install, instant menu, instant ordering.",
            },
            {
              icon: Wifi,
              title: "Wi-Fi Splash Onboarding",
              desc: "Guests join your Wi-Fi and land directly on the menu — frictionless first touch.",
            },
            {
              icon: ChefHat,
              title: "Real-time Kitchen Flow",
              desc: "Orders appear instantly. Kitchen and bar stations sync, status updates live.",
            },
            {
              icon: Bell,
              title: "Call Waiter / Help",
              desc: "Request bill, refill water, or call a server in one tap — staff get a buzz.",
            },
            {
              icon: Building2,
              title: "Multi-tenant by design",
              desc: "Run multiple restaurants and branches with isolated data, branding, and staff.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">From scan to served — in minutes</h2>
            <p className="mt-4 text-muted-foreground">Three simple steps. Zero training required.</p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", title: "Guest scans QR or joins Wi-Fi", desc: "Lands on a beautifully branded menu — your colors, your logo." },
              { n: "02", title: "Tap or speak the order", desc: "Type, tap, or use the AI mic to add items conversationally." },
              { n: "03", title: "Kitchen prepares & serves", desc: "Tickets stream live to the right station. Status flows back to the guest." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border/60 bg-card p-6">
                <div className="text-3xl font-bold text-primary/30">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Demo */}
      <section id="demo" className="container mx-auto px-4 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Built for premium hospitality
            </h2>
            <p className="mt-4 text-muted-foreground">
              OrderFlow AI brings Stripe-level polish to restaurant ordering. Real-time, multi-tenant,
              and fully white-label — your brand stays front and center.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              {[
                { v: "30%", l: "Faster table turns" },
                { v: "5 min", l: "To onboard" },
                { v: "99.9%", l: "Uptime SLA" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-3xl font-bold text-primary">{s.v}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link to="/auth">Start free trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Talk to sales</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 blur-2xl" />
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <div className="ml-3 text-xs text-muted-foreground">orderflow.ai/kitchen</div>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  { t: "Table 12 · Order #2041", s: "Preparing", c: "bg-amber-500/10 text-amber-600" },
                  { t: "Table 4 · Order #2040", s: "Ready", c: "bg-emerald-500/10 text-emerald-600" },
                  { t: "Table 9 · Order #2039", s: "New", c: "bg-primary/10 text-primary" },
                ].map((o, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3 text-sm">
                    <span className="font-medium">{o.t}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${o.c}`}>{o.s}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                42 orders today · $1,284 revenue · 18 min avg prep
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground">Start free. Scale when you grow.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { name: "Starter", price: "$0", desc: "1 branch · up to 10 tables", featured: false, cta: "Start free" },
              { name: "Growth", price: "$49", desc: "3 branches · unlimited tables · AI voice", featured: true, cta: "Try Growth" },
              { name: "Enterprise", price: "Custom", desc: "Multi-restaurant · SSO · SLA", featured: false, cta: "Contact sales" },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-7 ${
                  p.featured
                    ? "border-primary bg-card shadow-xl shadow-primary/10"
                    : "border-border/60 bg-card"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {p.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <Button
                  asChild
                  className={`mt-6 w-full ${p.featured ? "bg-primary hover:bg-primary/90" : ""}`}
                  variant={p.featured ? "default" : "outline"}
                >
                  <Link to="/auth">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="container mx-auto px-4 py-20 md:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card p-10 text-center">
          <div className="flex justify-center gap-1 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-4 text-xl font-medium leading-relaxed">
            “OrderFlow AI cut our table turn time by a third. The voice ordering wows every guest —
            it feels like the future of dining.”
          </p>
          <div className="mt-5 text-sm text-muted-foreground">
            Maya Chen · Owner, Sora Kitchen
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-12 text-center text-white shadow-2xl shadow-primary/30">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
          <ShieldCheck className="mx-auto h-10 w-10 opacity-90" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to give every table a smarter ordering experience?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Set up in 5 minutes. Cancel anytime. No credit card required.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link to="/auth">Sign up as a Restaurant</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <a href="#demo">Watch demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Smart ordering for every table. Built for modern restaurants.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
              <li><a href="#" className="hover:text-foreground">Careers</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Get started</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">Restaurant sign in</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Create account</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
            <div>© {new Date().getFullYear()} OrderFlow AI. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
