import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadCSV } from '../services/api';

export default function CSVUploader({ onUpload }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null); // { columns, rows, preview }

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await uploadCSV(file);
      const data = res.data;
      setInfo(data);
      onUpload(data);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex col gap-3" style={{ height: '100%' }}>
      <div>
        <h2>Upload Dataset</h2>
        <p className="text-sm" style={{ marginTop: 4 }}>
          Upload a CSV file — the last column is used as the target by default.
        </p>
      </div>

      {/* Drop zone */}
      <motion.div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${info ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.998 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
          id="csv-file-input"
        />

        {loading ? (
          <div className="flex col ai-c gap-2">
            <div className="spinner" />
            <span className="text-sm text-muted">Parsing CSV...</span>
          </div>
        ) : info ? (
          <div className="flex col ai-c gap-2">
            <div className="drop-icon drop-icon--success">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-sm" style={{ color: 'var(--accent)' }}>
              {info.rows} rows · {info.columns.length} columns
            </span>
            <span className="text-xs text-muted">Click to replace</span>
          </div>
        ) : (
          <div className="flex col ai-c gap-2">
            <div className="drop-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="text-sm">Drop CSV here or <span className="text-accent">browse</span></span>
            <span className="text-xs text-muted">Supported: .csv with numeric/categorical columns</span>
          </div>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table */}
      <AnimatePresence>
        {info && (
          <motion.div
            className="card grow"
            style={{ overflow: 'auto', padding: 0 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="preview-header">
              <span className="text-xs text-muted">Preview · first 5 rows</span>
              <div className="flex ai-c gap-2">
                <span className="badge">{info.rows} rows</span>
                <span className="badge badge-accent">{info.columns.length} cols</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {info.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {info.preview.map((row, i) => (
                    <tr key={i}>
                      {info.columns.map((col) => (
                        <td key={col}>{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
