import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Seven Prospect", description: "Operação comercial segura da Seven Marketing" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
