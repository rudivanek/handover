'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FileText } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/manuals');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <div className="flex items-center gap-2 text-primary animate-pulse">
        <FileText className="h-6 w-6" strokeWidth={1.5} />
        <span className="font-serif text-xl">Handover</span>
      </div>
    </div>
  );
}
