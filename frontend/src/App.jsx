import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Header from './components/Header';
import CSVUploader from './components/CSVUploader';
import PseudoEditor from './components/PseudoEditor';
import ModelConfigurator from './components/ModelConfigurator';
import ControlBar from './components/ControlBar';
import ExplanationOverlay from './components/ExplanationOverlay';
import LossChart from './components/LossChart';
import NeuralNetCanvas from './visualization/NeuralNetCanvas';

import { useTrainingState } from './hooks/useTrainingState';
import { useWebSocket } from './hooks/useWebSocket';
import { startTraining } from './services/api';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function App() {
  const [activeTab, setActiveTab]   = useState(0);
  const [configMode, setConfigMode] = useState('form'); // 'form' | 'pseudo'
  const [pendingConfig, setPendingConfig] = useState(null);
  const [trainError, setTrainError] = useState(null);

  const { state, dispatch, handleWsMessage } = useTrainingState();
  const { send: wsSend } = useWebSocket(state.sessionId, handleWsMessage);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleUpload = (data) => {
    dispatch({ type: 'SET_UPLOAD', ...data });
    // Default target to last column
    dispatch({ type: 'SET_TARGET', col: data.columns[data.columns.length - 1] });
    setActiveTab(1);
  };

  const handleConfig = (config) => {
    setPendingConfig(config);
  };

  const handleStartTraining = async () => {
    if (!state.sessionId) { setTrainError('Upload a CSV first.'); return; }
    if (!pendingConfig)   { setTrainError('Apply a model config first.'); return; }
    setTrainError(null);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STATUS', status: 'running' });
    dispatch({ type: 'SET_TOTAL_EPOCHS', epochs: pendingConfig.epochs });

    try {
      await startTraining(
        state.sessionId,
        state.targetCol,
        pendingConfig,
        pendingConfig.stream_every ?? 5,
        pendingConfig.delay ?? 0.05
      );
      setActiveTab(2);
    } catch (e) {
      setTrainError(e.response?.data?.detail ?? 'Failed to start training.');
      dispatch({ type: 'SET_STATUS', status: 'error' });
    }
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        status={state.status}
      />

      <main className="app-main">
        <AnimatePresence mode="wait">

          {/* ── Tab 0: Upload ───────────────────────────────────────────── */}
          {activeTab === 0 && (
            <motion.div key="upload" className="tab-page" {...pageVariants}>
              <div className="page-center">
                <CSVUploader onUpload={handleUpload} />
              </div>
            </motion.div>
          )}

          {/* ── Tab 1: Configure ────────────────────────────────────────── */}
          {activeTab === 1 && (
            <motion.div key="configure" className="tab-page" {...pageVariants}>
              <div className="configure-layout">

                {/* Left: target select + config */}
                <div className="configure-left flex col gap-3">

                  {/* Target column selector */}
                  {state.columns.length > 0 && (
                    <div className="card flex col gap-2">
                      <label htmlFor="select-target">Target Column</label>
                      <select
                        id="select-target"
                        value={state.targetCol}
                        onChange={(e) => dispatch({ type: 'SET_TARGET', col: e.target.value })}
                      >
                        {state.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted">
                        {state.rows} rows · {state.columns.length} columns loaded
                      </p>
                    </div>
                  )}

                  {/* Config mode toggle */}
                  <div className="tabs" style={{ width: '100%' }}>
                    <button
                      className={`tab ${configMode === 'form' ? 'active' : ''}`}
                      onClick={() => setConfigMode('form')}
                    >
                      Visual Form
                    </button>
                    <button
                      className={`tab ${configMode === 'pseudo' ? 'active' : ''}`}
                      onClick={() => setConfigMode('pseudo')}
                    >
                      Pseudo Editor
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {configMode === 'form' ? (
                      <motion.div key="form" {...pageVariants}>
                        <ModelConfigurator
                          columns={state.columns}
                          onConfig={handleConfig}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="pseudo" {...pageVariants} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <PseudoEditor onConfig={handleConfig} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: start panel */}
                <div className="configure-right flex col gap-3">
                  <div className="card flex col gap-3">
                    <h3>Ready to Train</h3>
                    {pendingConfig ? (
                      <div className="config-summary">
                        <div className="summary-row">
                          <span className="text-xs text-muted">Model</span>
                          <span className="badge badge-accent">{pendingConfig.model_type}</span>
                        </div>
                        <div className="summary-row">
                          <span className="text-xs text-muted">Epochs</span>
                          <span className="text-sm">{pendingConfig.epochs}</span>
                        </div>
                        <div className="summary-row">
                          <span className="text-xs text-muted">LR</span>
                          <span className="text-sm font-mono">{pendingConfig.learning_rate}</span>
                        </div>
                        {pendingConfig.neurons && (
                          <div className="summary-row">
                            <span className="text-xs text-muted">Neurons</span>
                            <span className="text-sm font-mono">[{pendingConfig.neurons.join(', ')}]</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        Apply a config using the form or pseudo editor on the left.
                      </p>
                    )}

                    {trainError && (
                      <div className="error-banner">{trainError}</div>
                    )}

                    <button
                      id="btn-start-training"
                      className="btn btn-accent w-full"
                      onClick={handleStartTraining}
                      disabled={!pendingConfig || !state.sessionId}
                      style={{ justifyContent: 'center', padding: '10px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Start Training
                    </button>
                  </div>

                  {/* Architecture preview (mini) */}
                  {pendingConfig?.neurons && (
                    <div className="card" style={{ height: '240px', display: 'flex', flexDirection: 'column' }}>
                      <p className="text-xs text-muted" style={{ marginBottom: 8 }}>Network Preview</p>
                      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        <NeuralNetCanvas
                          weights={[]}
                          activations={[]}
                          config={pendingConfig}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Tab 2: Visualize ────────────────────────────────────────── */}
          {activeTab === 2 && (
            <motion.div key="visualize" className="tab-page tab-page--no-scroll" {...pageVariants}>
              <div className="visualize-layout">

                {/* Left sidebar: controls + explanation + loss */}
                <div className="viz-sidebar flex col gap-3">
                  <ControlBar
                    sessionId={state.sessionId}
                    status={state.status}
                    epoch={state.epoch}
                    totalEpochs={state.totalEpochs}
                    loss={state.loss}
                    onStatusChange={(s) => dispatch({ type: 'SET_STATUS', status: s })}
                  />

                  <div className="card" style={{ padding: '14px 16px' }}>
                    <LossChart lossHistory={state.lossHistory} />
                  </div>

                  <ExplanationOverlay
                    lastEvent={state.lastEvent}
                    status={state.status}
                  />
                </div>

                {/* Main canvas */}
                <div className="viz-canvas-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="canvas-header">
                    <span className="text-xs text-muted">Neural Network</span>
                    <div className="flex ai-c gap-3">
                      <div className="flex ai-c gap-1">
                        <div style={{ width: 10, height: 3, background: 'hsl(210,90%,65%)', borderRadius: 2 }} />
                        <span className="text-xs text-muted">Positive weight</span>
                      </div>
                      <div className="flex ai-c gap-1">
                        <div style={{ width: 10, height: 3, background: 'hsl(0,80%,60%)', borderRadius: 2 }} />
                        <span className="text-xs text-muted">Negative weight</span>
                      </div>
                      <div className="flex ai-c gap-1">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(50,100%,72%)' }} />
                        <span className="text-xs text-muted">Activation</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <NeuralNetCanvas
                      weights={state.weights}
                      activations={state.activations}
                      config={pendingConfig}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
