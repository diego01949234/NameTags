import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nametags | Networking, without the pressure",
  description:
    "An event copilot that helps you understand the room, share one QR, and follow through after the event."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
