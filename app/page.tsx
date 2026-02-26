import Link from "next/link";

const features = [
  {
    icon: "📡",
    title: "Real Twitter Trends",
    desc: "Fetch live worldwide + USA trending topics. Match your idea against real-time trend signals and hashtag momentum.",
    color: "from-violet-500/15 to-violet-900/5",
    border: "border-violet-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]",
    tag: "twitterapi.io trends",
  },
  {
    icon: "📊",
    title: "Demand Check",
    desc: "Measure tweet volume, sentiment and engagement over 7 and 30 days. See exactly how many people are talking about your problem.",
    color: "from-blue-500/15 to-blue-900/5",
    border: "border-blue-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]",
    tag: "7-day + 30-day signals",
  },
  {
    icon: "🎯",
    title: "Find Early Adopters",
    desc: "Filter pain-signal tweets to find real users already struggling with your problem — your first potential customers.",
    color: "from-emerald-500/15 to-emerald-900/5",
    border: "border-emerald-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(52,211,153,0.15)]",
    tag: "pain signal detection",
  },
  {
    icon: "💰",
    title: "Find Funders",
    desc: "Search investor profiles and VC discussions. Identify angels and funds already active in your problem space.",
    color: "from-amber-500/15 to-amber-900/5",
    border: "border-amber-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(251,191,36,0.15)]",
    tag: "/twitter/user/search",
  },
  {
    icon: "🌐",
    title: "Tavily Web Intelligence",
    desc: "Deep web research on market size, competitors, and funding landscape. Multi-source synthesis with streaming updates.",
    color: "from-cyan-500/15 to-cyan-900/5",
    border: "border-cyan-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]",
    tag: "tavily deep research",
  },
  {
    icon: "🟣",
    title: "Gemini AI Synthesis",
    desc: "Gemini 2.0 Flash analyses all collected data to produce a scored verdict, issues, best points, idea changes, and top funders.",
    color: "from-purple-500/15 to-purple-900/5",
    border: "border-purple-500/25",
    glow: "hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]",
    tag: "gemini 2.0 flash",
  },
];

const pipeline = [
  { n: 1, label: "Plan Queries",   icon: "🧠", color: "text-indigo-400" },
  { n: 2, label: "Fetch Trends",   icon: "📡", color: "text-violet-400" },
  { n: 3, label: "Demand Check",   icon: "📊", color: "text-blue-400" },
  { n: 4, label: "Find Adopters",  icon: "🎯", color: "text-emerald-400" },
  { n: 5, label: "Find Funders",   icon: "💰", color: "text-amber-400" },
  { n: 6, label: "Communities",    icon: "💬", color: "text-pink-400" },
  { n: 7, label: "Web Research",   icon: "🌐", color: "text-cyan-400" },
  { n: 8, label: "AI Synthesis",   icon: "🟣", color: "text-purple-400" },
];

export default function LandingPage() {
  return (
    <>
      {/* Animated background layers */}
      <div className="mesh-bg" aria-hidden />
      <div className="grid-overlay" aria-hidden />
      <div className="orb orb-1" aria-hidden />
      <div className="orb orb-2" aria-hidden />

      <div className="relative z-10 min-h-screen text-white">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5 glass sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="text-xl hero-float inline-block">🚀</span>
            <span className="font-bold text-white/90 text-sm tracking-wide">StartupValidator</span>
            <span className="text-[10px] text-white/25 font-mono bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">v4</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/25 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              8-node AI pipeline live
            </div>
            <Link href="/validate"
              className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
              Launch App →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
          <div className="fade-slide-up fade-slide-up-1 inline-flex items-center gap-2 glass border border-indigo-500/25 rounded-full px-5 py-2 text-xs text-indigo-300/70 mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Twitter API · Tavily Web Research · Gemini 2.0 Flash · GPT-4o-mini
          </div>

          <h1 className="fade-slide-up fade-slide-up-2 text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05] mb-6">
            Does the World{" "}
            <span className="gradient-text">Need</span>{" "}
            Your Startup?
          </h1>

          <p className="fade-slide-up fade-slide-up-3 text-lg text-white/40 max-w-xl leading-relaxed mb-4">
            Stop guessing. Get a data-backed verdict using live Twitter signals,
            web intelligence, and AI analysis — in minutes.
          </p>

          <p className="fade-slide-up fade-slide-up-3 text-sm text-white/25 font-mono mb-12">
            Issues · Best Points · How to Change the Idea · Top Funders · Web Research
          </p>

          <div className="fade-slide-up fade-slide-up-4 flex flex-col sm:flex-row gap-4 items-center">
            <Link href="/validate"
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-full transition-all text-sm shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] tracking-wide">
              <span className="relative z-10">Validate Your Idea →</span>
              <div className="absolute inset-0 shimmer" />
            </Link>
            <a href="#pipeline"
              className="glass border border-white/10 text-white/50 hover:text-white hover:border-white/25 font-medium px-8 py-4 rounded-full transition-all text-sm">
              See how it works
            </a>
          </div>

          {/* Stats row */}
          <div className="fade-slide-up mt-16 flex flex-wrap items-center justify-center gap-8 text-center">
            {[
              { n: "8",     label: "AI Pipeline Nodes" },
              { n: "26+",   label: "Twitter Endpoints" },
              { n: "∞",     label: "Web Sources" },
              { n: "Real",  label: "Time Streaming" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-3xl font-bold gradient-text">{s.n}</span>
                <span className="text-xs text-white/30 mt-1 font-mono">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline Visualization */}
        <section id="pipeline" className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              The <span className="gradient-text">8-Node</span> Pipeline
            </h2>
            <p className="text-white/35 text-sm max-w-lg mx-auto">
              Every validation runs through a full LangGraph pipeline — streaming every step live to your terminal.
            </p>
          </div>

          <div className="flex items-center justify-center flex-wrap gap-2">
            {pipeline.map((p, i) => (
              <div key={p.n} className="flex items-center gap-2">
                <div className="glass border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px] hover:border-white/20 transition-all hover:scale-105 group cursor-default">
                  <div className="text-xl mb-1">{p.icon}</div>
                  <div className={`text-[10px] font-bold ${p.color} group-hover:opacity-100 opacity-70 transition-opacity`}>{p.label}</div>
                  <div className="text-[9px] text-white/20 font-mono mt-0.5">node {p.n}</div>
                </div>
                {i < pipeline.length - 1 && (
                  <span className="text-white/15 text-lg">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Transport badges */}
          <div className="flex justify-center gap-3 mt-8">
            {[
              { label: "WebSocket", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
              { label: "SSE fallback", cls: "bg-sky-500/10 text-sky-400 border-sky-500/25" },
              { label: "Real-time streaming", cls: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
            ].map(b => (
              <span key={b.label} className={`text-xs font-mono px-3 py-1 rounded-full border ${b.cls}`}>{b.label}</span>
            ))}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Six <span className="gradient-text-gold">Intelligence Layers</span>
            </h2>
            <p className="text-white/35 text-sm">Every idea gets all six analyses combined into one verdict.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title}
                className={`relative glass rounded-2xl border ${f.border} bg-gradient-to-br ${f.color} p-6 overflow-hidden transition-all duration-300 ${f.glow} hover:scale-[1.02] cursor-default group`}>
                {/* Glow orb */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle, white, transparent)" }} />
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed mb-3">{f.desc}</p>
                <span className="text-[10px] font-mono text-white/25 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">{f.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* What You Get */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="glass border border-white/8 rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-center mb-2">What You Get</h2>
            <p className="text-white/30 text-sm text-center mb-10">Everything you need to decide whether to build, pivot, or move on.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["📊", "Demand score from live Twitter data"],
                ["🔴", "Critical issues that could kill the idea"],
                ["✨", "Best selling points and strengths"],
                ["🔄", "How to change and improve the idea"],
                ["➕", "New features and products to add"],
                ["💰", "Top-matched VCs and investors to pitch"],
                ["🌐", "Web research: market size, competitors"],
                ["🎯", "Early adopters actively expressing pain"],
                ["📡", "Real trending topics that match your idea"],
                ["🟣", "Gemini AI verdict with a 0–100 score"],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex gap-3 items-center bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <span className="text-sm text-white/60">{text as string}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-lg mx-auto text-center px-6 pb-24">
          <div className="glass border border-indigo-500/20 rounded-3xl p-12 glow-pulse">
            <h3 className="text-3xl font-bold mb-3">Ready to find out?</h3>
            <p className="text-white/35 text-sm mb-8 leading-relaxed">
              Enter your startup idea and get a full AI-backed validation report with Twitter data, web intelligence, and investor matches.
            </p>
            <Link href="/validate"
              className="relative overflow-hidden inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-10 py-4 rounded-full transition-all text-sm shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] tracking-wide">
              <span className="relative z-10">Start Validating →</span>
              <div className="absolute inset-0 shimmer" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-white/15 py-8 border-t border-white/5 font-mono">
          StartupValidator v4 · Twitter API · Tavily · GPT-4o-mini · Gemini 2.0 Flash · LangGraph · WebSocket
        </footer>
      </div>
    </>
  );
}
