import React from 'react';

interface VNCClientProps {
  windowId: string;
}

export const VNCClient: React.FC<VNCClientProps> = ({ windowId }) => {
  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">VNC Client (Window ID: {windowId})</h2>
      <p>This is a placeholder for the VNC Client application.</p>
      <p>Here you will be able to start/stop VNC sessions and connect to them.</p>
      {/* TODO: Implement UI for VNC session management and connection */}
    </div>
  );
};