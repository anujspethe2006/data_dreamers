import { useState, useEffect } from "react";
import GlobeAnalytics from "./components/ui/GlobeAnalytics.jsx";

async function saveCampaign(data) {
  try {
    console.log("SAVING THIS:", data);  // 👈 ADD THIS

    const res = await fetch("http://127.0.0.1:8000/save-campaign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    console.log("Saved response:", result);
  } catch (err) {
    console.error("Save failed", err);
  }
}


/* ═══════════════════════════════════════════════════
   Business Logic — UNCHANGED
   ═══════════════════════════════════════════════════ */

const STEPS = ["Data", "Prediction", "Explainability"];

const EXAMPLES = [
  "Run a Social Media campaign targeting Young Adults in North region on Mobile devices for Brand Awareness with $5000 budget over 7 days",
  "Launch an Email campaign for Professionals in the South region using Desktop, focused on Lead Generation with medium spend",
  "Video campaign targeting B2B segment across East and West regions on all device types, objective: Conversions, premium budget",
];

const API_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";;
const API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY || "";

async function callCerebras(system, userMsg) {
  if (!API_KEY) throw new Error("API key missing. Add VITE_CEREBRAS_API_KEY to your .env file.");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  // Better error handling
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  // Validate response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error("Unexpected API response:", data);
    throw new Error("Invalid API response format. Check console for details.");
  }

  return data.choices[0].message.content;
}

/* ═══════════════════════════════════════════════════
   UI Sub-Components
   ═══════════════════════════════════════════════════ */

function Badge({ tier }) {
  const map = {
    High: { bg: "var(--color-success-muted)", color: "var(--color-success)", border: "rgba(16,185,129,0.3)" },
    Medium: { bg: "var(--color-warning-muted)", color: "var(--color-warning)", border: "rgba(245,158,11,0.3)" },
    Low: { bg: "var(--color-error-muted)", color: "var(--color-error)", border: "rgba(239,68,68,0.3)" },
  };
  const s = map[tier] || map["Medium"];
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: "var(--radius-full)", padding: "2px 12px",
      fontSize: 12, fontWeight: 600,
      letterSpacing: "0.02em",
    }}>
      {tier}
    </span>
  );
}

function Spinner({ size = 16, color = "var(--color-primary)" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, flexShrink: 0,
      border: `2px solid rgba(255,255,255,0.1)`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
    }}>
      {steps.map((label, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            {/* Step circle + label */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done
                  ? "var(--color-success-muted)"
                  : active
                    ? "var(--color-primary-muted)"
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${done ? "rgba(16,185,129,0.4)"
                  : active ? "rgba(37,99,235,0.4)"
                    : "var(--color-border)"
                  }`,
                fontSize: 12, fontWeight: 600,
                color: done
                  ? "var(--color-success)"
                  : active
                    ? "var(--color-primary)"
                    : "var(--color-text-tertiary)",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 13,
                color: active
                  ? "var(--color-text-primary)"
                  : done
                    ? "var(--color-success)"
                    : "var(--color-text-tertiary)",
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
                transition: "all 0.3s ease",
              }}>
                {label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                width: 32, height: 1,
                background: done
                  ? "rgba(16,185,129,0.4)"
                  : "var(--color-border)",
                margin: "0 12px",
                transition: "background 0.3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({ children, style, animate = false }) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding: "20px 24px",
      boxShadow: "var(--shadow-md)",
      transition: "border-color 0.2s, box-shadow 0.2s",
      animation: animate ? "slideUp 0.4s ease forwards" : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, icon }) {
  return (
    <p style={{
      fontSize: 14, color: "var(--color-text-secondary)",
      margin: "0 0 16px", fontWeight: 600,
      display: "flex", alignItems: "center", gap: 8,
      letterSpacing: "-0.01em",
    }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      {children}
    </p>
  );
}

/* Accent theme presets for metric cards */
const METRIC_THEMES = {
  blue: { gradient: "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(124,58,237,0.12) 100%)", border: "rgba(37,99,235,0.35)", glow: "0 0 24px rgba(37,99,235,0.12)", valueColor: "#60A5FA" },
  green: { gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)", border: "rgba(16,185,129,0.35)", glow: "0 0 24px rgba(16,185,129,0.12)", valueColor: "#34D399" },
  amber: { gradient: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.08) 100%)", border: "rgba(245,158,11,0.35)", glow: "0 0 24px rgba(245,158,11,0.12)", valueColor: "#FBBF24" },
  purple: { gradient: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(139,92,246,0.08) 100%)", border: "rgba(124,58,237,0.35)", glow: "0 0 24px rgba(124,58,237,0.12)", valueColor: "#A78BFA" },
};

function MetricCard({ label, value, accent, icon, large = false }) {
  const theme = accent ? METRIC_THEMES[accent] : null;
  const defaultGlow = "var(--shadow-subtle)";
  return (
    <div style={{
      background: theme ? theme.gradient : "var(--color-surface)",
      border: `1px solid ${theme ? theme.border : "var(--color-border)"}`,
      borderRadius: "var(--radius-md)",
      padding: "20px",
      boxShadow: theme ? theme.glow : defaultGlow,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = theme ? theme.glow : defaultGlow; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
      </div>
      <p style={{
        fontSize: large ? 32 : 24, fontWeight: 700, margin: 0,
        color: theme ? theme.valueColor : "var(--color-text-primary)",
        letterSpacing: "-0.02em",
      }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: 400,
      animation: "fadeIn 0.5s ease",
    }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, var(--color-primary-muted) 0%, var(--color-secondary-muted) 100%)",
        border: "1px solid rgba(37,99,235,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, marginBottom: 24,
      }}>
        ◈
      </div>
      <h2 style={{
        fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)",
        marginBottom: 8, letterSpacing: "-0.02em",
      }}>
        Describe your campaign
      </h2>
      <p style={{
        fontSize: 14, color: "var(--color-text-tertiary)",
        maxWidth: 320, textAlign: "center", lineHeight: 1.6,
      }}>
        Enter a campaign brief or choose an example to generate synthetic data, predictions, and explainability insights.
      </p>
    </div>
  );
}

function SkeletonLoader({ message = "Processing..." }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: 400, gap: 20,
      animation: "fadeIn 0.3s ease",
    }}>
      <Spinner size={32} />
      <p style={{
        fontSize: 14, color: "var(--color-text-secondary)",
        animation: "pulse 1.5s ease infinite",
      }}>
        {message}
      </p>
      {/* Skeleton bars */}
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {[100, 85, 70].map((w, i) => (
          <div key={i} style={{
            width: `${w}%`, height: 12, borderRadius: "var(--radius-sm)",
            background: "linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)",
            backgroundSize: "800px 100%",
            animation: `shimmer 1.5s ease infinite ${i * 0.15}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* Color palette for SHAP bars — each feature gets a distinct color */
const SHAP_COLORS = [
  { bar: "#3B82F6", glow: "rgba(59,130,246,0.25)", text: "#60A5FA" },
  { bar: "#8B5CF6", glow: "rgba(139,92,246,0.25)", text: "#A78BFA" },
  { bar: "#10B981", glow: "rgba(16,185,129,0.25)", text: "#34D399" },
  { bar: "#F59E0B", glow: "rgba(245,158,11,0.25)", text: "#FBBF24" },
  { bar: "#EF4444", glow: "rgba(239,68,68,0.25)", text: "#F87171" },
  { bar: "#06B6D4", glow: "rgba(6,182,212,0.25)", text: "#22D3EE" },
  { bar: "#EC4899", glow: "rgba(236,72,153,0.25)", text: "#F472B6" },
  { bar: "#14B8A6", glow: "rgba(20,184,166,0.25)", text: "#2DD4BF" },
];

function ShapSection({ testData }) {
  // Derive mock SHAP feature importance from test data fields
  const features = [
    { name: "impressions", importance: 0.28 },
    { name: "clicks", importance: 0.22 },
    { name: "cost_usd", importance: 0.18 },
    { name: "engagement_score", importance: 0.12 },
    { name: "quality_score", importance: 0.09 },
    { name: "conversions", importance: 0.06 },
    { name: "ctr", importance: 0.03 },
    { name: "roas", importance: 0.02 },
  ];

  const maxImportance = Math.max(...features.map(f => f.importance));

  return (
    <Card animate style={{ marginBottom: 20 }}>
      <SectionLabel icon="🔍">Model Explainability (SHAP)</SectionLabel>

      {/* Feature Importance Bar Chart */}
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 16, fontWeight: 500 }}>
        Feature Importance — Mean |SHAP Value|
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f, idx) => {
          const c = SHAP_COLORS[idx % SHAP_COLORS.length];
          return (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 12, color: c.text,
                width: 130, textAlign: "right", flexShrink: 0,
                fontFamily: "var(--font-mono)", fontWeight: 500,
              }}>
                {f.name}
              </span>
              <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(f.importance / maxImportance) * 100}%`,
                  background: `linear-gradient(90deg, ${c.bar}, ${c.bar}dd)`,
                  borderRadius: "var(--radius-sm)",
                  transition: "width 0.8s ease",
                  boxShadow: `0 0 12px ${c.glow}`,
                }} />
              </div>
              <span style={{
                fontSize: 12, color: c.text,
                width: 40, textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 500,
              }}>
                {f.importance.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Waterfall plot placeholder */}
      <div style={{
        marginTop: 24, padding: 24,
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-md)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 120, gap: 8,
      }}>
        <span style={{ fontSize: 24 }}>📊</span>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>
          SHAP Waterfall Plot
        </p>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>
          Connect a trained model to render individual prediction explanations
        </p>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export default function CampaignIntelligence() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [testData, setTestData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [summary, setSummary] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Responsive: auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const handler = (e) => setSidebarOpen(!e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  async function generateTestData() {
    if (!brief.trim()) return;
    setLoading(true);
    setError("");
    setLoadingMsg("Generating synthetic campaign data...");

    try {
      const system = `You are a marketing data generator for a digital media analytics platform. 

CRITICAL GUARDRAIL: 
1. If the user's prompt does NOT contain the word "campaign" (case-insensitive), you must return exactly this JSON: {"error": "Invalid input: Prompt must include the word 'campaign'."}
2. If the user's prompt is not strictly related to marketing or digital advertising, you must return exactly this JSON: {"error": "Invalid input: Only marketing-related prompts are permitted."}

If both conditions are met, generate exactly 5 realistic campaign data rows as a JSON array. Each row must have these fields:
- channel: one of [Social Media, Email, Search, Display, Video]
- region: one of [North, South, East, West, Central]
- device_type: one of [Mobile, Desktop, Tablet]
- audience_segment: one of [Young Adults, Professionals, Seniors, Parents, Students, B2B]
- campaign_objective: one of [Brand Awareness, Lead Generation, Conversions, Traffic, Engagement]
- business_segment: one of [Small Business, Mid-Market, Enterprise]
- day_of_week: one of [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
- impressions: integer 10000-500000
- clicks: integer (1-5% of impressions)
- conversions: integer (1-10% of clicks)
- cost_usd: number 200-5000
- ctr: float (clicks/impressions, 2 decimal places)
- cpc: float (cost/clicks, 2 decimal places)
- conversion_rate: float (conversions/clicks, 2 decimal places)
- roas: float 1.0-8.0
- engagement_score: float 0.0-10.0
- quality_score: float 0.0-10.0

Vary the rows to cover the campaign's intent but also show realistic variance. 

Return ONLY the JSON array (or the error JSON), no markdown, no explanation, no text before or after the JSON.`;

      const raw = await callCerebras(system, `Campaign description: ${brief}`);
      const clean = raw.replace(/```json|```/g, "").trim();
      const rows = JSON.parse(clean);
      setTestData(rows);
      setStep(1);
    } catch (e) {
      setError("Failed to generate test data: " + e.message);
    }

    setLoading(false);
  }

  async function runPredictions() {
    setLoading(true);
    setError("");
    setLoadingMsg("Running XGBoost model predictions...");

    try {
      const system = `You are simulating a trained XGBoost ML model (trained on digital media campaign data) that predicts campaign performance.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no text before or after the JSON.

Given the campaign rows, return a JSON object with this EXACT structure:
{
  "predictions": [
    {
      "row_index": 0,
      "predicted_revenue_usd": 5000.00,
      "performance_tier": "High",
      "confidence": 0.85
    }
  ],
  "summary": "Your executive summary here as a single string."
}

Rules:
- predicted_revenue_usd: range $500-$15000, 2 decimal places
- performance_tier: "High", "Medium", or "Low"
- confidence: 0.70-0.98
- summary: 3-4 paragraph executive summary covering overall performance, best segments, risks, and recommendations

Return ONLY the JSON object. Nothing else.`;

      const raw = await callCerebras(system, `Campaign rows:\n${JSON.stringify(testData, null, 2)}`);
      const clean = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(clean);
      setPredictions(result.predictions || []);
      setSummary(result.summary || "");

      // 👉 ADD THIS
      saveCampaign({
        user_prompt: brief,
        channel: testData?.[0]?.channel || "Unknown",
        region: testData?.[0]?.region || "Unknown",
        revenue: result.predictions?.[0]?.predicted_revenue_usd || 0,
        tier: result.predictions?.[0]?.performance_tier || "Medium",
      });

      setStep(2);
    } catch (e) {
      setError("Prediction failed: " + e.message);
    }

    setLoading(false);
  }

  function reset() {
    setStep(0); setBrief(""); setTestData([]);
    setPredictions([]); setSummary(""); setError("");
  }

  const totalRevenue = predictions.reduce((s, p) => s + (p.predicted_revenue_usd || 0), 0);
  const avgRoas = testData.length
    ? (testData.reduce((s, r) => s + r.roas, 0) / testData.length).toFixed(2)
    : "—";
  const tierCounts = predictions.reduce((a, p) => {
    a[p.performance_tier] = (a[p.performance_tier] || 0) + 1;
    return a;
  }, {});

  /* ── Table styles (shared) ─────────────────────── */
  const thStyle = {
    padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 12,
    color: "var(--color-text-tertiary)", whiteSpace: "nowrap",
    textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid var(--color-border)",
  };
  const tdStyle = {
    padding: "10px 12px", fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    color: "var(--color-text-secondary)",
  };

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 110px)",
      fontFamily: "var(--font-sans)",
      position: "relative",
    }}>

      {/* ════════ LEFT PANEL ════════ */}
      <div style={{
        width: "26%", minWidth: 290, maxWidth: 380,
        borderRight: "1px solid var(--color-border)",
        padding: "24px",
        display: "flex", flexDirection: "column", gap: 20,
        overflowY: "auto",
        flexShrink: 0,
        background: "linear-gradient(180deg, #0f1629 0%, #111827 40%, #131b2e 100%)",
      }}>
        {/* Title */}
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: "0 0 4px",
            letterSpacing: "-0.03em",
          }}>
            Campaign Intelligence Platform
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0, lineHeight: 1.5 }}>
            Generate synthetic data, predict revenue, and explore model explainability.
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={STEPS} current={step} />

        {/* Campaign Brief */}
        <div>
          <label style={{
            fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)",
            display: "block", marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Campaign Brief
          </label>
          <textarea
            id="campaign-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe your campaign — channel, region, audience, objective, budget, duration..."
            rows={5}
            disabled={loading}
            style={{
              background: "var(--color-bg)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          />
        </div>

        {/* Example chips */}
        <div>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Or try an example
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => setBrief(ex)}
                disabled={loading}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
          {step === 0 && (
            <button
              id="btn-generate"
              className="btn-primary"
              onClick={generateTestData}
              disabled={!brief.trim() || loading}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? <><Spinner size={16} color="#fff" /> {loadingMsg}</> : "Generate Data →"}
            </button>
          )}
          {step === 1 && (
            <>
              <button
                id="btn-predict"
                className="btn-primary"
                onClick={runPredictions}
                disabled={loading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading ? <><Spinner size={16} color="#fff" /> {loadingMsg}</> : "Run Predictions →"}
              </button>
              <button className="btn-secondary" onClick={runPredictions} disabled={loading}>
                ← Start Over
              </button>
            </>
          )}
          {step === 2 && (
            <button className="btn-secondary" onClick={reset}>
              ← New Campaign
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: "var(--color-error-muted)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px", fontSize: 13,
            color: "var(--color-error)",
            animation: "slideUp 0.3s ease",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "24px 32px",
        background: "var(--color-bg)",
      }}>

        {/* Loading state */}
        {loading && <SkeletonLoader message={loadingMsg} />}

        {/* Empty state */}
        {!loading && step === 0 && testData.length === 0 && <EmptyState />}

        {/* ── Section 1: Generated Data ── */}
        {!loading && step >= 1 && testData.length > 0 && (
          <Card animate style={{ marginBottom: 20 }}>
            <SectionLabel icon="📊">
              Generated Campaign Data · {testData.length} records
            </SectionLabel>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#", "Channel", "Region", "Device", "Audience", "Objective", "Impressions", "Clicks", "Conv.", "Cost ($)", "CTR", "ROAS"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testData.map((r, i) => (
                    <tr key={i} style={{ transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ ...tdStyle, color: "var(--color-text-tertiary)", fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>{r.channel}</td>
                      <td style={tdStyle}>{r.region}</td>
                      <td style={tdStyle}>{r.device_type}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.audience_segment}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.campaign_objective}</td>
                      <td style={tdStyle}>{r.impressions?.toLocaleString()}</td>
                      <td style={tdStyle}>{r.clicks?.toLocaleString()}</td>
                      <td style={tdStyle}>{r.conversions}</td>
                      <td style={{ ...tdStyle, color: "#FBBF24", fontWeight: 500 }}>${r.cost_usd?.toFixed(0)}</td>
                      <td style={{ ...tdStyle, color: r.ctr >= 3 ? "#34D399" : r.ctr >= 1.5 ? "var(--color-text-secondary)" : "#F87171" }}>{r.ctr?.toFixed(2)}%</td>
                      <td style={{ ...tdStyle, color: r.roas >= 4 ? "#34D399" : r.roas >= 2 ? "#FBBF24" : "#F87171", fontWeight: 600 }}>{r.roas?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Section 2: Predictions ── */}
        {!loading && step >= 2 && predictions.length > 0 && (
          <>
            {/* Metric cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16, marginBottom: 20,
              animation: "slideUp 0.4s ease forwards",
            }}>
              <MetricCard
                label="Predicted Revenue"
                value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                accent="blue"
                large
                icon="💰"
              />
              <MetricCard
                label="Avg. ROAS"
                value={`${avgRoas}×`}
                accent="amber"
                icon="📈"
              />
              <MetricCard
                label="High Performers"
                value={`${tierCounts["High"] || 0} / ${predictions.length}`}
                accent="green"
                icon="⚡"
              />
              <MetricCard
                label="Total Campaigns"
                value={testData.length}
                accent="purple"
                icon="🎯"
              />
            </div>

            {/* Predictions table */}
            <Card animate style={{ marginBottom: 20 }}>
              <SectionLabel icon="🤖">Model Predictions · XGBoost Regressor + Classifier</SectionLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#", "Channel", "Region", "Audience", "Objective", "Pred. Revenue", "Tier", "Confidence"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p, i) => {
                      const row = testData[p.row_index ?? i] || {};
                      return (
                        <tr key={i} style={{ transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ ...tdStyle, color: "var(--color-text-tertiary)", fontWeight: 500 }}>{i + 1}</td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>{row.channel}</td>
                          <td style={tdStyle}>{row.region}</td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{row.audience_segment}</td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{row.campaign_objective}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: "#60A5FA", textShadow: "0 0 8px rgba(96,165,250,0.3)" }}>
                            ${p.predicted_revenue_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td style={tdStyle}><Badge tier={p.performance_tier} /></td>
                          <td style={tdStyle}>
                            <span style={{
                              color: p.confidence >= 0.85 ? "var(--color-success)" : "var(--color-text-secondary)",
                              fontWeight: 500,
                            }}>
                              {(p.confidence * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── Section 3: SHAP ── */}
            <ShapSection testData={testData} />

            {/* ── Section 4: Executive Summary ── */}
            {summary && (
              <Card animate>
                <SectionLabel icon="📋">Executive Summary</SectionLabel>
                <div style={{
                  fontSize: 14, lineHeight: 1.85,
                  color: "var(--color-text-secondary)",
                }}>
                  {summary.split("\n\n").map((para, i, arr) => (
                    <p key={i} style={{
                      margin: i < arr.length - 1 ? "0 0 16px" : 0,
                    }}>
                      {para}
                    </p>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* ════════ RIGHT SIDEBAR — Globe Analytics ════════ */}
      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen(p => !p)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        style={{
          position: "absolute", right: sidebarOpen ? 279 : 0, top: 12,
          zIndex: 20,
          width: 28, height: 28,
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-tertiary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, cursor: "pointer",
          transition: "right 0.3s ease, background 0.2s",
          padding: 0,
        }}
      >
        {sidebarOpen ? "›" : "‹"}
      </button>

      {/* Sidebar panel */}
      <div style={{
        width: sidebarOpen ? 280 : 0,
        minWidth: sidebarOpen ? 280 : 0,
        borderLeft: sidebarOpen ? "1px solid var(--color-border)" : "none",
        background: "linear-gradient(180deg, #131b2e 0%, #111827 50%, #0f1629 100%)",
        overflowY: "auto",
        overflowX: "hidden",
        padding: sidebarOpen ? "20px 16px" : "0",
        transition: "width 0.3s ease, min-width 0.3s ease, padding 0.3s ease",
        flexShrink: 0,
        opacity: sidebarOpen ? 1 : 0,
      }}>
        {sidebarOpen && (
          <GlobeAnalytics
            testData={testData}
            predictions={predictions}
            onRegionHover={setHoveredRegion}
          />
        )}
      </div>
    </div>
  );
}
