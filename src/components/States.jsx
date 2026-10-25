import ProximityHeading from './ProximityHeading.jsx'
export function LoadingState({ label = 'Loading data…' }) {
  return <div className="state-card" role="status"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>
}

export function ErrorState({ title = 'Could not load data', message, onRetry }) {
  return <div className="state-card error-state" role="alert"><span className="state-symbol">!</span><div><strong>{title}</strong><p>{message || 'Check your connection and try again.'}</p>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}</div></div>
}

export function EmptyState({ title, description }) {
  return <div className="empty-card"><div className="empty-art" aria-hidden="true"><div className="art-sheet"><span /><span /><span /></div><div className="art-search">⌕</div></div><ProximityHeading as="h2">{title}</ProximityHeading><p>{description}</p></div>
}
