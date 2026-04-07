import { motion } from 'framer-motion';

const TABS = ['Upload', 'Configure', 'Visualize'];

export default function Header({ activeTab, onTabChange, status }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <span className="logo-dot" />
          <span className="logo-dot" />
          <span className="logo-dot" />
        </div>
        <span className="header-title">MLVizard</span>
        <span className="badge badge-accent" style={{ marginLeft: 8 }}>beta</span>
      </div>

      <nav className="tabs" style={{ width: 320 }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => onTabChange(i)}
            id={`tab-${tab.toLowerCase()}`}
          >
            <span className="tab-index">{i + 1}</span>
            {tab}
          </button>
        ))}
      </nav>

      <div className="flex ai-c gap-2">
        {status === 'running' && (
          <motion.div
            className="flex ai-c gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="status-dot running" />
            <span className="text-xs text-muted">Training</span>
          </motion.div>
        )}
        {status === 'paused' && (
          <div className="flex ai-c gap-2">
            <div className="status-dot" style={{ background: 'var(--gold)' }} />
            <span className="text-xs text-muted">Paused</span>
          </div>
        )}
        {status === 'complete' && (
          <div className="flex ai-c gap-2">
            <div className="status-dot done" />
            <span className="text-xs text-muted">Complete</span>
          </div>
        )}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost text-xs"
          style={{ padding: '5px 10px' }}
        >
          Docs
        </a>
      </div>
    </header>
  );
}
