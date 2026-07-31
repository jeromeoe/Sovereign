import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/manrope";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Sovereign — Study with intent",
    description:
      "A focused AI tutoring workspace that remembers your learning, not your transcript.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Sovereign — Study with intent",
      description:
        "A focused AI tutoring workspace that remembers your learning, not your transcript.",
      images: [{ url: socialImage, width: 1680, height: 909 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Sovereign — Study with intent",
      description:
        "A focused AI tutoring workspace that remembers your learning, not your transcript.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
