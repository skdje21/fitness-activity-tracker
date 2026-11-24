import { useState } from 'react';

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const UNITS = { steps: 'шаг.', calories: 'ккал', minutes: 'мин', count: 'рег.' };

/* ============================================================
   SeriesChart — SVG столбчатый график с подсказкой
   ============================================================ */
export function SeriesChart({ data, metric, range, unit }) {
    const [hover, setHover] = useState(null);
    if (!data || data.length === 0) return <p className="subtitle">Нет данных за период</p>;

    const W = 700, H = 180, PX = 40, PY = 20;
    const plotW = W - PX * 2, plotH = H - PY * 2;
    const vals = data.map(d => d[metric] || 0);
    const maxVal = Math.max(1, ...vals);
    const barW = Math.max(4, Math.min(24, (plotW / data.length) - 2));

    function formatLabel(d) {
        const s = d.date;
        if (range === '7d' || range === '30d') return s.slice(8) + '.' + s.slice(5, 7);
        return s.slice(5, 7) + '/' + s.slice(8);
    }

    const metricLabel = unit || UNITS[metric] || '';
    const step = Math.max(1, Math.floor(data.length / 8));

    return (
        <div className="series-chart-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="series-chart-svg">
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = PY + plotH - f * plotH;
                    return (
                        <g key={f}>
                            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                            <text x={PX - 4} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="9">{nf(Math.round(maxVal * f))}</text>
                        </g>
                    );
                })}

                {data.map((d, i) => {
                    const x = PX + (i + 0.5) * (plotW / data.length);
                    const v = d[metric] || 0;
                    const h = (v / maxVal) * plotH;
                    const y = PY + plotH - h;
                    return (
                        <g key={d.date}
                           onMouseEnter={() => setHover({ i, x, y, v, date: d.date })}
                           onMouseLeave={() => setHover(null)}>
                            <rect
                                x={x - barW / 2} y={y} width={barW} height={Math.max(1, h)}
                                rx={3}
                                fill={hover?.i === i ? '#34d399' : '#22c55e'}
                                opacity={hover?.i === i ? 1 : 0.8}
                            />
                            {i % step === 0 && (
                                <text x={x} y={H - 2} textAnchor="middle" fill="var(--muted)" fontSize="9">{formatLabel(d)}</text>
                            )}
                        </g>
                    );
                })}

                {hover && (
                    <g>
                        <rect x={hover.x - 50} y={hover.y - 30} width={100} height={22} rx={6} fill="var(--card)" stroke="var(--border)" />
                        <text x={hover.x} y={hover.y - 15} textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="600">{nf(hover.v)} {metricLabel}</text>
                    </g>
                )}
            </svg>
        </div>
    );
}

/* ============================================================
   DonutChart — SVG кольцевая диаграмма
   ============================================================ */
export function DonutChart({ data, colors, centerLabel = 'шагов' }) {
    const [hover, setHover] = useState(null);
    const total = data.reduce((s, d) => s + (d.totalSteps || 0), 0);
    if (total === 0) return null;

    const R = 70, r = 42, cx = 90, cy = 90;
    let startAngle = -Math.PI / 2;

    const slices = data.map((d, i) => {
        const pct = d.totalSteps / total;
        const angle = pct * Math.PI * 2;
        const endAngle = startAngle + angle;
        const largeArc = angle > Math.PI ? 1 : 0;

        const x1o = cx + R * Math.cos(startAngle);
        const y1o = cy + R * Math.sin(startAngle);
        const x2o = cx + R * Math.cos(endAngle);
        const y2o = cy + R * Math.sin(endAngle);
        const x1i = cx + r * Math.cos(endAngle);
        const y1i = cy + r * Math.sin(endAngle);
        const x2i = cx + r * Math.cos(startAngle);
        const y2i = cy + r * Math.sin(startAngle);

        const path = [
            `M ${x1o} ${y1o}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x2o} ${y2o}`,
            `L ${x1i} ${y1i}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${x2i} ${y2i}`,
            'Z',
        ].join(' ');

        startAngle = endAngle;
        return { path, color: colors[i % colors.length], type: d.type, steps: d.totalSteps, pct: Math.round(pct * 100) };
    });

    return (
        <div className="donut-wrap">
            <svg viewBox="0 0 180 180" className="donut-svg">
                {slices.map((s, i) => (
                    <path
                        key={s.type}
                        d={s.path}
                        fill={s.color}
                        opacity={hover === null || hover === i ? 1 : 0.4}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                    />
                ))}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="700">
                    {hover !== null ? `${slices[hover].pct}%` : nf(total)}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--muted)" fontSize="10">
                    {hover !== null ? slices[hover].type : centerLabel}
                </text>
            </svg>
        </div>
    );
}
