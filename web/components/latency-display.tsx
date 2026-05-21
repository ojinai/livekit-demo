"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallback, useState } from "react";

interface PipelineMetrics {
	turnId: string | null;
	stt: number | null;
	llm: number | null;
	tts: number | null;
	video: number | null;
	total: number | null;
}

interface TranscriptEntry {
	id: string;
	role: "user" | "assistant";
	text: string;
}

interface SessionState {
	agent: string | null;
	user: string | null;
}

type MetricKey = Exclude<keyof PipelineMetrics, "turnId">;

function formatMs(seconds: number | null): string {
	if (seconds === null) return "—";
	return `${Math.round(seconds * 1000)}ms`;
}

const LATENCY_STAGES: Array<{ key: MetricKey; label: string }> = [
	{ key: "stt", label: "STT" },
	{ key: "llm", label: "LLM" },
	{ key: "tts", label: "TTS" },
	{ key: "video", label: "Video" },
	{ key: "total", label: "Total" },
];

export default function LatencyDisplay() {
	const emptyMetrics: PipelineMetrics = {
		turnId: null,
		stt: null,
		llm: null,
		tts: null,
		video: null,
		total: null,
	};
	const [metrics, setMetrics] = useState<PipelineMetrics>(emptyMetrics);
	const [latencyRows, setLatencyRows] = useState<PipelineMetrics[]>([]);
	const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
	const [state, setState] = useState<SessionState>({ agent: null, user: null });
	const [partialUserTranscript, setPartialUserTranscript] = useState<string | null>(null);

	const onMessage = useCallback((msg: { payload: Uint8Array }) => {
		try {
			const data = JSON.parse(new TextDecoder().decode(msg.payload));
			if (data.type === "transcript" && data.id && data.role && data.text) {
				if (data.role === "user" && data.final === false) {
					setPartialUserTranscript(data.text);
					return;
				}

				if (data.role === "user") {
					setPartialUserTranscript(null);
				}

				setTranscripts((current) => {
					const next = [
						...current.filter((entry) => entry.id !== data.id),
						{ id: data.id, role: data.role, text: data.text },
					];
					return next.slice(-8);
				});
				return;
			}

			if (data.type === "latency") {
				const nextMetrics = {
					turnId: data.turn_id ?? null,
					stt: data.stt ?? null,
					llm: data.llm ?? null,
					tts: data.tts ?? null,
					video: data.video ?? null,
					total: data.total ?? null,
				};
				setMetrics(nextMetrics);
				setLatencyRows((current) => {
					const turnId = nextMetrics.turnId ?? `turn-${Date.now()}`;
					const existing = current.find((row) => row.turnId === turnId);
					const merged = existing
						? ({
								turnId,
								stt: nextMetrics.stt ?? existing.stt,
								llm: nextMetrics.llm ?? existing.llm,
								tts: nextMetrics.tts ?? existing.tts,
								video: nextMetrics.video ?? existing.video,
								total: nextMetrics.total ?? existing.total,
							} satisfies PipelineMetrics)
						: ({ ...nextMetrics, turnId } satisfies PipelineMetrics);
					return [...current.filter((row) => row.turnId !== turnId), merged].slice(-4);
				});
			}

			if (data.type === "state") {
				setState((current) => ({
					agent: data.agent ?? current.agent,
					user: data.user ?? current.user,
				}));
			}
		} catch {
			// ignore malformed messages
		}
	}, []);

	useDataChannel("diagnostics", onMessage);

	const hasMetrics = Object.values(metrics).some((value) => value !== null);
	const visibleRows = latencyRows.length > 0 ? [...latencyRows].reverse() : [metrics];

	return (
		<div className="absolute right-4 top-4 flex max-h-[calc(100dvh-2rem)] w-[min(360px,calc(100vw-2rem))] flex-col gap-3 rounded-lg bg-surface-raised/90 p-4 text-xs text-text-secondary ring-1 ring-border backdrop-blur-xl">
			<div className="flex items-center justify-between gap-3">
				<span>Agent {state.agent ?? "starting"}</span>
				<span>User {state.user ?? "listening"}</span>
			</div>

			<div className="flex flex-col gap-1">
				{visibleRows.map((row) => (
					<div key={row.turnId ?? "empty"} className="grid grid-cols-5 gap-2">
						{LATENCY_STAGES.map((stage) => {
							const isTotal = stage.key === "total";
							return (
								<div
									key={stage.key}
									className={`min-w-0 rounded-md bg-surface-hover px-2 py-2 ${
										isTotal ? "text-text-primary" : ""
									}`}
								>
									<div className="truncate text-[10px] uppercase">{stage.label}</div>
									<div className="truncate font-medium">{formatMs(row[stage.key])}</div>
								</div>
							);
						})}
					</div>
				))}
			</div>

			<div className="min-h-0 overflow-y-auto">
				{transcripts.length === 0 ? (
					<p className="py-2 text-text-secondary">
						{partialUserTranscript ??
							(hasMetrics ? "Waiting for transcript..." : "No transcript yet.")}
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{transcripts.map((entry) => (
							<div key={entry.id} className="rounded-md bg-surface-hover px-3 py-2">
								<div className="mb-1 text-[10px] uppercase text-text-secondary">
									{entry.role === "user" ? "You" : "Agent"}
								</div>
								<p className="text-text-primary">{entry.text}</p>
							</div>
						))}
						{partialUserTranscript && (
							<div className="rounded-md bg-surface-hover px-3 py-2 opacity-75">
								<div className="mb-1 text-[10px] uppercase text-text-secondary">You</div>
								<p className="text-text-primary">{partialUserTranscript}</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
