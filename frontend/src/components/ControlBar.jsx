import { motion, AnimatePresence } from 'framer-motion';
import { pauseTraining, resumeTraining, stopTraining, updateTrainingSpeed, getModelDownloadUrl } from '../services/api';
import { useState } from 'react';

export default function ControlBar({ sessionId, status, epoch, totalEpochs, loss, onStatusChange }) {
  const [isTurbo, setIsTurbo] = useState(false);
  
  const running = status === 'running';
  const paused  = status === 'paused';
  const done    = status === 'complete';

  const handlePause = async () => {
    await pauseTraining(sessionId);
    onStatusChange('paused');
  };

  const handleResume = async () => {
    await resumeTraining(sessionId);
    onStatusChange('running');
  };

  const handleStop = async () => {
    await stopTraining(sessionId);
    onStatusChange('idle');
  };

  const handleDownload = () => {
    const url = getModelDownloadUrl(sessionId);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlvizard_model.pt`;
    a.click();
  };

  const handleTurboToggle = async () => {
    const nextTurbo = !isTurbo;
    setIsTurbo(nextTurbo);
    // Turbo: 0ms delay, stream every 25 steps
    // Normal: 50ms delay, stream every 5 steps
    const delay = nextTurbo ? 0 : 0.05;
    const streamEvery = nextTurbo ? 25 : 5;
    await updateTrainingSpeed(sessionId, delay, streamEvery);
  };

  const progress = totalEpochs > 0 ? (epoch / totalEpochs) * 100 : 0;

  return (
    <div className="control-bar card" style={{ padding: '12px 16px' }}>
      {/* Progress bar */}
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'linear', duration: 0.4 }}
        />
      </div>

      <div className="flex ai-c jc-start fw-w gap-3" style={{ marginTop: 10 }}>
        {/* Epoch / loss info */}
        <div className="flex ai-c gap-3 fw-w">
          <div className="stat-pill">
            <span className="text-xs text-muted">Epoch</span>
            <span className="text-sm" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {epoch}<span className="text-muted">/{totalEpochs || '?'}</span>
            </span>
          </div>
          {loss != null && (
            <div className="stat-pill">
              <span className="text-xs text-muted">Loss</span>
              <span className="text-sm" style={{ color: 'var(--gold)', fontWeight: 600, fontFamily: 'monospace' }}>
                {loss.toFixed(5)}
              </span>
            </div>
          )}
          {status !== 'idle' && (
            <div className="flex ai-c gap-2">
              <div className={`status-dot ${status === 'running' ? 'running' : status === 'complete' ? 'done' : ''}`} />
              <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{status}</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex ai-c gap-2 fw-w">
          {(running || paused) && (
            <>
              {running ? (
                <button
                  id="btn-pause"
                  className="btn"
                  onClick={handlePause}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Pause
                </button>
              ) : (
                <button
                  id="btn-resume"
                  className="btn btn-accent"
                  onClick={handleResume}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Resume
                </button>
              )}
              <button
                id="btn-stop"
                className="btn btn-danger"
                onClick={handleStop}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>
                Stop
              </button>
              
              <button
                id="btn-turbo"
                className={`btn ${isTurbo ? 'btn-accent' : ''}`}
                onClick={handleTurboToggle}
                title={isTurbo ? "Disable High Speed" : "Fast Forward (Turbo Mode)"}
                style={{ 
                  borderColor: isTurbo ? 'var(--gold)' : '',
                  boxShadow: isTurbo ? '0 0 10px rgba(255, 215, 0, 0.4)' : ''
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isTurbo ? "var(--gold)" : "currentColor"}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                {isTurbo ? "Turbo ON" : "Fast Forward"}
              </button>
            </>
          )}

          {done && (
            <button
              id="btn-download-model"
              className="btn btn-accent"
              onClick={handleDownload}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download .pt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
