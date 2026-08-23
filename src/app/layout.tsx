import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "@/lib/socket-context";

export const metadata: Metadata = {
  title: {
    default: "Allgemeinwissen Quiz | Lauchgruen",
    template: "%s | Lauchgruen Quiz",
  },
  description:
    "Die Lauchgruen Allgemeinwissen-Quizshow mit Kameras, Buzzer und Echtzeit-Spielbrett.",
  applicationName: "Lauchgruen Quiz",
  icons: {
    icon: [{ url: "/bear-logo.png", type: "image/png" }],
    shortcut: "/bear-logo.png",
    apple: "/bear-logo.png",
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
