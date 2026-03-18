export const metadata = {
  title: 'QuickWerk Admin',
  description: 'Admin and operations interface for QuickWerk.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}