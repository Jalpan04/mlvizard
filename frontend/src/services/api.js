const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const WS_BASE = BASE.replace(/^http/, 'ws');

import axios from 'axios';

const api = axios.create({ baseURL: BASE });

export const uploadCSV = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/upload', fd);
};

export const parsePseudo = (code) =>
  api.post('/parse', { code });

export const startTraining = (session_id, target_col, config, stream_every = 5, delay = 0.05) =>
  api.post('/train/start', { session_id, target_col, config, stream_every, delay });

export const pauseTraining = (session_id) =>
  api.post(`/train/pause?session_id=${session_id}`);

export const resumeTraining = (session_id) =>
  api.post(`/train/resume?session_id=${session_id}`);

export const stopTraining = (session_id) =>
  api.post(`/train/stop?session_id=${session_id}`);

export const updateTrainingSpeed = (session_id, delay, stream_every) =>
  api.post(`/train/update_speed?session_id=${session_id}&delay=${delay}&stream_every=${stream_every}`);

export const getModelDownloadUrl = (session_id) =>
  `${BASE}/train/save/${session_id}`;

export const makeWsUrl = (session_id) =>
  `${WS_BASE}/ws/${session_id}`;
