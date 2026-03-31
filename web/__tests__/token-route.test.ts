import { describe, expect, it, vi } from "vitest";

vi.mock("livekit-server-sdk", () => {
	return {
		AccessToken: class MockAccessToken {
			addGrant = vi.fn();
			toJwt = vi.fn().mockResolvedValue("mock-jwt-token");
		},
	};
});

function mockRequest(ip = "127.0.0.1") {
	return {
		headers: new Headers({ "x-forwarded-for": ip }),
	} as unknown as import("next/server").NextRequest;
}

describe("POST /api/token", () => {
	it("returns token and url when credentials are configured", async () => {
		vi.stubEnv("LIVEKIT_API_KEY", "test-key");
		vi.stubEnv("LIVEKIT_API_SECRET", "test-secret");
		vi.stubEnv("LIVEKIT_URL", "wss://test.livekit.cloud");

		vi.resetModules();

		const { POST } = await import("@/app/api/token/route");
		const response = await POST(mockRequest());
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.token).toBe("mock-jwt-token");
		expect(data.url).toBe("wss://test.livekit.cloud");

		vi.unstubAllEnvs();
	});

	it("returns 500 with generic message when credentials are missing", async () => {
		vi.stubEnv("LIVEKIT_API_KEY", "");
		vi.stubEnv("LIVEKIT_API_SECRET", "");
		vi.stubEnv("LIVEKIT_URL", "");

		vi.resetModules();

		const { POST } = await import("@/app/api/token/route");
		const response = await POST(mockRequest());
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe("Server configuration error");
		expect(data).not.toHaveProperty("missing");

		vi.unstubAllEnvs();
	});
});
