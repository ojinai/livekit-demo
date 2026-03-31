import AvatarStage from "@/components/avatar-stage";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock LiveKit hooks
vi.mock("@livekit/components-react", () => ({
	useTracks: vi.fn().mockReturnValue([]),
	VideoTrack: vi.fn(() => <div data-testid="video-track" />),
}));

vi.mock("livekit-client", () => ({
	ParticipantKind: { AGENT: 4 },
	Track: { Source: { Camera: "camera" } },
}));

describe("AvatarStage", () => {
	it("shows waiting spinner when no agent is connected", () => {
		render(<AvatarStage timedOut={false} onDisconnect={vi.fn()} />);

		expect(screen.getByText("Waiting for avatar to join...")).toBeInTheDocument();
	});

	it("shows timeout message when agent does not join in time", () => {
		render(<AvatarStage timedOut={true} onDisconnect={vi.fn()} />);

		expect(
			screen.getByText("Agent did not join in time. It may have encountered an error."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
	});
});
