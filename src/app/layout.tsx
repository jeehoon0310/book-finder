import type { Metadata, Viewport } from 'next';
import Header from '@/components/layout/Header';
import '../globals.css';

export const metadata: Metadata = {
  title: '툰슐랭 만화카페',
  description: '만화카페 공간의 도서 위치를 쉽게 찾을 수 있는 검색 시스템입니다.',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Header />
        <main className="max-w-7xl mx-auto flex-1 w-full pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
