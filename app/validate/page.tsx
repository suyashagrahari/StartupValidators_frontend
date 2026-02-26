"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
type LogLine = { id: number; type: string; ts?: string; msg: string };

type TopFunder = { name: string; twitter?: string; focus: string; why: string };

type Verdict = {
  score: number;
  headline: string;
  why_it_works: string;
  why_it_fails: string;
  strengths: string[];
  weaknesses: string[];
  issues: string[];
  best_points: string[];
  idea_changes: string[];
  new_additions: string[];
  target_customer: string;
  go_to_market: string;
  competition_risk: "low" | "medium" | "high";
  timing: "too_early" | "perfect" | "too_late";
  market_size: string;
  key_insight: string;
  red_flags: string[];
  recommendation: "build" | "explore" | "pivot" | "abandon";
  investor_readiness: "not_ready" | "early_stage" | "ready";
  next_actions: string[];
  top_funders: TopFunder[];
  web_insights: string;
};

type Trend    = { name: string; meta_description?: string; target?: { query: string } };
type Tweet    = { author?: { userName?: string }; text: string; url?: string; twitterUrl?: string; likeCount?: number; retweetCount?: number };
type Adopter  = { username: string; name: string; avatar?: string; tweet: string; url?: string; likes: number; retweets: number; painSignal: string };
type FunderP  = { username: string; name: string; bio: string; followers: number; verified: boolean; avatar?: string };
type FunderT  = { username: string; name: string; bio: string; tweet: string; url?: string; followers: number; verified: boolean; avatar?: string };
type WebSrc   = { title: string; url: string; content?: string; score?: number };
type SearchR  = { query: string; label: string; results: WebSrc[]; answer: string };

type ResearchResult = {
  idea: string;
  verdict: Verdict;
  trendsData: {
    worldwideCount: number; usaCount: number;
    matched: Trend[]; allTrends: Trend[];
    hashtags: { tag: string; count: number }[];
    keywords: { word: string; count: number }[];
    contextTweets: Tweet[]; topTweets: Tweet[];
    insights: string;
  };
  demandData: {
    recentCount: number; monthCount: number; demandScore: number;
    avgLikes: number; avgRt: number;
    sentiment: { positive: number; negative: number; neutral: number };
    topTweets: Tweet[]; competitorTweets: Tweet[];
    insights: string;
  };
  adopterData: { count: number; users: Adopter[]; allPainTweets: number; insights: string };
  funderData:  { count: number; profileInvestors: FunderP[]; tweetInvestors: FunderT[]; insights: string };
  communityData: { tweets: Tweet[]; count: number };
  tavilyData?: { searchResults: SearchR[]; sources: WebSrc[]; summary: string; sourceCount: number };
};

type AuthUser = { id: string; name: string; email: string };
type HistoryItem = {
  id: string;
  idea: string;
  description: string;
  createdAt: string;
  score: number | null;
  headline: string;
  recommendation: string;
};

// ── Pipeline steps ────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: "plan",      label: "Plan",      icon: "🧠", step: 0 },
  { id: "trends",    label: "Trends",    icon: "📡", step: 1 },
  { id: "demand",    label: "Demand",    icon: "📊", step: 2 },
  { id: "adopters",  label: "Adopters",  icon: "🎯", step: 3 },
  { id: "funders",   label: "Funders",   icon: "💰", step: 4 },
  { id: "community", label: "Community", icon: "💬", step: 5 },
  { id: "web",       label: "Web Intel", icon: "🌐", step: 6 },
  { id: "synthesis", label: "Synthesis", icon: "🟣", step: 7 },
];

// ── Colour helpers ────────────────────────────────────────────────────────────
function lineStyle(type: string) {
  const m: Record<string, string> = {
    init:        "text-white/40",
    step:        "text-cyan-400 font-bold",
    llm_call:    "text-purple-400",
    tool_call:   "text-yellow-300",
    tool_result: "text-emerald-400",
    step_done:   "text-green-300 font-semibold",
    info:        "text-sky-300",
    query_line:  "text-indigo-300/80",
    queries:     "text-emerald-400",
    divider:     "text-white/12",
    verdict:     "text-white font-bold",
    warn:        "text-amber-400",
    error:       "text-red-400",
    ping:        "hidden",
  };
  return m[type] ?? "text-white/40";
}

function scoreColor(s: number) {
  if (s >= 75) return { hex: "#34d399", ring: "#34d399", label: "STRONG SIGNAL",   cls: "text-emerald-400", glow: "0 0 30px rgba(52,211,153,0.5)" };
  if (s >= 50) return { hex: "#fbbf24", ring: "#fbbf24", label: "MODERATE SIGNAL", cls: "text-amber-400",   glow: "0 0 30px rgba(251,191,36,0.5)" };
  return              { hex: "#f87171", ring: "#f87171", label: "WEAK SIGNAL",      cls: "text-red-400",     glow: "0 0 30px rgba(248,113,113,0.5)" };
}

const RECOMMEND: Record<string, { emoji: string; label: string; cls: string }> = {
  build:   { emoji: "🏗", label: "BUILD IT",     cls: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" },
  explore: { emoji: "🔭", label: "EXPLORE MORE", cls: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" },
  pivot:   { emoji: "↩",  label: "PIVOT",        cls: "bg-amber-500/20 text-amber-300 border border-amber-500/40" },
  abandon: { emoji: "✕",  label: "ABANDON",      cls: "bg-red-500/20 text-red-300 border border-red-500/40" },
};

const TIMING_MAP: Record<string, { label: string; cls: string }> = {
  too_early: { label: "⏳ Too Early",      cls: "text-indigo-400" },
  perfect:   { label: "✅ Perfect Timing", cls: "text-emerald-400" },
  too_late:  { label: "⌛ Too Late",        cls: "text-red-400" },
};

const RISK_CLS: Record<string, string> = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400" };

const INVEST_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  not_ready:   { label: "Not Investor-Ready", cls: "bg-red-500/10 text-red-400 border-red-500/20",       dot: "bg-red-400" },
  early_stage: { label: "Early Stage",        cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  ready:       { label: "Investor Ready ✦",   cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
};

// ── Chart helpers ─────────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  if (endDeg - startDeg >= 360) endDeg = 359.99;
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

// ── Chart: Sentiment donut ────────────────────────────────────────────────────
function SentimentDonut({ sentiment }: { sentiment: { positive: number; negative: number; neutral: number } }) {
  const { positive, negative, neutral } = sentiment;
  const neg0 = positive;
  const neu0 = positive + negative;
  return (
    <div className="flex items-center gap-8">
      <svg width="130" height="130" viewBox="0 0 130 130">
        {positive > 0 && <path d={arcPath(65, 65, 55, 0, positive * 3.6)} fill="#34d399" opacity="0.85" />}
        {negative > 0 && <path d={arcPath(65, 65, 55, neg0 * 3.6, (neg0 + negative) * 3.6)} fill="#f87171" opacity="0.85" />}
        {neutral  > 0 && <path d={arcPath(65, 65, 55, neu0 * 3.6, (neu0 + neutral) * 3.6)} fill="#4b5563" opacity="0.6" />}
        <circle cx="65" cy="65" r="34" fill="#0a0a0e" />
        <text x="65" y="61" textAnchor="middle" fill="#34d399" fontSize="16" fontWeight="bold" fontFamily="monospace">{positive}%</text>
        <text x="65" y="76" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">positive</text>
      </svg>
      <div className="space-y-2.5 flex-1">
        {[
          { label: "Positive", val: positive, color: "bg-emerald-400", txt: "text-emerald-400" },
          { label: "Negative", val: negative, color: "bg-red-400",     txt: "text-red-400" },
          { label: "Neutral",  val: neutral,  color: "bg-white/20",    txt: "text-white/30" },
        ].map(row => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm ${row.color}`} />{row.label}
              </span>
              <span className={`font-mono font-bold ${row.txt}`}>{row.val}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-1.5 rounded-full ${row.color} transition-all duration-1000`} style={{ width: `${row.val}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart: Demand bars ────────────────────────────────────────────────────────
function DemandBarChart({ data }: { data: ResearchResult["demandData"] }) {
  const maxVol = Math.max(data.recentCount, data.monthCount, 1);
  const bars = [
    { label: "7-Day Tweets",  raw: data.recentCount, pct: (data.recentCount / maxVol) * 100, color: "#818cf8" },
    { label: "30-Day Tweets", raw: data.monthCount,  pct: (data.monthCount  / maxVol) * 100, color: "#c084fc" },
    { label: "Demand Score",  raw: data.demandScore,  pct: data.demandScore,                  color: "#34d399" },
  ];
  return (
    <div className="flex items-end gap-8 justify-center" style={{ height: 160 }}>
      {bars.map(b => (
        <div key={b.label} className="flex flex-col items-center gap-2 flex-1">
          <span className="text-xs font-mono font-bold" style={{ color: b.color }}>{b.raw}</span>
          <div className="w-full flex items-end" style={{ height: 120 }}>
            <div className="w-full rounded-t-lg transition-all duration-1000"
              style={{ height: `${Math.max(b.pct, 4)}%`, backgroundColor: b.color, opacity: 0.75 }} />
          </div>
          <span className="text-[10px] text-white/30 text-center leading-tight">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart: Signal bars ────────────────────────────────────────────────────────
function SignalBars({ result }: { result: ResearchResult }) {
  const metrics = [
    { label: "AI Verdict Score",  value: result.verdict?.score ?? 0,                         max: 100, color: "#c084fc" },
    { label: "Demand Score",      value: result.demandData?.demandScore ?? 0,                 max: 100, color: "#818cf8" },
    { label: "Positive Sentiment",value: result.demandData?.sentiment?.positive ?? 0,         max: 100, color: "#34d399" },
    { label: "Early Adopters",    value: Math.min(result.adopterData?.count ?? 0, 50),        max: 50,  color: "#10b981" },
    { label: "Investors Found",   value: Math.min(result.funderData?.count ?? 0, 30),         max: 30,  color: "#fbbf24" },
    { label: "Web Sources",       value: Math.min(result.tavilyData?.sourceCount ?? 0, 20),   max: 20,  color: "#06b6d4" },
    { label: "Trend Matches",     value: Math.min(result.trendsData?.matched?.length ?? 0, 10), max: 10, color: "#f472b6" },
  ];
  return (
    <div className="space-y-3">
      {metrics.map(m => (
        <div key={m.label} className="flex items-center gap-3">
          <span className="text-xs text-white/35 w-36 flex-shrink-0 font-mono">{m.label}</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(m.value / m.max) * 100}%`, backgroundColor: m.color, opacity: 0.8 }} />
          </div>
          <span className="text-xs font-mono w-10 text-right font-bold" style={{ color: m.color }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart: Risk + Timing meters ───────────────────────────────────────────────
function StatusMeters({ verdict }: { verdict: Verdict }) {
  const riskLevel = { low: 33, medium: 66, high: 100 }[verdict.competition_risk] ?? 66;
  const riskColor = { low: "#34d399", medium: "#fbbf24", high: "#f87171" }[verdict.competition_risk] ?? "#fbbf24";
  const timingPos = { too_early: 10, perfect: 50, too_late: 90 }[verdict.timing] ?? 50;
  const timingColor = { too_early: "#818cf8", perfect: "#34d399", too_late: "#f87171" }[verdict.timing] ?? "#34d399";

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/40 font-mono">Competition Risk</span>
          <span className="font-mono font-bold capitalize" style={{ color: riskColor }}>{verdict.competition_risk}</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 rounded-full" style={{
            background: "linear-gradient(to right, #34d399, #fbbf24, #f87171)"
          }} />
          <div className="absolute inset-0 rounded-full bg-[#0a0a0e]"
            style={{ left: `${riskLevel}%` }} />
          <div className="absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-lg"
            style={{ left: `calc(${riskLevel}% - 4px)` }} />
        </div>
        <div className="flex justify-between text-[9px] text-white/20 font-mono mt-1">
          <span>Low</span><span>Medium</span><span>High</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/40 font-mono">Market Timing</span>
          <span className="font-mono font-bold" style={{ color: timingColor }}>
            {TIMING_MAP[verdict.timing]?.label}
          </span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 rounded-full" style={{
            background: "linear-gradient(to right, #818cf8, #34d399, #f87171)"
          }} />
          <div className="absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-lg"
            style={{ left: `calc(${timingPos}% - 4px)` }} />
        </div>
        <div className="flex justify-between text-[9px] text-white/20 font-mono mt-1">
          <span>Too Early</span><span>Perfect</span><span>Too Late</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/40 font-mono">Investor Readiness</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${INVEST_MAP[verdict.investor_readiness]?.cls}`}>
            {INVEST_MAP[verdict.investor_readiness]?.label}
          </span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-3 rounded-full transition-all duration-1000"
            style={{
              width: verdict.investor_readiness === "ready" ? "100%" : verdict.investor_readiness === "early_stage" ? "50%" : "15%",
              background: "linear-gradient(to right, #f87171, #fbbf24, #34d399)",
            }} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TweetCard({ t, accent = "white" }: { t: Tweet; accent?: string }) {
  const url = t.url || t.twitterUrl || "#";
  const borderCls = accent === "violet" ? "border-violet-500/20 hover:border-violet-500/40"
    : accent === "cyan"  ? "border-cyan-500/20 hover:border-cyan-500/40"
    : "border-white/8 hover:border-white/15";
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className={`block glass rounded-xl p-3 transition-all duration-200 hover:scale-[1.01] border ${borderCls}`}>
      <p className="text-xs text-white/30 mb-1 font-mono">@{t.author?.userName ?? "—"}</p>
      <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{t.text}</p>
      <div className="flex gap-4 mt-2 text-xs text-white/20 font-mono">
        {t.likeCount  !== undefined && <span>❤ {t.likeCount}</span>}
        {t.retweetCount !== undefined && <span>🔁 {t.retweetCount}</span>}
      </div>
    </a>
  );
}

function AdopterCard({ a, i }: { a: Adopter; i: number }) {
  return (
    <a href={a.url ?? `https://twitter.com/${a.username}`} target="_blank" rel="noreferrer"
      className={`card-in card-in-${Math.min(i + 1, 8)} flex gap-3 glass border border-emerald-500/15 rounded-xl p-3 hover:border-emerald-500/40 transition-all duration-200 hover:scale-[1.01]`}>
      {a.avatar
        ? <img src={a.avatar} className="w-10 h-10 rounded-full flex-shrink-0 ring-1 ring-emerald-500/30" alt="" />
        : <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-base flex-shrink-0 ring-1 ring-emerald-500/20 font-bold text-emerald-400">{(a.name || "?")[0]}</div>}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{a.name} <span className="font-normal text-white/30 font-mono text-xs">@{a.username}</span></p>
        <p className="text-sm text-white/60 leading-relaxed line-clamp-2 mt-0.5">{a.tweet}</p>
        {a.painSignal && (
          <span className="inline-block mt-1.5 text-xs bg-emerald-500/8 text-emerald-300/80 border border-emerald-500/15 rounded-full px-2 py-0.5 font-mono">
            &quot;{a.painSignal}&quot;
          </span>
        )}
        <p className="text-xs text-white/15 mt-1.5 font-mono">❤ {a.likes}  🔁 {a.retweets}</p>
      </div>
    </a>
  );
}

function FunderCard({ f, i }: { f: FunderP; i: number }) {
  return (
    <a href={`https://twitter.com/${f.username}`} target="_blank" rel="noreferrer"
      className={`card-in card-in-${Math.min(i + 1, 8)} flex gap-3 glass border border-amber-500/15 rounded-xl p-3 hover:border-amber-500/40 transition-all duration-200 hover:scale-[1.01]`}>
      {f.avatar
        ? <img src={f.avatar} className="w-10 h-10 rounded-full flex-shrink-0 ring-1 ring-amber-500/20" alt="" />
        : <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-base flex-shrink-0 ring-1 ring-amber-500/15 font-bold text-amber-400">{(f.name || "?")[0]}</div>}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-white">{f.name}</p>
          {f.verified && <span className="text-xs text-blue-400 bg-blue-400/8 rounded px-1">✓</span>}
          <span className="text-xs text-white/30 font-mono">@{f.username}</span>
          <span className="text-xs text-amber-500/40 font-mono">{(f.followers / 1000).toFixed(1)}k</span>
        </div>
        {f.bio && <p className="text-xs text-amber-300/60 mt-1 line-clamp-2 leading-relaxed">{f.bio}</p>}
      </div>
    </a>
  );
}

function TopFunderCard({ f, i }: { f: TopFunder; i: number }) {
  const handle = f.twitter?.replace("@", "") || "";
  const borders = ["border-indigo-500/20", "border-purple-500/20", "border-cyan-500/20"];
  return (
    <div className={`card-in card-in-${i + 1} glass rounded-xl p-4 border ${borders[i % 3]}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-bold text-white text-sm">{f.name}</p>
          {f.twitter && (
            <a href={`https://twitter.com/${handle}`} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-400/60 font-mono hover:text-indigo-300 transition-colors">{f.twitter}</a>
          )}
        </div>
        <span className="text-xl flex-shrink-0">💎</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex gap-2">
          <span className="text-white/30 shrink-0 font-mono">Focus:</span>
          <span className="text-white/60">{f.focus}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-white/30 shrink-0 font-mono">Why:</span>
          <span className="text-emerald-300/70">{f.why}</span>
        </div>
      </div>
    </div>
  );
}

function WebSourceCard({ s }: { s: WebSrc }) {
  try { new URL(s.url); } catch { return null; }
  const domain = new URL(s.url).hostname.replace("www.", "");
  return (
    <a href={s.url} target="_blank" rel="noreferrer"
      className="source-pill glass border border-white/8 rounded-xl p-3 hover:border-indigo-500/30 transition-all duration-200 hover:scale-[1.01] block">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-xs font-mono text-indigo-400/50 bg-indigo-500/8 px-2 py-0.5 rounded flex-shrink-0">{domain}</span>
        {s.score && <span className="text-xs text-white/20 font-mono ml-auto">rel: {s.score.toFixed(2)}</span>}
      </div>
      <p className="text-sm font-medium text-white/75 line-clamp-1">{s.title}</p>
      {s.content && <p className="text-xs text-white/35 mt-1 line-clamp-2 leading-relaxed">{s.content}</p>}
    </a>
  );
}

function InsightBox({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className={`glass rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{title}</p>
      <p className="text-sm text-white/65 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Pipeline Progress ─────────────────────────────────────────────────────────
function PipelineProgress({ currentStep, done }: { currentStep: number; done: boolean }) {
  return (
    <div className="glass border border-white/8 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-white/35">PIPELINE PROGRESS</span>
        <span className="text-xs font-mono text-white/20">{done ? "8/8 complete" : `${Math.max(currentStep, 0)}/8 nodes`}</span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {PIPELINE_STEPS.map((s, i) => {
          const isActive  = currentStep === i && !done;
          const isDone    = done || currentStep > i;
          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                  isDone    ? "bg-emerald-500/15 border border-emerald-500/40" :
                  isActive  ? "bg-indigo-500/15 border border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.4)]" :
                  "bg-white/4 border border-white/8"
                }`}>
                  {isDone ? <span className="text-emerald-400 text-xs">✓</span>
                    : <span className={isActive ? "animate-spin text-xs" : "text-xs opacity-35"}>{isActive ? "⟳" : s.icon}</span>}
                  {isActive && <span className="absolute inset-0 rounded-full border border-indigo-400/40 step-ping" />}
                </div>
                <span className={`text-[9px] font-mono leading-none transition-colors ${
                  isDone ? "text-emerald-400/60" : isActive ? "text-indigo-300" : "text-white/18"
                }`}>{s.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`w-4 h-px flex-shrink-0 transition-all duration-500 mb-4 ${isDone ? "bg-emerald-500/30" : "bg-white/8"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, sc }: { score: number; sc: ReturnType<typeof scoreColor> }) {
  const [displayed, setDisplayed] = useState(0);
  const circumference = 264;
  const dash = (score / 100) * circumference;

  useEffect(() => {
    let start = 0;
    const step = score / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= score) { setDisplayed(score); clearInterval(timer); }
      else setDisplayed(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ filter: `drop-shadow(${sc.glow})` }}>
          <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
          <circle cx="55" cy="55" r="46" fill="none"
            stroke={sc.ring} strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono score-count" style={{ color: sc.hex }}>{displayed}</span>
          <span className="text-xs text-white/25 font-mono">/100</span>
        </div>
      </div>
      <span className="text-xs font-mono mt-1 font-bold tracking-wider" style={{ color: sc.hex }}>{sc.label}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ValidatePage() {
  const [idea, setIdea]               = useState("");
  const [description, setDescription] = useState("");
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [token, setToken]             = useState("");
  const [authMode, setAuthMode]       = useState<"login" | "signup">("login");
  const [authName, setAuthName]       = useState("");
  const [authEmail, setAuthEmail]     = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  const [running, setRunning]         = useState(false);
  const [done, setDone]               = useState(false);
  const [lines, setLines]             = useState<LogLine[]>([]);
  const [result, setResult]           = useState<ResearchResult | null>(null);
  const [error, setError]             = useState("");
  const [activeTab, setActiveTab]     = useState<string>("overview");
  const [termCollapsed, setTermCollapsed] = useState(false);
  const [wsStatus, setWsStatus]       = useState<"idle" | "ws" | "sse" | "error">("idle");
  const currentStep = useMemo(() => {
    if (done) return 8;
    if (!running) return -1;
    if (!lines.length) return 0;

    const last = [...lines].reverse().find((l) => l.type === "step" || l.type === "step_done");
    if (!last) return 0;

    const msg = last.msg || "";
    if (msg.includes("Plan")) return 0;
    if (msg.includes("1 / 6") || msg.includes("Trends")) return 1;
    if (msg.includes("2 / 6") || msg.includes("Demand")) return 2;
    if (msg.includes("3 / 6") || msg.includes("Adopter")) return 3;
    if (msg.includes("4 / 6") || msg.includes("Funder")) return 4;
    if (msg.includes("5 / 6") || msg.includes("Community")) return 5;
    if (msg.includes("6 / 6") || msg.includes("Web")) return 6;
    if (msg.includes("SYNTHESIS")) return 7;
    return 0;
  }, [done, running, lines]);

  const termRef = useRef<HTMLDivElement>(null);
  const idRef   = useRef(0);
  const connRef = useRef<WebSocket | EventSource | null>(null);

  const addLine = useCallback((raw: Omit<LogLine, "id">) => {
    setLines(prev => [...prev, { ...raw, id: ++idRef.current }]);
  }, []);

  useEffect(() => {
    if (!termCollapsed && termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines, termCollapsed]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
  console.log("apiBase", apiBase);
  const wsBase =
    process.env.NEXT_PUBLIC_WS_URL ||
    apiBase.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");

  const fetchHistory = useCallback(async (bearer = token) => {
    if (!bearer) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch(`${apiBase}/api/history`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setHistory(data.items || []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [token, apiBase]);

  useEffect(() => {
    const storedToken = localStorage.getItem("sv_token");
    const storedUser = localStorage.getItem("sv_user");
    if (!storedToken || !storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as AuthUser;
      setToken(storedToken);
      setUser(parsed);
      setAuthEmail(parsed.email);
      fetchHistory(storedToken);
    } catch {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
    }
  }, [fetchHistory]);

  async function submitAuth() {
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (authMode === "signup" && authName.trim().length < 2) {
      setAuthError("Name must be at least 2 characters");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName.trim(),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("sv_token", data.token);
      localStorage.setItem("sv_user", JSON.stringify(data.user));
      setAuthPassword("");
      setShowAuthModal(false);
      await fetchHistory(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken("");
    setHistory([]);
    setAuthPassword("");
    localStorage.removeItem("sv_token");
    localStorage.removeItem("sv_user");
  }

  async function openHistoryItem(itemId: string) {
    if (!token) return;
    setHistoryError("");
    try {
      const res = await fetch(`${apiBase}/api/history/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open history");
      setIdea(data.item.idea || "");
      setDescription(data.item.description || "");
      setResult(data.item.result as ResearchResult);
      setDone(true);
      setRunning(false);
      setActiveTab("overview");
      setTermCollapsed(true);
      setError("");
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to open history");
    }
  }

  function handleEvent(data: Record<string, unknown>) {
    if (data.type === "ping") return;
    if (data.type === "complete") {
      setResult(data.result as ResearchResult);
      setDone(true); setRunning(false); setTermCollapsed(true);
      if (connRef.current instanceof WebSocket) connRef.current.close();
      else (connRef.current as EventSource)?.close();
      return;
    }
    if (data.type === "error") {
      setError(String(data.msg || "Agent error"));
      setRunning(false);
      return;
    }
    addLine(data as Omit<LogLine, "id">);
  }

  useEffect(() => {
    if (done && token) fetchHistory(token);
  }, [done, token, fetchHistory]);

  function startResearch() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!idea.trim() || running) return;
    setRunning(true); setDone(false); setLines([]); setResult(null);
    setError(""); setTermCollapsed(false); setActiveTab("overview");

    const ideaTrimmed = idea.trim();
    const descTrimmed = description.trim();
    let wsCompleted = false;

    try {
      const ws = new WebSocket(wsBase);
      connRef.current = ws;
      ws.onopen = () => {
        setWsStatus("ws");
        ws.send(JSON.stringify({ idea: ideaTrimmed, description: descTrimmed, token }));
      };
      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.type === "complete") wsCompleted = true;
          handleEvent(payload);
        } catch {
          // ignore malformed payloads
        }
      };
      ws.onerror = () => { ws.close(); fallbackToSSE(ideaTrimmed, descTrimmed); };
      ws.onclose = (e) => {
        if (!wsCompleted && e.code !== 1000) fallbackToSSE(ideaTrimmed, descTrimmed);
      };
    } catch {
      fallbackToSSE(ideaTrimmed, descTrimmed);
    }
  }

  function fallbackToSSE(ideaTrimmed: string, descTrimmed: string) {
    setWsStatus("sse");
    const params = new URLSearchParams({ idea: ideaTrimmed, description: descTrimmed, token });
    const es = new EventSource(`${apiBase}/api/research?${params}`);
    connRef.current = es;
    es.onmessage = (e) => { try { handleEvent(JSON.parse(e.data)); } catch { /* ignore */ } };
    es.onerror = () => {
      addLine({ type: "error", ts: "", msg: "  ✗ Connection lost — is server running on :3001?" });
      setRunning(false); setWsStatus("error"); es.close();
      setError("Server connection failed. Run: cd server && node index.js");
    };
  }

  function reset() {
    if (connRef.current instanceof WebSocket) connRef.current.close(1000, "reset");
    else (connRef.current as EventSource)?.close();
    setRunning(false); setDone(false); setLines([]); setResult(null);
    setError(""); setIdea(""); setDescription(""); setWsStatus("idle");
  }

  const sc = result?.verdict ? scoreColor(result.verdict.score) : null;
  const rc = result?.verdict ? (RECOMMEND[result.verdict.recommendation] ?? RECOMMEND.explore) : null;

  const TABS = [
    { id: "overview",  label: "📋 Overview" },
    { id: "history",   label: "🕘 History" },
    { id: "charts",    label: "📈 Charts" },
    { id: "analysis",  label: "🔍 Analysis" },
    { id: "funders",   label: "💰 Funders" },
    { id: "web",       label: "🌐 Web Intel" },
    { id: "trends",    label: "📡 Trends" },
    { id: "demand",    label: "📊 Demand" },
    { id: "adopters",  label: "🎯 Adopters" },
    { id: "community", label: "💬 Community" },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/6 sticky top-0 z-20 bg-[#080808]/90 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg">🚀</span>
          <span className="text-sm font-bold text-white/75 group-hover:text-white transition-colors">StartupValidator</span>
          <span className="text-xs text-white/18 font-mono ml-1">v4</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/45 font-mono hidden sm:inline">{user.email}</span>
              <button
                onClick={logout}
                className="text-xs px-2.5 py-1 rounded border border-white/10 text-white/35 hover:text-white/70 hover:border-white/30 transition-colors font-mono"
              >
                logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors font-mono"
            >
              login to save history
            </button>
          )}
          {wsStatus !== "idle" && (
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              wsStatus === "ws"  ? "bg-emerald-500/8 text-emerald-400 border-emerald-500/25" :
              wsStatus === "sse" ? "bg-sky-500/8 text-sky-400 border-sky-500/25" :
              "bg-red-500/8 text-red-400 border-red-500/25"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "ws" ? "bg-emerald-400 ws-live" : wsStatus === "sse" ? "bg-sky-400 animate-pulse" : "bg-red-400"}`} />
              {wsStatus === "ws" ? "WS LIVE" : wsStatus === "sse" ? "SSE" : "ERR"}
            </div>
          )}
          {(running || done) && (
            <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${running ? "bg-amber-500/8 text-amber-400 border-amber-500/25" : "bg-emerald-500/8 text-emerald-400 border-emerald-500/25"}`}>
              {running ? "⟳ RUNNING" : "✓ DONE"}
            </span>
          )}
          {(running || done) && (
            <button onClick={reset} className="text-xs text-white/25 hover:text-white/70 transition-colors font-mono">← new idea</button>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {!user && showAuthModal && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md border border-indigo-500/25 rounded-2xl p-5 space-y-3 bg-[#101018]">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-indigo-300/70 font-bold">Account</p>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors font-mono"
                >
                  close
                </button>
              </div>
              <button
                onClick={() => setAuthMode((m) => (m === "login" ? "signup" : "login"))}
                className="text-xs text-indigo-300/70 hover:text-indigo-200 transition-colors font-mono"
              >
                switch to {authMode === "login" ? "signup" : "login"}
              </button>
              {authMode === "signup" && (
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                />
              )}
              <input
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="password"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              />
              {authError && <p className="text-xs text-red-400 font-mono">{authError}</p>}
              <button
                onClick={submitAuth}
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
              </button>
            </div>
          </div>
        )}

        {/* ── INPUT ── */}
        {!running && !done && (
          <div className="max-w-2xl mx-auto space-y-6 fade-slide-up">
            {!user && (
              <div className="border border-indigo-500/20 rounded-2xl p-5 bg-indigo-500/5 text-center">
                <p className="text-sm text-indigo-200/80 mb-3">Please login or signup to continue.</p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
                >
                  Validate Your Idea
                </button>
              </div>
            )}
            {user && (
              <div className="border border-white/8 rounded-2xl p-5 bg-white/2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Previous Searches</p>
                  <button
                    onClick={() => fetchHistory()}
                    className="text-xs text-indigo-300/70 hover:text-indigo-200 transition-colors font-mono"
                  >
                    refresh
                  </button>
                </div>
                {historyLoading && <p className="text-xs text-white/35 font-mono">Loading history...</p>}
                {!historyLoading && !history.length && (
                  <p className="text-xs text-white/25 font-mono">No previous searches yet.</p>
                )}
                <div className="space-y-2">
                  {history.slice(0, 5).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => openHistoryItem(h.id)}
                      className="w-full text-left border border-white/8 rounded-lg px-3 py-2 bg-black/20 hover:border-indigo-500/30 transition-colors"
                    >
                      <p className="text-sm text-white truncate">{h.idea}</p>
                      <p className="text-[11px] text-white/35 font-mono">
                        {new Date(h.createdAt).toLocaleDateString()} {typeof h.score === "number" ? `· ${h.score}/100` : ""}
                      </p>
                    </button>
                  ))}
                </div>
                {historyError && <p className="text-xs text-red-400 font-mono mt-2">{historyError}</p>}
              </div>
            )}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 border border-indigo-500/15 rounded-full px-4 py-1.5 text-xs text-indigo-300/60 mb-2 bg-indigo-500/5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                8-node AI pipeline · Twitter + Tavily + Gemini
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                Validate Your <span className="gradient-text">Startup Idea</span>
              </h1>
              <p className="text-white/35 text-sm max-w-sm mx-auto leading-relaxed">
                GPT-4o-mini + Gemini 2.0 Flash + real Twitter data + Tavily web intelligence
              </p>
            </div>

            {user && (
            <div className="border border-white/8 rounded-2xl p-6 space-y-4 bg-white/2">
              <div>
                <label className="block text-xs text-white/35 uppercase tracking-widest mb-2">Startup Idea *</label>
                <input
                  value={idea} onChange={e => setIdea(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && startResearch()}
                  placeholder="e.g. AI-powered code review tool for developers"
                  className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-white placeholder:text-white/18 focus:outline-none focus:border-indigo-500/40 text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-white/35 uppercase tracking-widest mb-2">
                  Problem Description <span className="normal-case text-white/18 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe who has this problem and why current solutions fail..."
                  rows={2}
                  className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-white placeholder:text-white/18 focus:outline-none focus:border-indigo-500/40 text-sm font-mono resize-none transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 font-mono bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>
              )}

              <button onClick={startResearch} disabled={!idea.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm tracking-widest">
                RUN RESEARCH AGENT →
              </button>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[["📡","Twitter Trends"],["📊","Demand Analysis"],["🎯","Early Adopters"],["💰","Investors"],["🌐","Tavily Web Intel"],["🟣","Gemini Synthesis"]].map(([e, l]) => (
                  <span key={l} className="text-xs border border-white/6 rounded-full px-2.5 py-1 text-white/25 bg-white/2">{e} {l}</span>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── PIPELINE PROGRESS ── */}
        {(running || done) && (
          <div className="card-in">
            <PipelineProgress currentStep={currentStep} done={done} />
          </div>
        )}

        {/* ── TERMINAL ── */}
        {(running || done) && (
          <div className="card-in card-in-1 rounded-2xl overflow-hidden border border-white/8">
            <div className="bg-[#0c0c10] border-b border-white/6 px-4 py-2.5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-white/25 font-mono flex-1 truncate">startup-validator — {idea}</span>
              <div className="flex items-center gap-3">
                {wsStatus !== "idle" && (
                  <span className={`text-[10px] font-mono ${wsStatus === "ws" ? "text-emerald-400" : "text-sky-400"}`}>
                    ● {wsStatus === "ws" ? "WebSocket" : "SSE"}
                  </span>
                )}
                <button onClick={() => setTermCollapsed(v => !v)}
                  className="text-xs text-white/20 hover:text-white/60 font-mono transition-colors">
                  {termCollapsed ? "▼ expand" : "▲ collapse"}
                </button>
              </div>
            </div>

            {!termCollapsed && (
              <div className="relative">
                <div className="scan-line" />
                <div ref={termRef} className="bg-[#060610] p-4 h-72 overflow-y-auto font-mono text-xs leading-6">
                  {lines.map(l => l.type === "ping" ? null : (
                    <div key={l.id} className={`flex gap-2 ${lineStyle(l.type)}`}>
                      {l.ts && <span className="text-white/12 flex-shrink-0 select-none">[{l.ts}]</span>}
                      <span className="break-all whitespace-pre-wrap">{l.msg}</span>
                    </div>
                  ))}
                  {running && (
                    <div className="flex gap-2 text-white/20 mt-1">
                      <span className="text-white/8 select-none">[{new Date().toTimeString().slice(0, 8)}]</span>
                      <span className="cursor-blink text-emerald-400">▋</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {done && result?.verdict && (
          <div className="space-y-5">

            {/* Score Header */}
            <div className="card-in card-in-1 border border-white/8 rounded-2xl p-6 bg-white/2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <ScoreRing score={result.verdict.score} sc={sc!} />

                <div className="flex-1 min-w-0 space-y-2">
                  <h2 className="text-xl font-bold">&quot;{result.idea}&quot;</h2>
                  <p className="text-white/45 text-sm leading-relaxed">{result.verdict.headline}</p>
                  {result.verdict.key_insight && (
                    <div className="bg-purple-500/6 border border-purple-500/15 rounded-xl px-4 py-2.5">
                      <span className="text-xs text-purple-400 font-mono font-bold">🟣 KEY INSIGHT: </span>
                      <span className="text-xs text-white/60">{result.verdict.key_insight}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono pt-1">
                    <span className={RISK_CLS[result.verdict.competition_risk]}>Competition: {result.verdict.competition_risk}</span>
                    <span className={TIMING_MAP[result.verdict.timing]?.cls}>{TIMING_MAP[result.verdict.timing]?.label}</span>
                    <span className="text-white/25">📊 {result.demandData?.recentCount ?? 0} tweets/7d</span>
                    <span className="text-white/25">🎯 {result.adopterData?.count ?? 0} adopters</span>
                    <span className="text-white/25">💰 {result.funderData?.count ?? 0} investors</span>
                    <span className="text-white/25">🌐 {result.tavilyData?.sourceCount ?? 0} web sources</span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                  <span className={`px-5 py-2 rounded-full text-sm font-bold font-mono ${rc!.cls}`}>
                    {rc!.emoji} {rc!.label}
                  </span>
                  {result.verdict.investor_readiness && (
                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-mono ${INVEST_MAP[result.verdict.investor_readiness]?.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${INVEST_MAP[result.verdict.investor_readiness]?.dot}`} />
                      {INVEST_MAP[result.verdict.investor_readiness]?.label}
                    </span>
                  )}
                  {result.verdict.market_size && (
                    <span className="text-xs text-white/25 font-mono text-right max-w-[160px]">{result.verdict.market_size}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="card-in card-in-2 flex gap-1 border border-white/6 rounded-2xl p-1.5 overflow-x-auto bg-white/1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 text-xs font-mono py-2 px-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-white/8 text-white font-bold"
                      : "text-white/30 hover:text-white/55 hover:bg-white/4"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card-in card-in-1 border border-emerald-500/15 rounded-2xl p-5 space-y-3 bg-emerald-500/3">
                    <h3 className="text-sm font-bold text-emerald-400">✅ Why It Works</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{result.verdict.why_it_works}</p>
                    <ul className="space-y-2">
                      {(result.verdict.strengths || []).map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs text-white/50">
                          <span className="text-emerald-400/60 flex-shrink-0">+</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card-in card-in-2 border border-red-500/15 rounded-2xl p-5 space-y-3 bg-red-500/3">
                    <h3 className="text-sm font-bold text-red-400">⚠ Why It Fails</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{result.verdict.why_it_fails}</p>
                    <ul className="space-y-2">
                      {(result.verdict.weaknesses || []).map((w, i) => (
                        <li key={i} className="flex gap-2 text-xs text-white/50">
                          <span className="text-red-400/60 flex-shrink-0">−</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InsightBox title="🎯 Target Customer" text={result.verdict.target_customer} color="border border-white/8 bg-white/2" />
                  <InsightBox title="🚀 Go-to-Market"   text={result.verdict.go_to_market}   color="border border-white/8 bg-white/2" />
                  <div className="border border-white/8 rounded-xl p-4 bg-white/2">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2.5">📋 Next Actions</p>
                    <ol className="space-y-2">
                      {(result.verdict.next_actions || []).map((a, i) => (
                        <li key={i} className="flex gap-2 text-xs text-white/60">
                          <span className="text-white/20 font-mono flex-shrink-0">{i + 1}.</span>{a}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {result.verdict.red_flags?.length > 0 && (
                  <div className="card-in border border-red-500/15 rounded-2xl p-4 bg-red-500/3">
                    <p className="text-xs font-bold text-red-400/60 uppercase tracking-widest mb-3">🚩 Red Flags</p>
                    <div className="flex flex-wrap gap-2">
                      {result.verdict.red_flags.map((f, i) => (
                        <span key={i} className="text-xs bg-red-500/8 text-red-300/60 border border-red-500/15 rounded-full px-3 py-1">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: HISTORY ── */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {!user && (
                  <p className="text-sm text-white/35 text-center py-10 font-mono">
                    Login or signup to save and view previous research.
                  </p>
                )}
                {user && (
                  <>
                    {historyLoading && <p className="text-sm text-white/35 font-mono">Loading history...</p>}
                    {historyError && <p className="text-sm text-red-400 font-mono">{historyError}</p>}
                    {!historyLoading && !history.length && (
                      <p className="text-sm text-white/20 text-center py-10 font-mono">No previous research yet.</p>
                    )}
                    <div className="space-y-2">
                      {history.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => openHistoryItem(h.id)}
                          className="w-full text-left border border-white/8 rounded-xl p-4 bg-white/2 hover:border-indigo-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{h.idea}</p>
                              <p className="text-xs text-white/40 mt-1 line-clamp-2">{h.headline || "No headline available"}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-white/30 font-mono">{new Date(h.createdAt).toLocaleString()}</p>
                              {typeof h.score === "number" && (
                                <p className="text-xs text-emerald-400 font-mono mt-1">score: {h.score}/100</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: CHARTS ── */}
            {activeTab === "charts" && result.demandData && (
              <div className="space-y-4 card-in">
                {/* Row 1: Demand bars + Score meters */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border border-white/8 rounded-2xl p-5 bg-white/2">
                    <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4 font-mono">📊 Twitter Volume</p>
                    <DemandBarChart data={result.demandData} />
                  </div>
                  <div className="border border-white/8 rounded-2xl p-5 bg-white/2">
                    <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4 font-mono">⚡ Risk & Timing</p>
                    <StatusMeters verdict={result.verdict} />
                  </div>
                </div>

                {/* Row 2: Sentiment donut */}
                <div className="border border-white/8 rounded-2xl p-5 bg-white/2">
                  <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4 font-mono">😊 Sentiment Distribution</p>
                  <SentimentDonut sentiment={result.demandData.sentiment} />
                </div>

                {/* Row 3: Signal bars */}
                <div className="border border-white/8 rounded-2xl p-5 bg-white/2">
                  <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4 font-mono">🎯 Signal Strength</p>
                  <SignalBars result={result} />
                </div>

                {/* Row 4: Key numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "AI Score",    value: result.verdict.score,            unit: "/100", color: "text-purple-400",  bg: "border-purple-500/15" },
                    { label: "Demand",      value: result.demandData.demandScore,   unit: "/100", color: "text-indigo-400",  bg: "border-indigo-500/15" },
                    { label: "Adopters",    value: result.adopterData?.count ?? 0,  unit: "",     color: "text-emerald-400", bg: "border-emerald-500/15" },
                    { label: "Investors",   value: result.funderData?.count ?? 0,   unit: "",     color: "text-amber-400",   bg: "border-amber-500/15" },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-xl p-4 text-center bg-white/2 ${s.bg}`}>
                      <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}<span className="text-sm opacity-50">{s.unit}</span></p>
                      <p className="text-xs text-white/30 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: ANALYSIS ── */}
            {activeTab === "analysis" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.verdict.issues?.length > 0 && (
                    <div className="card-in card-in-1 border border-orange-500/15 rounded-2xl p-5 bg-orange-500/3">
                      <h3 className="text-sm font-bold text-orange-400 mb-3">🔴 Critical Issues</h3>
                      <ul className="space-y-2.5">
                        {result.verdict.issues.map((issue, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-white/60">
                            <span className="w-5 h-5 rounded-full bg-orange-500/12 border border-orange-500/25 flex items-center justify-center text-xs text-orange-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.verdict.best_points?.length > 0 && (
                    <div className="card-in card-in-2 border border-yellow-500/15 rounded-2xl p-5 bg-yellow-500/3">
                      <h3 className="text-sm font-bold text-yellow-400 mb-3">✨ Best Points</h3>
                      <ul className="space-y-2.5">
                        {result.verdict.best_points.map((pt, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-white/60">
                            <span className="w-5 h-5 rounded-full bg-yellow-500/12 border border-yellow-500/25 flex items-center justify-center text-xs text-yellow-300 flex-shrink-0 mt-0.5">★</span>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {result.verdict.idea_changes?.length > 0 && (
                  <div className="card-in card-in-3 border border-indigo-500/15 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-indigo-400 mb-4">🔄 How to Change / Improve the Idea</h3>
                    <div className="space-y-3">
                      {result.verdict.idea_changes.map((change, i) => (
                        <div key={i} className="flex gap-3 items-start bg-indigo-500/4 border border-indigo-500/12 rounded-xl p-3">
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-xs text-indigo-400 flex-shrink-0 font-mono">{i + 1}</div>
                          <p className="text-sm text-white/65 leading-relaxed">{change}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.verdict.new_additions?.length > 0 && (
                  <div className="card-in card-in-4 border border-cyan-500/15 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-cyan-400 mb-4">➕ New Things to Add</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.verdict.new_additions.map((addition, i) => (
                        <div key={i} className="flex gap-3 items-start bg-cyan-500/4 border border-cyan-500/12 rounded-xl p-3">
                          <span className="text-lg flex-shrink-0">{"🔧🤖📱💡🔗📊🎯🌐".split("")[i % 8]}</span>
                          <p className="text-sm text-white/65 leading-relaxed">{addition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.verdict.web_insights && (
                  <div className="card-in card-in-5 border border-white/8 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-indigo-300 mb-3">🌐 Web Research Summary</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{result.verdict.web_insights}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: FUNDERS ── */}
            {activeTab === "funders" && (
              <div className="space-y-5">
                {result.verdict.top_funders?.length > 0 && (
                  <div className="card-in card-in-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold text-amber-400">💎 Top Recommended Funders</h3>
                      <span className="text-xs text-white/20 font-mono">(AI-matched)</span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {result.verdict.top_funders.map((f, i) => <TopFunderCard key={i} f={f} i={i} />)}
                    </div>
                  </div>
                )}

                {result.funderData?.profileInvestors?.length > 0 && (
                  <div className="card-in card-in-2 border border-amber-500/15 rounded-2xl p-5">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
                      👤 Investor Profiles on Twitter ({result.funderData.profileInvestors.length})
                    </p>
                    {result.funderData.insights && (
                      <InsightBox title="Funding Landscape" text={result.funderData.insights} color="border border-amber-500/12 mb-4" />
                    )}
                    <div className="space-y-2">
                      {result.funderData.profileInvestors.map((f, i) => <FunderCard key={i} f={f} i={i} />)}
                    </div>
                  </div>
                )}

                {result.funderData?.tweetInvestors?.length > 0 && (
                  <div className="card-in card-in-3 border border-amber-500/10 rounded-2xl p-5">
                    <p className="text-xs font-bold text-amber-400/60 uppercase tracking-widest mb-3">🐦 Investors Active in Discussions</p>
                    <div className="space-y-2">
                      {result.funderData.tweetInvestors.map((f, i) => (
                        <a key={i} href={f.url ?? `https://twitter.com/${f.username}`} target="_blank" rel="noreferrer"
                          className="flex gap-3 border border-amber-500/12 rounded-xl p-3 hover:border-amber-500/30 transition-all hover:scale-[1.01] bg-white/1">
                          {f.avatar ? <img src={f.avatar} className="w-8 h-8 rounded-full flex-shrink-0" alt="" /> : null}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{f.name} <span className="text-white/25 font-mono text-xs">@{f.username}</span></p>
                            {f.bio && <p className="text-xs text-amber-400/50 line-clamp-1">{f.bio}</p>}
                            <p className="text-sm text-white/50 line-clamp-2 mt-0.5">{f.tweet}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!result.verdict.top_funders?.length && !result.funderData?.profileInvestors?.length && (
                  <p className="text-sm text-white/20 text-center py-12 font-mono">No investor activity found.</p>
                )}
              </div>
            )}

            {/* ── TAB: WEB INTEL ── */}
            {activeTab === "web" && (
              <div className="space-y-5">
                {result.tavilyData ? (
                  <>
                    <div className="card-in card-in-1 border border-cyan-500/15 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-cyan-400">🌐 Tavily Deep Research</h3>
                        <span className="text-xs text-white/20 font-mono">{result.tavilyData.sourceCount} sources</span>
                      </div>
                      {result.tavilyData.summary && (
                        <div className="bg-indigo-500/4 border border-indigo-500/12 rounded-xl p-4">
                          <p className="text-xs font-mono text-indigo-400/50 uppercase tracking-widest mb-2">Deep Research Report</p>
                          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{result.tavilyData.summary.slice(0, 3000)}</p>
                          {result.tavilyData.summary.length > 3000 && (
                            <p className="text-xs text-white/20 mt-2 font-mono">[{result.tavilyData.summary.length} total chars]</p>
                          )}
                        </div>
                      )}
                    </div>

                    {result.tavilyData.sources?.length > 0 && (
                      <div className="card-in card-in-2">
                        <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3 font-mono">
                          📄 Sources ({result.tavilyData.sources.length})
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {result.tavilyData.sources.map((s, i) => <WebSourceCard key={i} s={s} />)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-white/20 text-center py-12 font-mono">Web research data unavailable.</p>
                )}
              </div>
            )}

            {/* ── TAB: TRENDS ── */}
            {activeTab === "trends" && result.trendsData && (
              <div className="space-y-5 card-in">
                {result.trendsData.matched?.length > 0 && (
                  <div className="border border-violet-500/15 rounded-2xl p-5">
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">🔥 Matching Live Trends</p>
                    <div className="flex flex-wrap gap-2">
                      {result.trendsData.matched.map((t, i) => (
                        <span key={i} className="bg-violet-500/10 border border-violet-500/25 text-violet-200 text-xs px-3 py-1.5 rounded-full font-mono">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border border-white/8 rounded-2xl p-5">
                  <p className="text-xs font-bold text-violet-400/70 uppercase tracking-widest mb-3">📌 Hashtags & Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.trendsData.hashtags.map(h => (
                      <span key={h.tag} className="bg-violet-500/8 border border-violet-500/15 text-violet-300 text-xs px-3 py-1 rounded-full font-mono">
                        {h.tag} <span className="text-violet-500/35">×{h.count}</span>
                      </span>
                    ))}
                    {result.trendsData.keywords.slice(0, 10).map(k => (
                      <span key={k.word} className="border border-white/6 text-white/40 text-xs px-3 py-1 rounded-full font-mono">
                        {k.word} <span className="text-white/15">×{k.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {result.trendsData.insights && (
                  <InsightBox title="Trend Analysis" text={result.trendsData.insights} color="border border-violet-500/12" />
                )}
                {result.trendsData.topTweets?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-violet-400/70 uppercase tracking-widest mb-2">⭐ Top Tweets</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.trendsData.topTweets.map((t, i) => <TweetCard key={i} t={t} accent="violet" />)}
                    </div>
                  </div>
                )}
                {result.trendsData.contextTweets?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-violet-400/70 uppercase tracking-widest mb-2">🐦 Context Tweets</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.trendsData.contextTweets.map((t, i) => <TweetCard key={i} t={t} />)}
                    </div>
                  </div>
                )}
                <p className="text-xs text-white/15 font-mono">
                  Scanned {result.trendsData.worldwideCount} worldwide + {result.trendsData.usaCount} USA trends
                </p>
              </div>
            )}

            {/* ── TAB: DEMAND ── */}
            {activeTab === "demand" && result.demandData && (
              <div className="space-y-5 card-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Tweets (7d)",  value: result.demandData.recentCount,              color: "text-white" },
                    { label: "Tweets (30d)", value: result.demandData.monthCount,               color: "text-white" },
                    { label: "Demand Score", value: `${result.demandData.demandScore}/100`,     color: "text-indigo-400" },
                    { label: "Positive",     value: `${result.demandData.sentiment.positive}%`, color: "text-emerald-400" },
                  ].map(s => (
                    <div key={s.label} className="border border-white/8 rounded-xl p-4 text-center count-up bg-white/2">
                      <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-white/25 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-white/8 rounded-xl p-3 text-center bg-white/2">
                    <p className="text-xl font-bold font-mono text-pink-400">{result.demandData.avgLikes}</p>
                    <p className="text-xs text-white/25">Avg Likes/Tweet</p>
                  </div>
                  <div className="border border-white/8 rounded-xl p-3 text-center bg-white/2">
                    <p className="text-xl font-bold font-mono text-sky-400">{result.demandData.avgRt}</p>
                    <p className="text-xs text-white/25">Avg RTs/Tweet</p>
                  </div>
                </div>
                <div className="border border-white/8 rounded-xl p-4 space-y-3 bg-white/2">
                  {[
                    { label: "Positive", value: result.demandData.sentiment.positive, color: "bg-emerald-500" },
                    { label: "Negative", value: result.demandData.sentiment.negative, color: "bg-red-500" },
                    { label: "Neutral",  value: result.demandData.sentiment.neutral,  color: "bg-white/20" },
                  ].map(bar => (
                    <div key={bar.label} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-16 text-white/30">{bar.label}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className={`${bar.color} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${bar.value}%` }} />
                      </div>
                      <span className="w-9 text-right text-white/30">{bar.value}%</span>
                    </div>
                  ))}
                </div>
                {result.demandData.insights && (
                  <InsightBox title="Demand Analysis" text={result.demandData.insights} color="border border-blue-500/12" />
                )}
                {result.demandData.competitorTweets?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-orange-400/70 uppercase tracking-widest mb-2">⚔ Competitor Mentions</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.demandData.competitorTweets.map((t, i) => <TweetCard key={i} t={t} />)}
                    </div>
                  </div>
                )}
                {result.demandData.topTweets?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-blue-400/70 uppercase tracking-widest mb-2">🔥 Highest Engagement</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.demandData.topTweets.map((t, i) => <TweetCard key={i} t={t} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ADOPTERS ── */}
            {activeTab === "adopters" && (
              <div className="space-y-5 card-in">
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold font-mono text-emerald-400">{result.adopterData?.count ?? 0}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Early Adopters Found</p>
                    <p className="text-xs text-white/30">from {result.adopterData?.allPainTweets ?? 0} pain-signal tweets</p>
                  </div>
                </div>
                {result.adopterData?.insights && (
                  <InsightBox title="Adopter Profile" text={result.adopterData.insights} color="border border-emerald-500/12" />
                )}
                <div className="space-y-3">
                  {result.adopterData?.users?.length
                    ? result.adopterData.users.map((a, i) => <AdopterCard key={i} a={a} i={i} />)
                    : <p className="text-sm text-white/20 text-center py-12 font-mono">No pain-signal tweets found.</p>}
                </div>
              </div>
            )}

            {/* ── TAB: COMMUNITY ── */}
            {activeTab === "community" && (
              <div className="space-y-5 card-in">
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold font-mono text-pink-400">{result.communityData?.count ?? 0}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Twitter Community Posts</p>
                    <p className="text-xs text-white/30">via /twitter/community/get_tweets_from_all_community</p>
                  </div>
                </div>
                {result.communityData?.tweets?.length
                  ? <div className="grid sm:grid-cols-2 gap-3">{result.communityData.tweets.map((t, i) => <TweetCard key={i} t={t} />)}</div>
                  : <p className="text-sm text-white/20 text-center py-12 font-mono">No community discussions found.</p>}
              </div>
            )}

            {/* Reset */}
            <div className="text-center pt-4 pb-8">
              <button onClick={reset}
                className="border border-white/8 hover:border-white/20 text-white/25 hover:text-white/60 font-mono px-6 py-2.5 rounded-full text-xs transition-all">
                ← RESEARCH ANOTHER IDEA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
