import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNavbar } from './MobileNavbar';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-[104px] md:pt-16 pb-16 md:pb-0">{children}</main>
      {showFooter && <Footer />}
      <MobileNavbar />
    </div>
  );
}
