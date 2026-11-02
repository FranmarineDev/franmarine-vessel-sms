const ICON = { overdue: "●", due: "●", info: "○" };

export default function AlertList({ alerts, limit, emptyText = "Nothing upcoming or overdue." }) {
  const shown = limit ? alerts.slice(0, limit) : alerts;
  if (!alerts.length) return <div className="panel-body sub">{emptyText}</div>;
  return (
    <ul className="alert-list">
      {shown.map((a, i) => (
        <li key={i} className={`alert-${a.level}`}>
          <span className="alert-dot">{ICON[a.level]}</span>
          <div>
            <strong>{a.title}</strong>
            <span className="crew-sub">{a.detail}</span>
          </div>
          {a.vesselName && <span className="alert-vessel">{a.vesselName.replace("MV ", "")}</span>}
        </li>
      ))}
      {limit && alerts.length > limit && <li className="alert-more">+ {alerts.length - limit} more</li>}
    </ul>
  );
}
