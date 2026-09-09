import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import noise_cancellation, elevenlabs, google, openai, ojin, silero

load_dotenv()

logger = logging.getLogger("ojin-demo")

PIPELINE = os.environ.get("PIPELINE", "standard")

TURN_HANDLING = {
    "endpointing": {"min_delay": 0.3, "max_delay": 1.5},
    "interruption": {
        "enabled": True,
        "mode": "vad",
        "min_duration": 0.15,
        "min_words": 0,
        "false_interruption_timeout": 0.8,
        "resume_false_interruption": False,
        "backchannel_boundary": None,
    },
}

AEC_WARMUP_DURATION = float(os.environ.get("AEC_WARMUP_DURATION", "0.5"))


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful assistant in a real-time voice conversation.
            Default to one short sentence, under 20 words, unless the user asks for detail.
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
            aec_warmup_duration=AEC_WARMUP_DURATION,
        )

    if PIPELINE == "groq":
        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            raise ValueError("GROQ_API_KEY is required when PIPELINE=groq")
        return AgentSession(
            stt="deepgram/nova-2",
            vad=silero.VAD.load(),
            llm=openai.LLM(
                model="llama-3.3-70b-versatile",
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key,
            ),
            tts=_tts(),
            turn_handling=TURN_HANDLING,
            aec_warmup_duration=AEC_WARMUP_DURATION,
        )

    return AgentSession(
        stt="deepgram/nova-2",
        vad=silero.VAD.load(),
        llm="openai/gpt-4o-mini",
        tts=_tts(),
        turn_handling=TURN_HANDLING,
        aec_warmup_duration=AEC_WARMUP_DURATION,
    )


def _metric(metrics, key: str):
    if not metrics:
        return None
    if isinstance(metrics, dict):
        return metrics.get(key)
    return getattr(metrics, key, None)


async def _publish_diagnostic(room, payload: dict) -> None:
    try:
        await room.local_participant.publish_data(
            json.dumps(payload).encode(),
            topic="diagnostics",
        )
    except Exception:
        logger.debug("Failed to publish diagnostic data", exc_info=True)


server = AgentServer()


# agent_name switches from auto-dispatch (joins every room in the project)
# to explicit dispatch
@server.rtc_session(agent_name="livekit-demo")
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

    last_user_metrics = None
    last_user_id = None

    @session.on("agent_state_changed")
    def on_agent_state(event):
        logger.info("agent_state %s -> %s", event.old_state, event.new_state)
        asyncio.create_task(
            _publish_diagnostic(
                ctx.room,
                {
                    "type": "state",
                    "agent": event.new_state,
                    "created_at": event.created_at,
                },
            )
        )

    @session.on("user_state_changed")
    def on_user_state(event):
        logger.info("user_state %s -> %s", event.old_state, event.new_state)
        asyncio.create_task(
            _publish_diagnostic(
                ctx.room,
                {
                    "type": "state",
                    "user": event.new_state,
                    "created_at": event.created_at,
                },
            )
        )

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        transcript = event.transcript.strip()
        if not transcript:
            return

        logger.info(
            "user_transcript final=%s speaker=%s text=%r",
            event.is_final,
            event.speaker_id,
            transcript,
        )
        asyncio.create_task(
            _publish_diagnostic(
                ctx.room,
                {
                    "type": "transcript",
                    "id": f"user-{event.speaker_id or 'local'}-{int(event.created_at * 1000)}",
                    "role": "user",
                    "text": transcript,
                    "final": event.is_final,
                    "created_at": event.created_at,
                },
            )
        )

    @session.on("conversation_item_added")
    def on_message(event):
        nonlocal last_user_metrics, last_user_id
        try:
            msg = event.item
            if getattr(msg, "type", None) != "message":
                return

            text = getattr(msg, "text_content", None)
            logger.info(
                "conversation_item role=%s id=%s text=%r metrics=%s",
                msg.role,
                msg.id,
                text,
                msg.metrics,
            )

            if text and msg.role == "assistant":
                asyncio.create_task(
                    _publish_diagnostic(
                        ctx.room,
                        {
                            "type": "transcript",
                            "id": msg.id,
                            "role": msg.role,
                            "text": text,
                            "final": True,
                            "created_at": event.created_at,
                        },
                    )
                )

            if msg.role == "user":
                last_user_metrics = msg.metrics
                last_user_id = msg.id
                asyncio.create_task(
                    _publish_diagnostic(
                        ctx.room,
                        {
                            "type": "latency",
                            "turn_id": last_user_id,
                            "stt": _metric(last_user_metrics, "transcription_delay"),
                            "llm": None,
                            "tts": None,
                            "video": None,
                            "total": None,
                        },
                    )
                )
                return

            if msg.role == "assistant" and msg.metrics:
                e2e_latency = _metric(msg.metrics, "e2e_latency")
                avatar_playback_latency = _metric(msg.metrics, "playback_latency")

                asyncio.create_task(
                    _publish_diagnostic(
                        ctx.room,
                        {
                            "type": "latency",
                            "turn_id": last_user_id or msg.id,
                            "stt": _metric(last_user_metrics, "transcription_delay"),
                            "llm": _metric(msg.metrics, "llm_node_ttft"),
                            "tts": _metric(msg.metrics, "tts_node_ttfb"),
                            # Not browser video-frame arrival.
                            "video": None,
                            "total": e2e_latency,
                            "avatar_playback": avatar_playback_latency,
                        },
                    )
                )
        except Exception:
            logger.debug("Failed to process metrics", exc_info=True)

    await session.generate_reply(instructions="Greet the user and offer your assistance.")


if __name__ == "__main__":
    agents.cli.run_app(server)
