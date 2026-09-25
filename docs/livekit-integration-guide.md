---
title: Ojin virtual avatar integration guide
description: How to use the Ojin virtual avatar plugin for LiveKit Agents.
---

# Ojin virtual avatar integration guide

## Overview

[Ojin](https://ojin.ai) provides real-time photorealistic avatars for
conversational video AI agents. Feed it your agent's speech and it streams back
a lip-synced, expressive avatar rendered into the LiveKit room, with sub-200ms
model latency at up to 720p and 25fps.

Personas are created from a single reference image with no training step, so a
new face is ready the moment you upload it, and the models render stylized
characters as readily as photoreal humans.

Use the open source Ojin integration for LiveKit Agents to add an avatar to
your voice AI agent.

## Installation

Available in Python.

```shell
uv add "livekit-agents[ojin]~=1.8"
```

## Authentication

The Ojin plugin requires an [Ojin API key](https://ojin.ai) and a persona
config ID. Create both in the Ojin dashboard, or through the Ojin API.

Set the following in your `.env` file:

```shell
OJIN_API_KEY=<your-ojin-api-key>
OJIN_CONFIG_ID=<your-persona-config-id>
```

## Usage

Create an `AvatarSession` and start it before your `AgentSession`. Starting the
avatar installs the session's audio output, so the order matters.

```python
from livekit import agents
from livekit.agents import AgentServer, AgentSession
from livekit.plugins import ojin

server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: agents.JobContext):
    session = AgentSession(
        # ... stt, llm, tts, etc.
    )

    # OJIN_API_KEY and OJIN_CONFIG_ID are read from the environment.
    avatar = ojin.AvatarSession()

    # Start the avatar and wait for it to publish its tracks.
    await avatar.start(session, room=ctx.room)

    # Start your agent session with the user.
    await session.start(
        # ... room, agent, room_options, etc.
    )
```

## How the avatar joins the room

The Ojin plugin renders the avatar inside your agent process. Its audio and
video are published as tracks on **your agent's own participant**, not under a
separate avatar identity.

This differs from hosted avatar integrations, which join the room as their own
participant. A frontend that looks for a second participant to render the
avatar will not find one — subscribe to the agent participant's video track
instead.

## Choosing a model

Ojin offers two avatar models. The model is a property of the persona, not of
the plugin: choose it when you create the persona, then point `OJIN_CONFIG_ID`
at that persona. `AvatarSession` drives whichever model the config ID resolves
to.

| Model | Best for | Characteristics |
| --- | --- | --- |
| **Portrait** | High-volume and latency-sensitive agents — receptionists, support, tutoring | The fastest and most scalable model. Head-and-shoulders framing, sub-200ms model latency, one-shot personas from a single image. |
| **Presence** | Showcase and brand experiences where visual quality leads | Ojin's highest-quality model. Full-body presence and richer motion, at a higher compute cost per minute. |

## Tuning frame rate and interrupt behavior

Pass an `STVConfig` to change the frame rate, the interrupt fade, or how much
video the client buffers. The published video track's frame rate follows
`fps`.

```python
from ojin.stv import STVConfig
from livekit.plugins import ojin

avatar = ojin.AvatarSession(
    stv_config=STVConfig(
        fps=25,                     # frame rate of the published video track
        interrupt_audio_fade_s=0.75,  # fade applied when the user barges in
        initial_buffer_frames=6,      # frames buffered before playout starts
    ),
)
```

See the Ojin SDK for the full set of `STVConfig` fields.

### Interruptions

When the user barges in, the plugin cancels the pending turn and the server
fades the avatar's audio out so its mouth closes naturally. One case cannot be
cancelled: a barge-in that lands before the avatar has begun speaking has
nothing to cancel yet, so that reply plays through. It is logged once per
session.

## Failure behavior

If the Ojin session fails mid-conversation, the avatar is torn down and the
agent keeps running rather than hanging. Because the avatar carried the audio
track, the agent continues **silently** — plan for this in your frontend if a
silent agent is worse for your users than a visibly ended session.

The avatar does not reconnect after a terminal failure.

## Parameters

This section describes some of the available parameters. See the
[plugin reference](/reference/python/livekit/plugins/ojin/index.html#livekit.plugins.ojin.AvatarSession)
for a complete list.

- **`api_key`** _(string)_ (required) - Environment: `OJIN_API_KEY` -
  Your Ojin API key. Raises if given neither as an argument nor in the
  environment.

- **`config_id`** _(string)_ (required) - Environment: `OJIN_CONFIG_ID` -
  The persona the avatar renders. Raises if given neither as an argument nor in
  the environment.

- **`ws_url`** _(string)_ (optional) - Environment: `OJIN_WS_URL` -
  The Ojin realtime endpoint. Falls back to the SDK's own default.

- **`stv_config`** _(ojin.stv.STVConfig)_ (optional) -
  Frame rate, interrupt fade and buffering. The video track's frame rate
  follows this.

- **`audio_sample_rate`** _(int)_ (optional) - Default: `24000` -
  The rate the agent's speech is resampled to before being sent, and the rate
  the avatar's audio track runs at.

- **`session_ready_timeout`** _(float)_ (optional) - Default: `30.0` -
  Seconds to wait for the Ojin session to become ready.

- **`first_frame_timeout`** _(float)_ (optional) - Default: `15.0` -
  Seconds to wait for the first video frame, counted after the session is
  ready.

- **`watchdog_timeout`** _(float)_ (optional) - Default: `15.0` -
  Seconds without a frame from the server before the session is treated as
  dead. Terminal — the avatar does not reconnect.

- **`turn_render_timeout`** _(float)_ (optional) - Default: `10.0` -
  Seconds a turn may go unrendered before its segment is closed so the
  conversation can continue.

## Additional resources

- **[Python package](https://pypi.org/project/livekit-plugins-ojin/)** —
  The `livekit-plugins-ojin` package on PyPI.

- **[GitHub repo](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-ojin)** —
  View the source or contribute to the Ojin plugin.

- **[Ojin docs](https://docs.ojin.ai)** —
  Ojin's own platform documentation.

- **[Example agent](https://github.com/ojinai/livekit-demo)** —
  A complete LiveKit agent with an Ojin avatar frontend.
