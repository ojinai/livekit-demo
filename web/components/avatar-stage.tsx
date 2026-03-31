"use client";

import { VideoTrack, useTracks } from "@livekit/components-react";
import { ParticipantKind, Track } from "livekit-client";

function AudioVisualizer() {
	return (
		<div className="flex items-center justify-center gap-1 h-16">
			{[28, 45, 32, 52, 38].map((h, i) => (
				<div
					key={h}
					className="w-1 bg-accent rounded-full animate-pulse"
					style={{
						height: `${h}px`,
						animationDelay: `${i * 0.15}s`,
						animationDuration: "0.8s",
					}}
				/>
			))}
		</div>
	);
}

interface AvatarStageProps {
	timedOut: boolean;
	onDisconnect: () => void;
}

export default function AvatarStage({ timedOut, onDisconnect }: AvatarStageProps) {
	const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], {
		onlySubscribed: true,
	});

	const agentVideoTrack = tracks.find((t) => t.participant.kind === ParticipantKind.AGENT);

	if (!agentVideoTrack) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 text-text-secondary">
				{timedOut ? (
					<>
						<p className="text-danger">
							Agent did not join in time. It may have encountered an error.
						</p>
						<button
							type="button"
							onClick={onDisconnect}
							className="px-6 py-2 rounded-full text-sm bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors ring-1 ring-border cursor-pointer"
						>
							Go back
						</button>
					</>
				) : (
					<>
						<div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
						<p>Waiting for avatar to join...</p>
					</>
				)}
			</div>
		);
	}

	if (!agentVideoTrack.publication?.track) {
		return (
			<div className="flex flex-col items-center justify-center gap-6">
				<AudioVisualizer />
				<p className="text-text-secondary text-sm">Agent connected (audio only)</p>
			</div>
		);
	}

	return (
		<div className="w-[240px] h-[320px] rounded-xl overflow-hidden shadow-2xl shadow-accent/10 ring-1 ring-border">
			<VideoTrack trackRef={agentVideoTrack} className="w-full h-full object-cover" />
		</div>
	);
}
