import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "AMDL - Apple Music Downloader",
  description: "一个美观的 Apple Music 下载工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
