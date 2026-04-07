import { motion, AnimatePresence } from 'framer-motion';

const EXPLANATION_MAP = {
  snapshot: (ev) => {
    const loss = ev.loss?.toFixed(4);
    return {
      headline: `Step ${ev.step} · Epoch ${ev.epoch}`,
      body: `The model just completed a forward pass and backpropagation. Loss is ${loss}. Weights were adjusted via gradient descent to reduce prediction error.`,
      detail: 'Gradient descent calculates how much each weight contributes to the error, then nudges them in the direction that reduces it.',
    };
  },
  epoch_end: (ev) => ({
    headline: `Epoch ${ev.epoch} complete`,
    body: `Average loss this epoch: ${ev.avg_loss?.toFixed(5)}. The model has seen the entire dataset once more.`,
    detail: `${ev.epoch} of ${ev.total_epochs} epochs done. Each extra epoch gives the model another chance to improve.`,
  }),
  complete: (ev) => ({
    headline: 'Training complete',
    body: `Finished in ${ev.total_steps} steps. The model has converged (or reached the epoch limit).`,
    detail: 'You can now download the model weights or reset to try different hyperparameters.',
  }),
};

export default function ExplanationOverlay({ lastEvent, status }) {
  if (!lastEvent) return null;

  const formatter = EXPLANATION_MAP[lastEvent.kind];
  if (!formatter) return null;

  const { headline, body, detail } = formatter(lastEvent);

  return (
    <div className="explanation-container" style={{ minHeight: '120px' }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={lastEvent.step ?? lastEvent.epoch ?? lastEvent.kind}
          className="explanation-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="explanation-header">
            <div className="explanation-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>{headline}</span>
          </div>

          <div className="divider" style={{ margin: '8px 0' }} />

          <p className="text-xs" style={{ color: 'var(--primary)', lineHeight: 1.6, marginBottom: 8 }}>
            {body}
          </p>

          <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
            {detail}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
