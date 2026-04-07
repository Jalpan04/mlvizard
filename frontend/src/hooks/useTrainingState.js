import { useReducer, useCallback } from 'react';

const INITIAL = {
  // session
  sessionId: null,
  columns: [],
  rows: 0,
  preview: [],
  targetCol: '',
  // training meta
  status: 'idle',          // idle | running | paused | complete | error
  epoch: 0,
  totalEpochs: 0,
  step: 0,
  // live data
  loss: null,
  lossHistory: [],          // [{step, loss}]
  weights: [],             // [{name, values}]
  activations: [],         // [{layer, values}]
  // explanation
  lastEvent: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_UPLOAD':
      return {
        ...state,
        sessionId: action.session_id || action.sessionId,
        columns: action.columns,
        rows: action.rows,
        preview: action.preview,
      };
    case 'SET_TARGET':
      return { ...state, targetCol: action.col };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_TOTAL_EPOCHS':
      return { ...state, totalEpochs: action.epochs };
    case 'SNAPSHOT':
      return {
        ...state,
        epoch: action.epoch,
        step: action.step,
        loss: action.loss,
        weights: action.weights,
        activations: action.activations,
        lossHistory: [
          ...state.lossHistory,
          { step: action.step, loss: action.loss },
        ],
        lastEvent: {
          kind: 'snapshot',
          epoch: action.epoch,
          step: action.step,
          loss: action.loss,
        },
      };
    case 'EPOCH_END':
      return {
        ...state,
        epoch: action.epoch,
        totalEpochs: action.total_epochs,
        lastEvent: {
          kind: 'epoch_end',
          epoch: action.epoch,
          avg_loss: action.avg_loss,
        },
      };
    case 'TRAINING_COMPLETE':
      return {
        ...state,
        status: 'complete',
        lastEvent: { kind: 'complete', total_steps: action.total_steps },
      };
    case 'RESET':
      return {
        ...INITIAL,
        sessionId: state.sessionId,
        columns: state.columns,
        rows: state.rows,
        preview: state.preview,
        targetCol: state.targetCol,
      };
    default:
      return state;
  }
}

export function useTrainingState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'snapshot':
        dispatch({
          type: 'SNAPSHOT',
          epoch: msg.epoch,
          step: msg.step,
          loss: msg.loss,
          weights: msg.weights,
          activations: msg.activations,
        });
        break;
      case 'epoch_end':
        dispatch({
          type: 'EPOCH_END',
          epoch: msg.epoch,
          avg_loss: msg.avg_loss,
          total_epochs: msg.total_epochs,
        });
        break;
      case 'training_complete':
        dispatch({ type: 'TRAINING_COMPLETE', total_steps: msg.total_steps });
        break;
      case 'status':
        dispatch({ type: 'SET_STATUS', status: msg.status });
        break;
    }
  }, []);

  return { state, dispatch, handleWsMessage };
}
