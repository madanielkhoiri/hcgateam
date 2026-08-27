'use client';

// ==================================================
// FILE: frontend/src/components/dashboard-charts/simple-pie-chart.tsx
// FUNGSI: Grafik lingkaran (donut) sederhana - tanpa library eksternal
// ==================================================

type SlicePoint = {
  label: string;
  value: number;
  color: string;
};

type SimplePieChartProps = {
  title: string;
  subtitle?: string;
  data: SlicePoint[];
  satuan?: string;
};

export default function SimplePieChart({ title, subtitle, data, satuan = 'kg' }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 220;
  const radius = 80;
  const strokeWidth = 34;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let kumulatif = 0;

  const slices = data.map((item) => {
    const fraction = total > 0 ? item.value / total : 0;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const offset = -kumulatif * circumference;
    kumulatif += fraction;
    return { ...item, dash, gap, offset, fraction };
  });

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #d8e4f2',
        borderRadius: 16,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <header style={{ padding: '16px 18px', borderBottom: '1px solid #e3ebf5' }}>
        <strong style={{ display: 'block', color: '#0d315c', fontSize: 16 }}>{title}</strong>
        {subtitle && (
          <span style={{ display: 'block', marginTop: 3, color: '#6d83a0', fontSize: 12 }}>
            {subtitle}
          </span>
        )}
      </header>

      {total <= 0 ? (
        <div
          style={{
            minHeight: 280,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            color: '#6d83a0',
            padding: 24,
          }}
        >
          Belum ada data pada periode ini.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, padding: 22 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
            <g transform={`rotate(-90 ${center} ${center})`}>
              {slices.map((slice, index) => (
                <circle
                  key={slice.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${slice.dash} ${slice.gap}`}
                  style={
                    {
                      '--pieStart': slice.offset + slice.dash,
                      '--pieEnd': slice.offset,
                      strokeDashoffset: slice.offset + slice.dash,
                      animation: `pieSliceSweep 0.9s ease forwards`,
                      animationDelay: `${index * 0.14}s`,
                    } as React.CSSProperties
                  }
                >
                  <title>
                    {slice.label}: {slice.value.toLocaleString('id-ID')} {satuan}
                  </title>
                </circle>
              ))}
            </g>

            <g
              style={{
                opacity: 0,
                transformOrigin: `${center}px ${center}px`,
                animation: `pieCenterShow 0.4s ease ${slices.length * 0.14 + 0.15}s forwards`,
              }}
            >
              <text
                x={center}
                y={center - 4}
                textAnchor="middle"
                fontSize="16"
                fontWeight="800"
                fill="#0d315c"
              >
                {total.toLocaleString('id-ID')}
              </text>
              <text x={center} y={center + 15} textAnchor="middle" fontSize="10.5" fill="#6d83a0">
                total {satuan}
              </text>
            </g>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {slices.map((slice, index) => (
              <div
                key={slice.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12.5,
                  opacity: 0,
                  animation: `pieLegendShow 0.35s ease ${index * 0.14 + 0.1}s forwards`,
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    background: slice.color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ minWidth: 150, color: '#34506f' }}>{slice.label}</span>
                <strong style={{ color: '#0d315c' }}>
                  {slice.value.toLocaleString('id-ID')} {satuan}
                </strong>
                <span style={{ color: '#93a2b8' }}>({(slice.fraction * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>

          <style jsx>{`
            @keyframes pieSliceSweep {
              from {
                stroke-dashoffset: var(--pieStart);
              }

              to {
                stroke-dashoffset: var(--pieEnd);
              }
            }

            @keyframes pieCenterShow {
              from {
                opacity: 0;
                transform: scale(0.85);
              }

              to {
                opacity: 1;
                transform: scale(1);
              }
            }

            @keyframes pieLegendShow {
              from {
                opacity: 0;
                transform: translateX(-6px);
              }

              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
