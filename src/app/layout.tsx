import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SenderRemarketing · Campaign workspace",
  description: "Organizá tus contactos, líneas y campañas desde un espacio privado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
