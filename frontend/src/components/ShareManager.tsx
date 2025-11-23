import React from 'react';

interface ShareManagerProps {
  windowId: string;
}

export const ShareManager: React.FC<ShareManagerProps> = ({ windowId }) => {
  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Share Manager (Window ID: {windowId})</h2>
      <p>This is a placeholder for the Share Manager application.</p>
      <p>Here you will be able to manage NFS and SMB/Samba shares.</p>
      {/* TODO: Implement UI for NFS and SMB/Samba share management */}
    </div>
  );
};