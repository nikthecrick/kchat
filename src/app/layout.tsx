import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KChat - End-to-End Encrypted Chat",
  description: "A production-ready, end-to-end encrypted chat application that leverages Passkeys for secure authentication and the Double Ratchet algorithm for message encryption.",
  keywords: ["Passkey", "WebAuthn", "Encryption", "Chat", "Double Ratchet", "E2E", "Security", "KChat"],
  authors: [{ name: "KChat Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "KChat - Encrypted Chat",
    description: "End-to-end encrypted chat with passkey authentication",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KChat - Encrypted Chat",
    description: "End-to-end encrypted chat with passkey authentication",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
            <Toaster />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
