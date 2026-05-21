"use client";

import Session from "@/components/session";
import { useState } from "react";

interface ConnectionDetails {
	token: string;
	url: string;
}

export default function Home() {
	const [connection, setConnection] = useState<ConnectionDetails | null>(null);
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleConnect() {
		setConnecting(true);
		setError(null);

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		try {
			const res = await fetch("/api/token", { method: "POST", signal: controller.signal });
			if (!res.ok) {
				const text = await res.text();
				let message = `Server error (${res.status})`;
				try {
					message = JSON.parse(text).error || message;
				} catch {
					// response wasn't JSON
				}
				throw new Error(message);
			}
			const details: ConnectionDetails = await res.json();
			setConnection(details);
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") {
				setError("Connection timed out. Please try again.");
			} else {
				setError(err instanceof Error ? err.message : "Connection failed");
			}
		} finally {
			clearTimeout(timeout);
			setConnecting(false);
		}
	}

	function handleDisconnected() {
		setConnection(null);
	}

	if (connection) {
		return (
			<Session token={connection.token} url={connection.url} onDisconnected={handleDisconnected} />
		);
	}

	return (
		<main className="grid min-h-dvh grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] justify-items-center px-6 py-8">
			<div className="flex max-w-md flex-col items-center gap-3 self-end pb-8">
				<h1 className="text-3xl font-semibold tracking-tight">Ojin Demo</h1>
				<p className="text-center text-text-secondary">
					Start a conversation with an interactive avatar powered by Ojin, the real-time AI
					platform.
				</p>
			</div>

			<div className="relative">
				{!connecting && <div className="absolute inset-0 rounded-full bg-accent/30 pulse-ring" />}
				<button
					type="button"
					onClick={handleConnect}
					disabled={connecting}
					className="relative z-10 px-8 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{connecting ? "Connecting..." : "Start Session"}
				</button>
			</div>

			{error && <p className="pt-8 text-sm text-danger">{error}</p>}
		</main>
	);
}
