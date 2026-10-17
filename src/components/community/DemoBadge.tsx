/* Marks fictional demo accounts and everything they made. Visible text, never colour alone. */
export default function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`demo-badge${compact ? ' is-compact' : ''}`} title="Demo account: fictional, for testing. Not a real person's activity.">
      Demo<span className="vm-sr"> account: fictional, for testing</span>
    </span>
  );
}
