import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "@/lib/socket-context";

export const metadata: Metadata = {
  title: "Lauchgruen",
  description: "Echtzeit-Gameshow im Jeopardy-Stil für mehrere Streamer",
  icons: { icon: "/bear-logo.png", apple: "/bear-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="h-full">
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
