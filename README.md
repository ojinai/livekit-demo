# LiveKit Ojin Avatar Demo

A LiveKit agent with an Ojin avatar frontend for real-time interactive avatar sessions.

## Run the demo with an AI coding agent

Copy this prompt into your coding agent for step-by-step setup:

```text
Help me run the Ojin LiveKit avatar demo: https://github.com/ojinai/livekit-demo. Use this repository if present; otherwise clone it. Read its README and credential checklist. Give me exactly one action per reply; wait for my confirmation and don't preview later steps. Check installed tools first. If uv is missing, follow https://docs.astral.sh/uv/getting-started/installation/. If Python 3.12 is missing, install it with `uv python install 3.12`. Check for pnpm; if missing, guide me through the simplest supported setup using https://pnpm.io/installation if needed. For each credential, link its official source and tell me which local env file to fill in. Never ask me to paste secrets or print their values. When setup is complete, start the agent and web app and give me the local URL. If anything fails, explain the issue and next action. Don't change source code without my approval.
```

## Prerequisites

- Python 3.10–3.12 (`uv` can install a compatible version for you)
- Node.js 18.18+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager
- [pnpm](https://pnpm.io/installation) package manager

## Credentials

The default agent pipeline uses the following credentials. Create `.env` from
`.env.example` for the agent, and put the three LiveKit values in
`web/.env.local` as well; the web app uses them to create session tokens.

| Environment variable | Used for | Where to get it |
| --- | --- | --- |
| `OJIN_API_KEY` | Connect to Ojin | [Ojin API key instructions](https://docs.ojin.ai/getting-started/authentication.md) |
| `OJIN_CONFIG_ID` | Select the avatar persona | Create a Presence or Portrait configuration in the [Ojin dashboard](https://ojin.ai/dashboard); see [Ojin's config ID guide](https://docs.ojin.ai/models/build-with-python-sdk.md#requirements) |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Connect the agent and web app to a LiveKit project | Create a project in [LiveKit Cloud](https://cloud.livekit.io/); see [LiveKit's quickstart](https://docs.livekit.io/agents/start/voice-ai/) |
| `DEEPGRAM_API_KEY` | Speech recognition (STT) | Create a key in the [Deepgram Console](https://console.deepgram.com/); see [Deepgram's key guide](https://developers.deepgram.com/docs/create-additional-api-keys) |
| `OPENAI_API_KEY` | Language model (LLM) | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ELEVEN_API_KEY` | Speech synthesis (TTS) | [ElevenLabs API keys](https://elevenlabs.io/app/developers/api-keys) |

The env examples also include optional settings such as `OJIN_WS_URL`,
`ELEVEN_VOICE_ID`, and keys for alternate pipelines. The default pipeline does
not need those optional values.

## Setup

1. Install dependencies:

```bash
# Install Python 3.12 if no compatible version is available
uv python install 3.12

# Install the agent dependencies
uv sync
```

```bash
cd web && pnpm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Create `web/.env.local` with the same three LiveKit values from `.env`:

```env
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

The frontend defaults to port 3333. Override it with
`PORT=4444 pnpm dev` if needed.

Open [http://localhost:3333](http://localhost:3333) and click **Start Session** to begin a conversation with the avatar.
