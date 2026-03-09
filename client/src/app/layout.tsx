import type { Metadata } from "next";
import { PortalLayout } from "@/components/PortalLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "2Fly Marketing Command Center",
  description: "Centralized client visibility for 2Fly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PortalLayout>{children}</PortalLayout>
      </body>
    </html>
  );
}
