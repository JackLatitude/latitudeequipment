import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latitude Equipment",
  description: "Equipment tracker for Latitude Equipment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
