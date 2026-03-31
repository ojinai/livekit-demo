import { AccessToken } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
	if (timestamps.length === 0) {
		hits.delete(ip);
	}
	timestamps.push(now);
	hits.set(ip, timestamps);
	return timestamps.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

	if (isRateLimited(ip)) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const apiKey = process.env.LIVEKIT_API_KEY;
	const apiSecret = process.env.LIVEKIT_API_SECRET;
	const livekitUrl = process.env.LIVEKIT_URL;

	if (!apiKey || !apiSecret || !livekitUrl) {
		console.error("Missing LiveKit credentials:", {
			apiKey: !!apiKey,
			apiSecret: !!apiSecret,
			url: !!livekitUrl,
		});
		return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
	}

	try {
		const roomName = `demo-${crypto.randomUUID().slice(0, 12)}`;
		const participantName = `user-${crypto.randomUUID().slice(0, 8)}`;

		const token = new AccessToken(apiKey, apiSecret, {
			identity: participantName,
			name: participantName,
			ttl: "10m",
		});

		token.addGrant({
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canPublishData: false,
			canSubscribe: true,
		});

		const jwt = await token.toJwt();

		return NextResponse.json({
			token: jwt,
			url: livekitUrl,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Token generation failed:", message);
		return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
	}
}
