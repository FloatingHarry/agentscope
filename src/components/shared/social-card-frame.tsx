type SocialCardFrameProps = {
  emphasis: string;
  supportingLine: string;
};

const panelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 14,
  minWidth: 240,
  borderRadius: 28,
  border: "1px solid rgba(23, 33, 38, 0.08)",
  background: "rgba(255, 252, 246, 0.92)",
  padding: "24px 26px",
  boxShadow: "0 24px 80px rgba(23, 33, 38, 0.08)",
};

const pillStyle = {
  display: "flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid rgba(16, 163, 154, 0.16)",
  background: "rgba(16, 163, 154, 0.1)",
  padding: "10px 18px",
  color: "#10A39A",
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
};

export function SocialCardFrame({
  emphasis,
  supportingLine,
}: SocialCardFrameProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at top left, rgba(16, 163, 154, 0.18), transparent 36%), radial-gradient(circle at top right, rgba(76, 174, 115, 0.12), transparent 28%), linear-gradient(180deg, rgba(247, 245, 239, 0.98), rgba(247, 245, 239, 1))",
        color: "#172126",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
            <div
              style={{
                color: "#10A39A",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
              }}
            >
              AI Product Intelligence Agent
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={pillStyle}>Mock-first intelligence</div>
              <div
                style={{
                  ...pillStyle,
                  color: "#677181",
                  border: "1px solid rgba(23, 33, 38, 0.08)",
                  background: "rgba(255, 252, 246, 0.84)",
                }}
              >
                Dashboard / Compare / Weekly brief
              </div>
            </div>
          </div>
          <div style={{ ...panelStyle, minWidth: 252 }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#677181",
              }}
            >
              Pipeline
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 700 }}>
              Raw → normalize → classify → rank → summarize
            </div>
            <div style={{ fontSize: 22, lineHeight: 1.5, color: "#4F5B6B" }}>
              A focused product-intelligence demo built for strategy conversations, not chat.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
            <div style={{ fontSize: 82, lineHeight: 0.95, fontWeight: 700 }}>
              Track where AI products are actually moving.
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.45, color: "#4F5B6B" }}>
              {supportingLine}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 300 }}>
            <div style={panelStyle}>
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "#677181",
                }}
              >
                This demo highlights
              </div>
              <div style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 700 }}>
                {emphasis}
              </div>
              <div style={{ fontSize: 21, lineHeight: 1.45, color: "#4F5B6B" }}>
                8 tracked AI products, 6 weeks of mock updates, and one reusable intelligence
                pipeline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
