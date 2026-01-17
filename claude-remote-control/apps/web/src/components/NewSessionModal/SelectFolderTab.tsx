'use client';

import { ProjectDropdown } from './ProjectDropdown';

interface SelectFolderTabProps {
  folders: string[];
  selectedProject: string;
  onSelectProject: (project: string) => void;
  loadingFolders: boolean;
}

export function SelectFolderTab({
  folders,
  selectedProject,
  onSelectProject,
  loadingFolders,
}: SelectFolderTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-3 block text-sm font-medium text-white/60">Select Project</label>
        <ProjectDropdown
          folders={folders}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          loading={loadingFolders}
        />
      </div>
    </div>
  );
}
