import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import noise_cancellation, elevenlabs, google, openai, ojin

load_dotenv()

logger = logging.getLogger("ojin-demo")

PIPELINE = os.environ.get("PIPELINE", "standard")

TURN_HANDLING = {
    "endpointing": {"min_delay": 0.5},
    "interruption": {
        "enabled": True,
        "min_duration": 0.3,
        "resume_false_interruption": False,
    },
}


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful assistant in a real-time voice conversation.
            Keep your responses short — two to three sentences at most unless the user asks for detail.
            Speak naturally and conversationally. No formatting, no emojis, no asterisks.
            You are curious, friendly, and have a sense of humor.""",
        )


def _tts():
    return elevenlabs.TTS(
        voice_id=os.environ.get("ELEVEN_VOICE_ID", "ys3XeJJA4ArWMhRpcX1D"),
        model=os.environ.get("ELEVEN_MODEL", "eleven_flash_v2_5"),
    )


def create_session() -> AgentSession:
    if PIPELINE == "gemini":
        return AgentSession(
            llm=google.realtime.RealtimeModel(),
            turn_handling=TURN_HANDLING,
        )

    if PIPELINE == "groq":
        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            raise ValueError("GROQ_API_KEY is required when PIPELINE=groq")
        return AgentSession(
            stt="deepgram/nova-2",
            llm=openai.LLM(
                model="llama-3.3-70b-versatile",
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key,
            ),
            tts=_tts(),
            turn_handling=TURN_HANDLING,
        )

    return AgentSession(
        stt="deepgram/nova-2",
        llm="openai/gpt-4o-mini",
        tts=_tts(),
        turn_handling=TURN_HANDLING,
    )


async def _publish_latency(room, data: str) -> None:
    try:
        await room.local_participant.publish_data(data.encode(), topic="latency")
    except Exception:
        logger.debug("Failed to publish latency data", exc_info=True)


server = AgentServer()


@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    session = create_session()

    avatar = ojin.AvatarSession()

    ctx.add_shutdown_callback(avatar.aclose)

    try:
        await asyncio.wait_for(avatar.start(session, room=ctx.room), timeout=30.0)
        await asyncio.wait_for(
            session.start(
                room=ctx.room,
                agent=Assistant(),
                room_options=room_io.RoomOptions(
                    audio_input=room_io.AudioInputOptions(
                        noise_cancellation=noise_cancellation.BVC()
                    ),
                ),
            ),
            timeout=30.0,
        )
    except Exception:
        await avatar.aclose()
        raise

    @session.on("conversation_item_added")
    def on_message(event):
        try:
            msg = event.item
            if msg.role == "assistant" and msg.metrics:
                m = msg.metrics
                data = json.dumps({
                    "llm_ttft": m.get("llm_node_ttft") if isinstance(m, dict) else getattr(m, "llm_node_ttft", None),
                    "tts_ttfb": m.get("tts_node_ttfb") if isinstance(m, dict) else getattr(m, "tts_node_ttfb", None),
                })
                ctx.room.loop.create_task(_publish_latency(ctx.room, data))
        except Exception:
            logger.debug("Failed to process metrics", exc_info=True)

    await session.generate_reply(instructions="Greet the user and offer your assistance.")


if __name__ == "__main__":
    agents.cli.run_app(server)
