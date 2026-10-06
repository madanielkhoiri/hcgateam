"use client";

type Series = { label: string; color: string; values: number[] };

export default function MultiLineChart({
  title,
  subtitle,
  labels,
  series,
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  series: Series[];
}) {
  const width = 900;
  const height = 280;
  const left = 58;
  const top = 28;
  const graphWidth = 784;
  const graphHeight = 185;
  const maksimum = Math.max(1, ...series.flatMap((item) => item.values));
  const titik = (values: number[]) => values.map((value, index) => ({
    x: left + (index / Math.max(1, labels.length - 1)) * graphWidth,
    y: top + graphHeight - (value / maksimum) * graphHeight,
    value,
  }));

  return (
    <section style={{ background: '#fff', border: '1px solid #d8e4f2', borderRadius: 16, overflow: 'hidden' }}>
      <header style={{ padding: '16px 18px', borderBottom: '1px solid #e3ebf5' }}>
        <strong style={{ display: 'block', color: '#0d315c', fontSize: 16 }}>{title}</strong>
        {subtitle && <span style={{ display: 'block', marginTop: 3, color: '#6d83a0', fontSize: 12 }}>{subtitle}</span>}
      </header>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', padding: '12px 18px 0' }}>
        {series.map((item) => <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#48617e', fontSize: 12 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />{item.label}</span>)}
      </div>
      <div style={{ overflowX: 'auto', padding: '2px 12px 8px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 680, height: 320, display: 'block' }} role="img" aria-label={title}>
          {[0, 1, 2, 3, 4].map((row) => <line key={row} x1={left} x2={left + graphWidth} y1={top + row * (graphHeight / 4)} y2={top + row * (graphHeight / 4)} stroke="#dbe6f2" strokeDasharray="5 7" />)}
          {series.map((item) => {
            const points = titik(item.values);
            return <g key={item.label}>
              <path d={points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="5" fill={item.color} stroke="#fff" strokeWidth="2"><title>{item.label} {labels[index]}: {point.value} kg</title></circle>)}
            </g>;
          })}
          {labels.map((label, index) => <text key={label} x={left + (index / Math.max(1, labels.length - 1)) * graphWidth} y="244" textAnchor="middle" fontSize="12" fill="#607a99">{label}</text>)}
        </svg>
      </div>
    </section>
  );
}
