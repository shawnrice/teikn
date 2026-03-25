/**
 * Storybook visualization components for teikn design tokens.
 *
 * These components are imported by generated .stories.tsx files.
 * They use CSS custom properties for theming and respond to
 * Storybook's dark mode automatically.
 */
import React from "react";

type El = React.JSX.Element;
type ElOrNull = React.JSX.Element | null;

// ─── Theme ───────────────────────────────────────────────────

const themeStyles = `
.teikn-sb {
  --tkn-bg: #ffffff;
  --tkn-bg-subtle: #f5f5f5;
  --tkn-bg-muted: #fafafa;
  --tkn-border: #e0e0e0;
  --tkn-text: #1a1a1a;
  --tkn-text-secondary: #666666;
  --tkn-text-muted: #999999;
  --tkn-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --tkn-accent: #0066cc;
  --tkn-accent-light: #38bdf8;
  --tkn-radius: 8px;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  .teikn-sb {
    --tkn-bg: #1e1e1e;
    --tkn-bg-subtle: #2a2a2a;
    --tkn-bg-muted: #252525;
    --tkn-border: #3a3a3a;
    --tkn-text: #e0e0e0;
    --tkn-text-secondary: #a0a0a0;
    --tkn-text-muted: #777777;
  }
}

[data-theme="dark"] .teikn-sb,
.dark .teikn-sb {
  --tkn-bg: #1e1e1e;
  --tkn-bg-subtle: #2a2a2a;
  --tkn-bg-muted: #252525;
  --tkn-border: #3a3a3a;
  --tkn-text: #e0e0e0;
  --tkn-text-secondary: #a0a0a0;
  --tkn-text-muted: #777777;
}
`;

// ─── Primitives ──────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--tkn-bg)",
  border: "1px solid var(--tkn-border)",
  borderRadius: "var(--tkn-radius)",
  color: "var(--tkn-text)",
};

const code: React.CSSProperties = {
  background: "var(--tkn-bg-subtle)",
  padding: "0.125rem 0.375rem",
  borderRadius: 3,
  fontSize: "0.8125rem",
  fontFamily: "var(--tkn-mono)",
};

const label: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--tkn-text-secondary)",
  marginBottom: "0.5rem",
};

const mono: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--tkn-text-secondary)",
  fontFamily: "var(--tkn-mono)",
};

// ─── Theme wrapper ───────────────────────────────────────────

export const TokenStory = ({ children }: { children: React.ReactNode }): El => (
  <div className="teikn-sb">
    <style>{themeStyles}</style>
    {children}
  </div>
);

// ─── Grid layouts ────────────────────────────────────────────

export const TokenGrid = ({ children }: { children: React.ReactNode }): El => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>{children}</div>
);

export const TokenList = ({ children }: { children: React.ReactNode }): El => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>
);

// ─── Color ───────────────────────────────────────────────────

export const Swatch = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, width: 224, overflow: "hidden" }}>
    <div
      style={{
        background: value,
        height: 96,
        borderRadius: "var(--tkn-radius) var(--tkn-radius) 0 0",
      }}
    />
    <div style={{ padding: "0.875rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>{name}</div>
      <div style={mono}>{value}</div>
    </div>
  </div>
);

// ─── Spacing ─────────────────────────────────────────────────

export const SpacingBar = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
    <div style={label}>
      {name} <code style={code}>{value}</code>
    </div>
    <div
      style={{
        height: 12,
        background: "var(--tkn-accent)",
        borderRadius: 3,
        width: value,
        minWidth: 2,
      }}
    />
  </div>
);

// ─── Shadow ──────────────────────────────────────────────────

export const ShadowBox = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", width: 200, textAlign: "center" }}>
    <div
      style={{
        width: 88,
        height: 88,
        background: "var(--tkn-bg)",
        borderRadius: 8,
        margin: "0.75rem auto",
        boxShadow: value,
      }}
    />
    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{name}</div>
    <div style={{ ...mono, marginTop: "0.25rem", wordBreak: "break-all" }}>{value}</div>
  </div>
);

// ─── Font ────────────────────────────────────────────────────

export const FontSample = ({
  name,
  value,
  styleProp,
}: {
  name: string;
  value: string;
  styleProp: string;
}): El => (
  <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
    <div style={label}>
      {name} <code style={code}>{value}</code>
    </div>
    <div style={{ [styleProp]: value, overflow: "hidden", textOverflow: "ellipsis" }}>
      The quick brown fox jumps over the lazy dog
    </div>
  </div>
);

// ─── Typography ──────────────────────────────────────────────

export const TypographyBlock = ({
  name,
  value,
}: {
  name: string;
  value: Record<string, unknown>;
}): El => {
  const style: React.CSSProperties = {};
  if (value.fontFamily) {
    style.fontFamily = value.fontFamily as string;
  }
  if (value.fontSize) {
    style.fontSize = value.fontSize as string;
  }
  if (value.fontWeight) {
    style.fontWeight = value.fontWeight as number;
  }
  if (value.lineHeight) {
    style.lineHeight = value.lineHeight as number;
  }
  if (value.letterSpacing) {
    style.letterSpacing = value.letterSpacing as string;
  }
  return (
    <div style={{ ...card, overflow: "hidden", marginBottom: "0.75rem" }}>
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--tkn-border)", ...style }}>
        <div style={{ fontSize: "2em", marginBottom: "0.25em" }}>Heading</div>
        <div>The quick brown fox jumps over the lazy dog.</div>
      </div>
      <div style={{ padding: "1rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem" }}>{name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.75rem" }}>
          {Object.entries(value).map(([k, v]) => (
            <React.Fragment key={k}>
              <dt style={{ ...mono, color: "var(--tkn-text-muted)" }}>{k}</dt>
              <dd style={{ ...mono, margin: 0, fontSize: "0.8125rem" }}>{String(v)}</dd>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Border ──────────────────────────────────────────────────

export const BorderDemo = ({
  name,
  value,
}: {
  name: string;
  value: Record<string, unknown>;
}): El => {
  const borderStr = [value.width, value.style, value.color].filter(Boolean).join(" ");
  return (
    <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>{name}</div>
      <div
        style={{
          width: "100%",
          height: 48,
          borderRadius: 4,
          background: "var(--tkn-bg-muted)",
          margin: "0.75rem 0",
          border: borderStr,
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.75rem" }}>
        {Object.entries(value).map(([k, v]) => (
          <React.Fragment key={k}>
            <dt style={{ ...mono, color: "var(--tkn-text-muted)" }}>{k}</dt>
            <dd style={{ ...mono, margin: 0, fontSize: "0.8125rem" }}>{String(v)}</dd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ─── Border Radius ───────────────────────────────────────────

export const RadiusBox = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", width: 140, textAlign: "center" }}>
    <div
      style={{
        width: 64,
        height: 64,
        background: "var(--tkn-accent)",
        margin: "0.5rem auto",
        borderRadius: value,
      }}
    />
    <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{name}</div>
    <div style={mono}>{value}</div>
  </div>
);

// ─── Gradient ────────────────────────────────────────────────

export const GradientSwatch = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, overflow: "hidden" }}>
    <div
      style={{
        width: "100%",
        height: 180,
        background: value,
        borderRadius: "var(--tkn-radius) var(--tkn-radius) 0 0",
      }}
    />
    <div style={{ padding: "1rem 1.25rem" }}>
      <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>{name}</div>
      <div
        style={{
          ...mono,
          background: "var(--tkn-bg-subtle)",
          padding: "0.5rem 0.75rem",
          borderRadius: 6,
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

// ─── Opacity ─────────────────────────────────────────────────

export const OpacityDemo = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", width: 160, textAlign: "center" }}>
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 8,
        margin: "0.5rem auto",
        border: "1px solid var(--tkn-border)",
        position: "relative",
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 8,
          background: "var(--tkn-accent)",
          opacity: Number(value),
        }}
      />
    </div>
    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{name}</div>
    <div style={mono}>{value}</div>
  </div>
);

// ─── Line Height ─────────────────────────────────────────────

export const LineHeightSample = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
    <div style={label}>
      {name} <code style={code}>{value}</code>
    </div>
    <div
      style={{
        fontSize: "0.875rem",
        maxWidth: 420,
        background: "var(--tkn-bg-muted)",
        padding: "0.75rem",
        borderRadius: 4,
        borderLeft: "3px solid var(--tkn-accent)",
        lineHeight: value,
      }}
    >
      The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How
      vexingly quick daft zebras jump.
    </div>
  </div>
);

// ─── Letter Spacing ──────────────────────────────────────────

export const LetterSpacingSample = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
    <div style={label}>
      {name} <code style={code}>{value}</code>
    </div>
    <div
      style={{
        fontSize: "1rem",
        textTransform: "uppercase",
        background: "var(--tkn-bg-muted)",
        padding: "0.75rem",
        borderRadius: 4,
        borderLeft: "3px solid #6366f1",
        letterSpacing: value,
      }}
    >
      The quick brown fox
    </div>
  </div>
);

// ─── Duration ────────────────────────────────────────────────

export const DurationBar = ({ name, value }: { name: string; value: string }): El => {
  const [playing, setPlaying] = React.useState(false);
  const play = () => {
    setPlaying(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  };
  return (
    <div style={{ ...card, borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
      <div
        style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.75rem" }}
      >
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{name}</div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            fontFamily: "var(--tkn-mono)",
            color: "var(--tkn-accent)",
          }}
        >
          {value}
        </div>
      </div>
      <div
        style={{
          height: 8,
          background: "var(--tkn-bg-subtle)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "0.625rem",
        }}
      >
        <div
          onAnimationEnd={() => setPlaying(false)}
          style={{
            height: "100%",
            width: playing ? "100%" : 0,
            background: `linear-gradient(90deg, var(--tkn-accent), var(--tkn-accent-light))`,
            borderRadius: 4,
            transition: playing ? "none" : undefined,
            animation: playing ? `teikn-fill-bar ${value} ease forwards` : "none",
          }}
        />
      </div>
      <style>{`@keyframes teikn-fill-bar { from { width: 0 } to { width: 100% } }`}</style>
      <button
        onClick={play}
        style={{
          background: "none",
          border: "1px solid var(--tkn-border)",
          borderRadius: 4,
          padding: "0.2rem 0.75rem",
          fontSize: "0.75rem",
          color: "var(--tkn-text-secondary)",
          cursor: "pointer",
        }}
      >
        &#9654; Play
      </button>
    </div>
  );
};

// ─── Timing ──────────────────────────────────────────────────

export const TimingDemo = ({ name, value }: { name: string; value: string }): El => {
  const [playing, setPlaying] = React.useState(false);
  const play = () => {
    setPlaying(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  };
  return (
    <div style={{ ...card, borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>{name}</div>
      <div
        style={{
          ...mono,
          fontSize: "0.8125rem",
          background: "var(--tkn-bg-subtle)",
          padding: "0.375rem 0.625rem",
          borderRadius: 6,
          display: "inline-block",
          marginBottom: "0.75rem",
        }}
      >
        {value}
      </div>
      <div
        style={{
          height: 6,
          background: "var(--tkn-bg-subtle)",
          borderRadius: 3,
          position: "relative",
          marginBottom: "0.5rem",
        }}
      >
        <div
          onAnimationEnd={() => setPlaying(false)}
          style={{
            width: 20,
            height: 20,
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            borderRadius: "50%",
            position: "absolute",
            top: "50%",
            left: playing ? "calc(100% - 20px)" : 0,
            transform: "translateY(-50%)",
            boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
            animation: playing ? `teikn-slide-right 1.5s ${value} forwards` : "none",
          }}
        />
      </div>
      <style>{`@keyframes teikn-slide-right { from { left: 0 } to { left: calc(100% - 20px) } }`}</style>
      <button
        onClick={play}
        style={{
          background: "none",
          border: "1px solid var(--tkn-border)",
          borderRadius: 4,
          padding: "0.2rem 0.75rem",
          fontSize: "0.75rem",
          color: "var(--tkn-text-secondary)",
          cursor: "pointer",
        }}
      >
        &#9654; Play
      </button>
    </div>
  );
};

// ─── Transition ──────────────────────────────────────────────

export const TransitionDemo = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
    <div
      style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.75rem" }}
    >
      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{name}</div>
      <div
        style={{
          ...mono,
          fontSize: "0.8125rem",
          background: "var(--tkn-bg-subtle)",
          padding: "0.375rem 0.625rem",
          borderRadius: 6,
        }}
      >
        {value}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div
        style={{
          width: 60,
          height: 60,
          background: "var(--tkn-accent)",
          borderRadius: 8,
          transition: value,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.transform = "scale(1.15)";
          (e.target as HTMLElement).style.background = "var(--tkn-accent-light)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.transform = "";
          (e.target as HTMLElement).style.background = "var(--tkn-accent)";
        }}
      />
      <span style={{ fontSize: "0.75rem", color: "var(--tkn-text-muted)" }}>Hover to preview</span>
    </div>
  </div>
);

// ─── Breakpoint ──────────────────────────────────────────────

const useMeasuredPx = (
  value: string,
): { px: number; isDynamic: boolean; ref: React.RefObject<HTMLDivElement | null> } => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [px, setPx] = React.useState(0);
  const isStatic = /^[\d.]+\s*(px|rem|em|pt|cm|mm|in)?$/.test(value);

  React.useEffect(() => {
    if (!ref.current) {
      return undefined;
    }
    setPx(ref.current.getBoundingClientRect().width);
    if (!isStatic) {
      const onResize = () => setPx(ref.current?.getBoundingClientRect().width ?? 0);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    return undefined;
  }, [value, isStatic]);

  return { px, isDynamic: !isStatic, ref };
};

export const BreakpointBar = ({ name, value }: { name: string; value: string }): El => {
  const { px, isDynamic, ref } = useMeasuredPx(value);
  const pct = px > 0 ? Math.min((px / 1280) * 100, 100) : 0;
  return (
    <div style={{ ...card, padding: "1rem", marginBottom: "0.75rem" }}>
      <div style={label}>
        {name} <code style={code}>{value}</code>
        {isDynamic && (
          <span
            style={{ fontSize: "0.6875rem", color: "var(--tkn-text-muted)", marginLeft: "0.5rem" }}
          >
            ({Math.round(px)}px at current viewport)
          </span>
        )}
      </div>
      <div ref={ref} style={{ position: "absolute", visibility: "hidden", width: value }} />
      <div
        style={{
          height: 12,
          borderRadius: 3,
          transition: "width 0.2s ease",
          background: isDynamic
            ? "linear-gradient(90deg, #6366f1, #a78bfa)"
            : `linear-gradient(90deg, var(--tkn-accent), var(--tkn-accent-light))`,
          width: `${pct}%`,
        }}
      />
    </div>
  );
};

// ─── Size ────────────────────────────────────────────────────

export const SizeBox = ({ name, value }: { name: string; value: string }): El => (
  <div style={{ ...card, padding: "1rem", width: 140, textAlign: "center" }}>
    <div
      style={{
        width: value,
        height: value,
        background: "var(--tkn-accent)",
        borderRadius: 4,
        margin: "0.5rem auto",
      }}
    />
    <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{name}</div>
    <div style={mono}>{value}</div>
  </div>
);

// ─── Aspect Ratio ────────────────────────────────────────────

export const RatioBox = ({ name, value }: { name: string; value: string }): El => {
  const parts = value.split("/").map((s) => parseFloat(s.trim()));
  const w = parts[0] ?? 1;
  const h = parts[1] ?? 1;
  const boxW = 120;
  const boxH = Math.round(boxW * (h / w));
  return (
    <div style={{ ...card, padding: "1rem", width: 180, textAlign: "center" }}>
      <div
        style={{
          width: boxW,
          height: Math.min(boxH, 160),
          background: `linear-gradient(135deg, var(--tkn-accent), var(--tkn-accent-light))`,
          borderRadius: 4,
          margin: "0.5rem auto",
        }}
      />
      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{name}</div>
      <div style={mono}>{value}</div>
    </div>
  );
};

// ─── Z-Layer ─────────────────────────────────────────────────

const layerColors = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
];

export const ZLayerStack = ({ items }: { items: Array<{ name: string; value: string }> }): El => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 0,
      paddingLeft: "5rem",
      position: "relative",
    }}
  >
    {items.map(({ name, value }, i) => {
      const color = layerColors[i % layerColors.length]!;
      const widthPct = 40 + Math.round((i / Math.max(items.length - 1, 1)) * 55);
      return (
        <div
          key={name}
          style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}
        >
          <span
            style={{
              position: "absolute",
              left: 0,
              width: "4.5rem",
              textAlign: "right",
              ...mono,
              fontWeight: 600,
            }}
          >
            {value}
          </span>
          <div
            style={{
              height: 44,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              padding: "0 1rem",
              fontWeight: 600,
              fontSize: "0.8125rem",
              color: "#fff",
              background: color,
              width: `${widthPct}%`,
              minWidth: 120,
            }}
          >
            {name}
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Mode Table ──────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.375rem 0.625rem",
  background: "var(--tkn-bg-subtle)",
  borderBottom: "2px solid var(--tkn-border)",
  fontWeight: 600,
  fontSize: "0.6875rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "var(--tkn-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.375rem 0.625rem",
  borderBottom: "1px solid var(--tkn-border)",
};

export const ModeTable = ({
  tokenKeys,
  modesData,
}: {
  tokenKeys: readonly string[];
  modesData: Record<string, Record<string, string>>;
}): ElOrNull => {
  const relevant = tokenKeys.filter((k) => modesData[k]);
  if (relevant.length === 0) {
    return null;
  }
  return (
    <div
      style={{ marginTop: "1.5rem", borderTop: "1px solid var(--tkn-border)", paddingTop: "1rem" }}
    >
      <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Mode Variants
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Mode</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          {relevant.flatMap((key) =>
            Object.entries(modesData[key]!).map(([mode, val]) => (
              <tr key={`${key}-${mode}`}>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{key}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      padding: "0.125rem 0.375rem",
                      background: "var(--tkn-bg-subtle)",
                      borderRadius: 3,
                      fontFamily: "var(--tkn-mono)",
                    }}
                  >
                    {mode}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontFamily: "var(--tkn-mono)" }}>{val}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Fallback table ──────────────────────────────────────────

export const TokenTable = ({ items }: { items: Array<{ name: string; value: string }> }): El => (
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
    <thead>
      <tr>
        <th style={thStyle}>Name</th>
        <th style={thStyle}>Value</th>
      </tr>
    </thead>
    <tbody>
      {items.map(({ name, value }) => (
        <tr key={name}>
          <td style={{ ...tdStyle, fontWeight: 500 }}>{name}</td>
          <td style={{ ...tdStyle, fontFamily: "var(--tkn-mono)" }}>{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
