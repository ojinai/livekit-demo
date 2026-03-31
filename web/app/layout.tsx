import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Ojin Demo",
	description:
		"Start a conversation with an interactive avatar powered by Ojin, the real-time AI platform",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="min-h-screen antialiased">{children}</body>
		</html>
	);
}
