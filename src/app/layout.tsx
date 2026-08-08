import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "@/lib/socket-context";

export const metadata: Metadata = {
  title: {
    default: "Shinobi Quiz | Lauchgruen",
    template: "%s | Lauchgruen Shinobi Quiz",
  },
  description:
    "Die Lauchgruen Naruto-Quizshow mit Kameras, Buzzer und Echtzeit-Spielbrett.",
  applicationName: "Lauchgruen Shinobi Quiz",
  icons: {
    icon: [{ url: "/naruto/shinobi-crest.png", type: "image/png" }],
    shortcut: "/naruto/shinobi-crest.png",
    apple: "/naruto/shinobi-crest.png",
  },
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
