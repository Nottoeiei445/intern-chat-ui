import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const ibmPlex = localFont({
  src: [
    {
      path: "./fonts/IBMPlexSansThai-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSansThai-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm",
});

const kanit = localFont({
  src: "./fonts/Kanit-Regular.ttf",
  variable: "--font-kanit",
});

const sarabun = localFont({
  src: "./fonts/Sarabun-Regular.ttf",
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Advanced GIS Analysis Interface powered by Ollama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlex.variable} ${kanit.variable} ${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-ibm bg-[#050505] text-slate-200">
        {children}
      </body>
    </html>
  );
}