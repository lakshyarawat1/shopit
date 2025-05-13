import './global.css';
import Provider from './Provider';

export const metadata = {
  title: 'ShopIT Seller',
  description: 'Seller Dashboard for ShopIT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
