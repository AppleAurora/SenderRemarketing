import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SenderRemarketing · Campaign workspace",
  description: "A workspace to organize contacts, WhatsApp lines and remarketing campaigns.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
