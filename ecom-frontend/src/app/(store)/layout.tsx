'use client';

import { ThemeHostLayout } from '@/themes/ThemeHostLayout';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <ThemeHostLayout>{children}</ThemeHostLayout>;
}
