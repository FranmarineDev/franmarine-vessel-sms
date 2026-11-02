const LABELS = {
  current: "Current",
  review_due: "Review due",
  draft: "Draft",
  expired: "Expired",
};

export default function StatusBadge({ status }) {
  const key = LABELS[status] ? status : "draft";
  return <span className={`status status-${key}`}>{LABELS[key]}</span>;
}
