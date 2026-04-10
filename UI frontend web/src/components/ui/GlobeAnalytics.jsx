import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";

/* ═══════════════════════════════════════════════════
   Region marker config — pins on the globe
   ═══════════════════════════════════════════════════ */
const REGION_MARKERS = [
  { name: "North", location: [28.6139, 77.2090], color: [0.23, 0.51, 0.93] },   // Blue — Delhi
  { name: "South", location: [12.9716, 77.5946], color: [0.06, 0.73, 0.50] },    // Green — Bangalore
  { name: "East",  location: [22.5726, 88.3639], color: [0.96, 0.62, 0.04] },    // Orange — Kolkata
  { name: "West",  location: [19.0760, 72.8777], color: [0.94, 0.27, 0.27] },    // Red — Mumbai
  { name: "Central", location: [23.2599, 77.4126], color: [0.55, 0.36, 0.93] },  // Purple — Bhopal
];

/* ═══════════════════════════════════════════════════
   Globe Component — Cobe-powered interactive globe
   ═══════════════════════════════════════════════════ */
function Globe({ size = 220, onMarkerHover }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  const onPointerDown = useCallback((e) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerOut = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerMove = useCallback((e) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
    }
  }, []);

  useEffect(() => {
    let width = size;
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 1.2,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.15, 0.18, 0.28],
      markerColor: [0.23, 0.51, 0.93],
      glowColor: [0.08, 0.12, 0.24],
      markers: REGION_MARKERS.map(m => ({
        location: m.location,
        size: 0.07,
      })),
      onRender: (state) => {
        if (pointerInteracting.current === null) {
          phiRef.current += 0.003;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current / 200;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => globe.destroy();
  }, [size]);

  return (
    <div style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Glow behind globe */}
      <div style={{
        position: "absolute",
        width: size * 0.7,
        height: size * 0.7,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)",
        filter: "blur(20px)",
        zIndex: 0,
      }} />
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerOut}
        onPointerMove={onPointerMove}
        style={{
          width: size,
          height: size,
          cursor: "grab",
          contain: "layout paint size",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Region Insights — metrics per region
   ═══════════════════════════════════════════════════ */
function RegionInsights({ testData, onRegionHover }) {
  // Aggregate data by region from testData
  const regionStats = {};
  (testData || []).forEach(row => {
    const r = row.region || "Unknown";
    if (!regionStats[r]) regionStats[r] = { impressions: 0, clicks: 0, conversions: 0 };
    regionStats[r].impressions += row.impressions || 0;
    regionStats[r].clicks += row.clicks || 0;
    regionStats[r].conversions += row.conversions || 0;
  });

  const regions = Object.keys(regionStats).length > 0
    ? Object.entries(regionStats)
    : [
      ["North", { impressions: 0, clicks: 0, conversions: 0 }],
      ["South", { impressions: 0, clicks: 0, conversions: 0 }],
      ["East", { impressions: 0, clicks: 0, conversions: 0 }],
      ["West", { impressions: 0, clicks: 0, conversions: 0 }],
    ];

  const regionColors = {
    North: "#3B82F6",
    South: "#10B981",
    East: "#F59E0B",
    West: "#EF4444",
    Central: "#8B5CF6",
  };

  function getPerformance(stats) {
    if (stats.impressions === 0) return { label: "No data", color: "var(--color-text-tertiary)" };
    const ctr = stats.clicks / stats.impressions;
    if (ctr >= 0.03) return { label: "High", color: "#34D399" };
    if (ctr >= 0.015) return { label: "Medium", color: "#FBBF24" };
    return { label: "Low", color: "#F87171" };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {regions.map(([name, stats]) => {
        const perf = getPerformance(stats);
        const dotColor = regionColors[name] || "#6B7280";
        return (
          <div
            key={name}
            onMouseEnter={() => onRegionHover?.(name)}
            onMouseLeave={() => onRegionHover?.(null)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid transparent",
              cursor: "default",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = dotColor + "40";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            {/* Color dot */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 6px ${dotColor}60`,
              flexShrink: 0,
            }} />
            {/* Name */}
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", width: 55, flexShrink: 0 }}>
              {name}
            </span>
            {/* Metrics */}
            <div style={{ flex: 1, display: "flex", gap: 8, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <span title="Impressions">{stats.impressions > 0 ? (stats.impressions / 1000).toFixed(0) + "K" : "—"}</span>
              <span>·</span>
              <span title="Clicks">{stats.clicks > 0 ? stats.clicks.toLocaleString() : "—"}</span>
              <span>·</span>
              <span title="Conversions">{stats.conversions > 0 ? stats.conversions : "—"}</span>
            </div>
            {/* Performance badge */}
            <span style={{
              fontSize: 10, fontWeight: 600, color: perf.color,
              textTransform: "uppercase", letterSpacing: "0.06em",
              flexShrink: 0,
            }}>
              {perf.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   User Panel
   ═══════════════════════════════════════════════════ */
function UserPanel({ campaignsRun, avgPerformance }) {
  return (
    <div>
      {/* User info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#fff",
          boxShadow: "0 0 12px rgba(37,99,235,0.3)",
          flexShrink: 0,
        }}>
          A
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
            Analyst
          </p>
          <p style={{ fontSize: 11, margin: 0, color: "var(--color-text-tertiary)" }}>
            Campaign Intelligence
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{
          flex: 1, padding: "10px 12px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
        }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Campaigns
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#60A5FA" }}>
            {campaignsRun}
          </p>
        </div>
        <div style={{
          flex: 1, padding: "10px 12px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
        }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Avg. Perf.
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#34D399" }}>
            {avgPerformance}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className="btn-secondary"
          style={{ width: "100%", fontSize: 12, height: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => alert("Export report functionality coming soon")}
        >
          📄 Export Report
        </button>
        <button
          className="btn-secondary"
          style={{ width: "100%", fontSize: 12, height: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => alert("CSV download functionality coming soon")}
        >
          📥 Download CSV
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main Sidebar Export
   ═══════════════════════════════════════════════════ */
export default function GlobeAnalytics({ testData, predictions, onRegionHover }) {
  const campaignsRun = testData?.length || 0;
  const avgPerf = predictions?.length
    ? (predictions.reduce((s, p) => s + (p.confidence || 0), 0) / predictions.length * 100).toFixed(0) + "%"
    : "—";

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 24,
      animation: "fadeIn 0.4s ease",
    }}>
      {/* Section 1: Globe */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          margin: "0 0 12px",
        }}>
          🌍 Global Campaign Insights
        </p>
        <Globe size={200} onMarkerHover={onRegionHover} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--color-border)" }} />

      {/* Section 2: Region Insights */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          margin: "0 0 12px",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          📊 Region Insights
        </p>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--color-text-tertiary)", paddingLeft: 30, marginBottom: 4 }}>
            <span style={{ flex: 1 }}>Impr. · Clicks · Conv.</span>
            <span>Status</span>
          </div>
        </div>
        <RegionInsights testData={testData} onRegionHover={onRegionHover} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--color-border)" }} />

      {/* Section 3: User Panel */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          margin: "0 0 12px",
        }}>
          👤 Analyst Panel
        </p>
        <UserPanel campaignsRun={campaignsRun} avgPerformance={avgPerf} />
      </div>
    </div>
  );
}
