import { useState } from 'react';
import { motion } from 'framer-motion';

const ACTIVATIONS = ['relu', 'tanh', 'sigmoid', 'leaky_relu'];
const OUTPUTS     = ['softmax', 'sigmoid', 'none'];
const MODEL_TYPES = ['neural_network', 'linear', 'logistic'];

export default function ModelConfigurator({ columns, onConfig }) {
  const [modelType, setModelType]   = useState('neural_network');
  const [layers, setLayers]         = useState(2);
  const [neuronsStr, setNeuronsStr] = useState('8, 4');
  const [activation, setActivation] = useState('relu');
  const [output, setOutput]         = useState('softmax');
  const [epochs, setEpochs]         = useState(50);
  const [lr, setLr]                 = useState(0.01);
  const [batchSize, setBatchSize]   = useState(32);
  const [streamEvery, setStreamEvery] = useState(5);
  const [speed, setSpeed]             = useState(0.8); // 0.0 to 1.0, 1.0 is fastest
  const [applied, setApplied]       = useState(false);

  const handleApply = () => {
    const neurons = neuronsStr.split(',').map((n) => parseInt(n.trim())).filter(Boolean);
    const config = {
      model_type: modelType,
      layers: Number(layers),
      neurons,
      activation,
      output_activation: output,
      epochs: Number(epochs),
      learning_rate: Number(lr),
      batch_size: Number(batchSize),
      stream_every: Number(streamEvery),
      delay: (1.0 - speed) * 0.5, // map 0.0-1.0 to 0.5s down to 0s
    };
    onConfig?.(config);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const isNN = modelType === 'neural_network';

  return (
    <div className="flex col gap-3">
      <div className="flex ai-c jc-sb">
        <div>
          <h2>Model Configurator</h2>
          <p className="text-sm" style={{ marginTop: 2 }}>Visual alternative to the pseudo editor.</p>
        </div>
        <motion.button
          id="btn-apply-config"
          className="btn btn-accent"
          onClick={handleApply}
          animate={applied ? { scale: [1, 1.06, 1] } : {}}
          style={applied ? { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' } : {}}
        >
          {applied ? 'Applied!' : 'Apply Config'}
        </motion.button>
      </div>

      <div className="configurator-grid">
        {/* Model type */}
        <div className="config-field">
          <label htmlFor="cfg-model-type">Model Type</label>
          <select
            id="cfg-model-type"
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
          >
            {MODEL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Layers — only NN */}
        {isNN && (
          <div className="config-field">
            <label htmlFor="cfg-layers">Layers</label>
            <input
              id="cfg-layers"
              type="number"
              min={1} max={8}
              value={layers}
              onChange={(e) => setLayers(e.target.value)}
            />
          </div>
        )}

        {/* Neurons — only NN */}
        {isNN && (
          <div className="config-field config-field--wide">
            <label htmlFor="cfg-neurons">Neurons per layer (comma-separated)</label>
            <input
              id="cfg-neurons"
              type="text"
              value={neuronsStr}
              onChange={(e) => setNeuronsStr(e.target.value)}
              placeholder="e.g. 8, 6, 4"
            />
          </div>
        )}

        {/* Activation — only NN */}
        {isNN && (
          <div className="config-field">
            <label htmlFor="cfg-activation">Activation</label>
            <select
              id="cfg-activation"
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
            >
              {ACTIVATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        {/* Output activation */}
        {isNN && (
          <div className="config-field">
            <label htmlFor="cfg-output">Output Activation</label>
            <select
              id="cfg-output"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            >
              {OUTPUTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        {/* Epochs */}
        <div className="config-field">
          <label htmlFor="cfg-epochs">Epochs</label>
          <input
            id="cfg-epochs"
            type="number"
            min={1} max={1000}
            value={epochs}
            onChange={(e) => setEpochs(e.target.value)}
          />
        </div>

        {/* Learning rate */}
        <div className="config-field">
          <label htmlFor="cfg-lr">Learning Rate</label>
          <input
            id="cfg-lr"
            type="number"
            step={0.0001}
            min={0.0001}
            max={10}
            value={lr}
            onChange={(e) => setLr(e.target.value)}
          />
        </div>

        {/* Batch size */}
        <div className="config-field">
          <label htmlFor="cfg-batch">Batch Size</label>
          <input
            id="cfg-batch"
            type="number"
            min={1} max={1024}
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
          />
        </div>

        {/* Stream every */}
        <div className="config-field">
          <label htmlFor="cfg-stream">Stream Every (steps)</label>
          <input
            id="cfg-stream"
            type="number"
            min={1} max={100}
            value={streamEvery}
            onChange={(e) => setStreamEvery(e.target.value)}
          />
        </div>

        {/* Speed slider */}
        <div className="config-field config-field--wide">
          <div className="flex ai-c jc-sb">
            <label htmlFor="cfg-speed">Training Speed</label>
            <span className="text-xs text-muted">
              {speed < 0.2 ? 'Slow & Steady' : speed > 0.8 ? 'Instant' : 'Balanced'}
            </span>
          </div>
          <input
            id="cfg-speed"
            type="range"
            min={0} max={1} step={0.01}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div className="flex jc-sb text-xs text-muted" style={{ marginTop: 4 }}>
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>
      </div>

      {/* Architecture preview */}
      {isNN && (
        <ArchPreview layers={layers} neuronsStr={neuronsStr} />
      )}
    </div>
  );
}

function ArchPreview({ layers, neuronsStr }) {
  const neurons = neuronsStr.split(',').map((n) => parseInt(n.trim())).filter(Boolean);
  if (!neurons.length) return null;

  const maxN = Math.max(...neurons, 1);

  return (
    <div className="card">
      <p className="text-xs text-muted" style={{ marginBottom: 12 }}>Architecture Preview</p>
      <div className="arch-preview">
        {neurons.map((n, li) => (
          <div key={li} className="arch-layer">
            <div className="arch-nodes">
              {Array.from({ length: Math.min(n, 8) }, (_, ni) => (
                <motion.div
                  key={ni}
                  className="arch-node"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: li * 0.04 + ni * 0.02 }}
                  style={{ opacity: 0.4 + (ni / Math.max(n, 1)) * 0.6 }}
                />
              ))}
              {n > 8 && <span className="text-xs text-muted">+{n - 8}</span>}
            </div>
            <span className="arch-label">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
