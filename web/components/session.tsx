"use client";

import { LiveKitRoom, RoomAudioRenderer, useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import AvatarStage from "./avatar-stage";
import ControlBar from "./control-bar";
import LatencyDisplay from "./latency-display";

const AGENT_TIMEOUT_MS = 30_000;

interface SessionProps {
	token: string;
	url: string;
	onDisconnected: () => void;
}

function SessionInner({ onDisconnect }: { onDisconnect: () => void }) {
	const connectionState = useConnectionState();
	const [timedOut, setTimedOut] = useState(false);

	useEffect(() => {
		if (connectionState !== ConnectionState.Connected) return;

		const timer = setTimeout(() => setTimedOut(true), AGENT_TIMEOUT_MS);
		return () => clearTimeout(timer);
	}, [connectionState]);

	if (connectionState === ConnectionState.Connecting) {
		return (
			<div className="flex flex-col items-center justify-center h-screen gap-6">
				<div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
				<p className="text-text-secondary">Connecting to room...</p>
				<button
					type="button"
					onClick={onDisconnect}
					className="px-6 py-2 rounded-full text-sm bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors ring-1 ring-border cursor-pointer"
				>
					Cancel
				</button>
			</div>
		);
	}

	if (connectionState === ConnectionState.Disconnected) {
		return (
			<div className="flex flex-col items-center justify-center h-screen gap-6">
				<p className="text-danger">Disconnected from room</p>
				<button
					type="button"
					onClick={onDisconnect}
					className="px-6 py-2 rounded-full text-sm bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors ring-1 ring-border cursor-pointer"
				>
					Back
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center h-screen gap-8">
			<RoomAudioRenderer />
			<AvatarStage timedOut={timedOut} onDisconnect={onDisconnect} />
			<ControlBar onDisconnect={onDisconnect} />
			<LatencyDisplay />
		</div>
	);
}

export default function Session({ token, url, onDisconnected }: SessionProps) {
	const handleDisconnect = useCallback(() => {
		onDisconnected();
	}, [onDisconnected]);

	return (
		<LiveKitRoom
			token={token}
			serverUrl={url}
			connect={true}
			audio={true}
			video={false}
			onDisconnected={onDisconnected}
		>
			<SessionInner onDisconnect={handleDisconnect} />
		</LiveKitRoom>
	);
}
