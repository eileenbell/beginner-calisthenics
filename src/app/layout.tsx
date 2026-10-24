import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "FORM", template: "%s · FORM" },
  description: "Beginner bodyweight strength training: guided workouts and clear progressions, from your first push-up.",
  applicationName: "FORM",
  appleWebApp: { capable: true, title: "FORM", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d0e11",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${spaceGrotesk.variable} ${plusJakarta.variable} h-full`}>
      <body className="min-h-full bg-background-primary font-sans text-text-primary">{children}</body>
    </html>
  );
}
