import './OfflineBanner.css';

export default function OfflineBanner({ show }) {
  if (!show) return null;
  return (
    <div className="offline-banner">
      <span>⚠ You're offline — some things may not work until you're back online.</span>
    </div>
  );
}
