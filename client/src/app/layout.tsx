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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("2fly-theme");if(t==="light"||t==="dark"){document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.setAttribute("data-theme",t);}else{document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
        <PortalLayout>{children}</PortalLayout>
      </body>
    </html>
  );
}
