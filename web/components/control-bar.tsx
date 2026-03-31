"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { useCallback, useState } from "react";

function MicIcon({ muted }: { muted: boolean }) {
	if (muted) {
		return (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-label="Microphone muted"
			>
				<title>Microphone muted</title>
				<line x1="1" y1="1" x2="23" y2="23" />
				<path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
				<path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
				<line x1="12" y1="19" x2="12" y2="23" />
				<line x1="8" y1="23" x2="16" y2="23" />
			</svg>
		);
	}
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-label="Microphone"
		>
			<title>Microphone</title>
			<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
			<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
			<line x1="12" y1="19" x2="12" y2="23" />
			<line x1="8" y1="23" x2="16" y2="23" />
		</svg>
	);
}

function PhoneOffIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-label="End call"
		>
			<title>End call</title>
			<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
			<line x1="23" y1="1" x2="1" y2="23" />
		</svg>
	);
}

export default function ControlBar({ onDisconnect }: { onDisconnect: () => void }) {
	const { localParticipant } = useLocalParticipant();
	const [micMuted, setMicMuted] = useState(false);

	const toggleMic = useCallback(async () => {
		try {
			await localParticipant.setMicrophoneEnabled(micMuted);
			setMicMuted(!micMuted);
		} catch (err) {
			console.error("Failed to toggle microphone:", err);
		}
	}, [localParticipant, micMuted]);

	return (
		<div className="flex items-center gap-3 px-5 py-3 rounded-full bg-surface-raised backdrop-blur-xl ring-1 ring-border">
			<button
				type="button"
				onClick={toggleMic}
				className={`p-3 rounded-full transition-colors cursor-pointer ${
					micMuted
						? "bg-danger/20 text-danger hover:bg-danger/30"
						: "bg-surface-hover text-text-primary hover:bg-white/15"
				}`}
				title={micMuted ? "Unmute microphone" : "Mute microphone"}
			>
				<MicIcon muted={micMuted} />
			</button>

			<button
				type="button"
				onClick={onDisconnect}
				className="p-3 rounded-full bg-danger text-white hover:bg-danger/80 transition-colors cursor-pointer"
				title="End session"
			>
				<PhoneOffIcon />
			</button>
		</div>
	);
}
