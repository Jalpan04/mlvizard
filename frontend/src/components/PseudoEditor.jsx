import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePseudo } from '../services/api';

const DEFAULT_CODE = `DATASET train.csv

MODEL neural_network
LAYERS 3
NEURONS [4, 6, 3]

ACTIVATION relu
OUTPUT softmax

TRAIN
EPOCHS 50
LEARNING_RATE 0.01
BATCH_SIZE 32
STREAM_EVERY 5`;

const KEYWORDS = ['DATASET', 'MODEL', 'LAYERS', 'NEURONS', 'ACTIVATION', 'OUTPUT', 'TRAIN', 'EPOCHS', 'LEARNING_RATE', 'BATCH_SIZE', 'STREAM_EVERY'];

export default function PseudoEditor({ onConfig }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);

  const handleRun = async () => {
    setParsing(true);
    setErrors([]);
    setSuccess(false);
    try {
      const res = await parsePseudo(code);
      const { config, errors: errs } = res.data;
      if (errs && errs.length) {
        setErrors(errs);
      } else {
        setSuccess(true);
        onConfig?.(config);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch {
      setErrors(['Server error during parsing.']);
    } finally {
      setParsing(false);
    }
  };

  // Naive syntax highlight: color keywords blue in a mirrored div
  // We use a plain textarea for editing, overlaid with a styled div for display.
  // For simplicity here, we use a plain highlighted textarea approach.

  const lineCount = code.split('\n').length;

  return (
    <div className="flex col gap-3 h-full">
      <div className="flex ai-c jc-sb">
        <div>
          <h2>Pseudo Editor</h2>
          <p className="text-sm" style={{ marginTop: 2 }}>
            Write training instructions in plain language.
          </p>
        </div>
        <div className="flex ai-c gap-2">
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setCode(DEFAULT_CODE)}
          >
            Reset
          </button>
          <button
            id="btn-run-pseudo"
            className={`btn ${success ? 'btn-accent' : 'btn-accent'}`}
            onClick={handleRun}
            disabled={parsing}
            style={success ? { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' } : {}}
          >
            {parsing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Parsing...</> :
             success ? 'Parsed!' : 'Parse & Apply'}
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="editor-wrap grow">
        {/* Line numbers */}
        <div className="editor-gutters">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="editor-line-num">{i + 1}</div>
          ))}
        </div>

        <textarea
          id="pseudo-editor-textarea"
          className="editor-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyword reference */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <p className="text-xs text-muted" style={{ marginBottom: 8 }}>Keywords</p>
        <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
          {KEYWORDS.map((kw) => (
            <span key={kw} className="badge badge-accent text-xs font-mono">{kw}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
