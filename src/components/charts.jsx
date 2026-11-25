import { formatDuration } from '../utils/formatTime.js';
import { formatHour } from '../utils/insights.js';

export function BarChart({ data, height = 168, goalSeconds = 0, dense = false }) {
  const max = Math.max(1, goalSeconds, ...data.map((item) => item.seconds));
  return (
    <div className={`bar-chart ${dense ? 'is-dense' : ''}`} style={{ height }} role="img" aria-label="Focus time per day">
      {goalSeconds > 0 ? (
        <div className="bar-goal" style={{ bottom: `calc(${(goalSeconds / max) * 100}% * 0.86 + 22px)` }}>
          <span>goal</span>
        </div>
      ) : null}
      {data.map((item, index) => (
        <div key={item.date} className={`bar-col ${item.isToday ? 'is-today' : ''}`} data-tip={`${item.longLabel} · ${formatDuration(item.seconds)}`}>
          <div className="bar-track">
            <div
              className={`bar ${goalSeconds > 0 && item.seconds >= goalSeconds ? 'is-goal' : ''}`}
              style={{ height: item.seconds ? `${Math.max(4, (item.seconds / max) * 100)}%` : '0%', '--i': index }}
            />
          </div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 168, stroke = 20, centerLabel, centerValue }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Focus time by subject">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        {total > 0
          ? segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              // A small gap between slices keeps adjacent colours readable.
              const gap = segments.length > 1 ? 3 : 0;
              const node = (
                <circle
                  key={segment.id}
                  className="donut-slice"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={stroke}
                  fill="none"
                  stroke={segment.color}
                  strokeDasharray={`${Math.max(0.5, length - gap)} ${circumference}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${segment.label}: ${formatDuration(segment.value)}`}</title>
                </circle>
              );
              offset += length;
              return node;
            })
          : null}
      </svg>
      <div className="ring-center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function Heatmap({ weeks }) {
  return (
    <div className="heatmap" role="img" aria-label="Focus time per day over recent weeks">
      <div className="heatmap-days">
        {DAY_LABELS.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        {weeks.map((week, weekIndex) => (
          <div key={week[0].date} className="heatmap-week" style={{ '--i': weekIndex }}>
            {week.map((day) => (
              <span
                key={day.date}
                className={`heat heat-${day.level} ${day.future ? 'is-future' : ''}`}
                data-tip={day.future ? undefined : `${day.label} · ${day.seconds ? formatDuration(day.seconds) : 'no focus'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`heat heat-${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function HourChart({ hours }) {
  const max = Math.max(1, ...hours.map((item) => item.seconds));
  return (
    <div className="hour-chart" role="img" aria-label="Focus time by hour of day">
      {hours.map((item) => (
        <div key={item.hour} className="hour-col" data-tip={`${formatHour(item.hour)} · ${formatDuration(item.seconds)}`}>
          <div className="hour-bar" style={{ height: `${item.seconds ? Math.max(6, (item.seconds / max) * 100) : 0}%`, '--i': item.hour }} />
          <span>{item.hour % 6 === 0 ? formatHour(item.hour) : ''}</span>
        </div>
      ))}
    </div>
  );
}
