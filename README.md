# LiveKit Ojin Avatar Demo

A LiveKit agent with an Ojin avatar frontend for real-time interactive avatar sessions.

## Prerequisites

- Python 3.10–3.12
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) package manager
- API keys for: LiveKit, Ojin, ElevenLabs, OpenAI, Deepgram

## Setup

1. Install dependencies:

```bash
uv sync
cd web && pnpm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Create `web/.env.local` with your LiveKit credentials:

```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

## Running

Start both the agent and the frontend:

```bash
# Terminal 1: Start the agent
uv run python agent.py dev

# Terminal 2: Start the frontend
cd web && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Start Session** to begin a conversation with the avatar.
