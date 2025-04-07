import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitAI",
  description: "Stay on track with your fitness goals using tailored nutrition, powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <ReactQueryClientProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased `}
        >
          <Navbar/>
          <main className="max-w-7xl mx-auto pt-16 p-4 min-h-screen">
              {children}
          </main>
        </body>
      </html>
      </ReactQueryClientProvider>
    </ClerkProvider>
    
  );
}
