import Script from 'next/script';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.min.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
