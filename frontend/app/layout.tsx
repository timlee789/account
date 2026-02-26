import type { Metadata } from "next";
import "./globals.css"; // 이 줄이 디자인의 핵심입니다.

export const metadata: Metadata = {
  title: "Collegiate Grill ERP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* cursor-default를 넣어 동그라미 커서를 화살표로 강제 변경합니다. */}
      <body className="bg-gray-900 text-gray-100 antialiased cursor-default" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}