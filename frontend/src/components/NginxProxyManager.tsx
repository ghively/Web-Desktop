import React from 'react';

interface NginxProxyManagerProps {
  windowId: string;
}

export const NginxProxyManager: React.FC<NginxProxyManagerProps> = ({ windowId }) => {
  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Nginx Proxy Manager (Window ID: {windowId})</h2>
      <p>This is a placeholder for the Nginx Proxy Manager application.</p>
      <p>Here you will be able to manage Nginx proxy hosts, SSL certificates, redirections, and streams.</p>
      {/* TODO: Implement UI for Nginx Proxy Manager features */}
    </div>
  );
};