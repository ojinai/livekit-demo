"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallback, useState } from "react";

interface PipelineMetrics {
	llmTtft: number | null;
	ttsTtfb: number | null;
}

function formatMs(seconds: number | null): string {
	if (seconds === null) return "—";
	return `${Math.round(seconds * 1000)}ms`;
}

export default function LatencyDisplay() {
	const [metrics, setMetrics] = useState<PipelineMetrics>({
		llmTtft: null,
		ttsTtfb: null,
	});

	const onMessage = useCallback((msg: { payload: Uint8Array }) => {
		try {
			const data = JSON.parse(new TextDecoder().decode(msg.payload));
			setMetrics({
				llmTtft: data.llm_ttft ?? null,
				ttsTtfb: data.tts_ttfb ?? null,
			});
		} catch {
			// ignore malformed messages
		}
	}, []);

	useDataChannel("latency", onMessage);

	const total =
		metrics.llmTtft !== null && metrics.ttsTtfb !== null ? metrics.llmTtft + metrics.ttsTtfb : null;

	if (total === null) return null;

	return (
		<div className="flex items-center gap-4 px-4 py-2 rounded-full bg-surface-raised/80 backdrop-blur-sm ring-1 ring-border text-xs text-text-secondary">
			<span>LLM {formatMs(metrics.llmTtft)}</span>
			<span className="text-border">|</span>
			<span>TTS {formatMs(metrics.ttsTtfb)}</span>
			<span className="text-border">|</span>
			<span className="text-text-primary font-medium">Total {formatMs(total)}</span>
		</div>
	);
}
