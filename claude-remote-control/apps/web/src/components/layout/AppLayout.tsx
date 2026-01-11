'use client';

/**
 * Main application layout with Linear-style sidebar
 */
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

// Get agent URL from localStorage
function getAgentUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('agentConnectionUrl') || 'http://localhost:4678';
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const agentUrl = getAgentUrl();

  const { projects } = useProjects({ agentUrl, pollInterval: 30000 });

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }

      // Cmd/Ctrl + N for new project
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewProjectModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback(() => {
    setShowCommandPalette(true);
  }, []);

  const handleNewProject = useCallback(() => {
    router.push('/projects?new=true');
  }, [router]);

  // On mobile, hide sidebar for terminal sessions
  const isTerminalView = pathname === '/' && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('session');

  // Don't render sidebar on mobile terminal view
  if (isMobile && isTerminalView) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar - hidden on mobile */}
      {!isMobile && (
        <AppSidebar
          projects={projects}
          onNewProject={handleNewProject}
          onSearch={handleSearch}
          className={cn(
            'shrink-0 transition-all duration-200',
            sidebarCollapsed && 'w-16'
          )}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        projects={projects}
      />
    </div>
  );
}
