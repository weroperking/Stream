'use client';

import { usePathname } from 'next/navigation';
import { GlobalFooter } from '@/components/global-footer';

const NO_FOOTER_ROUTES = ['/landing', '/login', '/register'];

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show footer on landing, login, and register pages
  // Also check if pathname starts with onboarding routes
  const shouldHideFooter = NO_FOOTER_ROUTES.some(route => pathname === route) || 
    pathname.startsWith('/profiles') || 
    pathname.startsWith('/taste');
  
  return (
    <>
      {children}
      {!shouldHideFooter && <GlobalFooter />}
    </>
  );
}
