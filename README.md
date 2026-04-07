# MLVizard

MLVizard is an interactive, web-based platform designed for modern machine learning visualization and training. It combines a powerful PyTorch backend with a dynamic Three.js-powered 3D neural network visualizer.

## Core Features

- **Real-Time 3D Visualization**: Visualize activations and weight changes in real-time using a 3D interface built with Three.js.
- **Dynamic Training Control**: On-the-fly adjustment of training parameters, including a Turbo mode for rapid execution.
- **Explainable AI Integration**: Step-by-step progress tracking with loss history and gradient analytics.
- **Modern Tech Stack**: React-based frontend with Framer Motion animations and a FastAPI backend.

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the `backend` directory.
2. Create and activate a virtual environment.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   python main.py
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Technology Stack

- **Frontend**: React, Three.js, Framer Motion, D3.js.
- **Backend**: Python, PyTorch, FastAPI, Pandas, Scikit-learn.
