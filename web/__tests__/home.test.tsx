import Home from "@/app/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Home page", () => {
	it("renders the connect screen with start button", () => {
		render(<Home />);

		expect(screen.getAllByText("Ojin Demo").length).toBeGreaterThan(0);
		expect(screen.getAllByRole("button", { name: "Start Session" }).length).toBeGreaterThan(0);
	});

	it("shows description text", () => {
		render(<Home />);

		expect(
			screen.getAllByText(/Start a conversation with an interactive avatar powered by Ojin/).length,
		).toBeGreaterThan(0);
	});
});
