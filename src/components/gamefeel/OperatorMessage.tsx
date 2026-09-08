export function OperatorMessage({ title = 'CYBER GUIDE', message, tone = 'info' }: { title?: string; message: string; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  return <aside className={`operator-message operator-${tone}`} role="status"><div className="operator-mark" aria-hidden="true"><span>CG</span></div><div><strong>{title}</strong><p>{message}</p></div></aside>;
}
