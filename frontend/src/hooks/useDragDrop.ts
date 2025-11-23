import { useState, useCallback, useRef } from 'react';
import { VFSNode } from '../types/vfs';

export interface DragItem {
  type: 'file' | 'files' | 'text' | 'url';
  data: VFSNode[] | File[] | string;
  source?: string;
}

export interface DropZone {
  id: string;
  element: HTMLElement;
  onDrop: (item: DragItem, event: DragEvent) => void;
  onDragOver?: (item: DragItem, event: DragEvent) => boolean;
  onDragEnter?: (item: DragItem, event: DragEvent) => void;
  onDragLeave?: (item: DragItem, event: DragEvent) => void;
  accepts?: string[];
}

export interface DragDropOptions {
  autoRegister?: boolean;
  previewContainer?: HTMLElement;
  showVisualFeedback?: boolean;
}

export const useDragDrop = (options: DragDropOptions = {}) => {
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [dropZones, setDropZones] = useState<Map<string, DropZone>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const draggedFilesRef = useRef<File[]>([]);

  // Initialize drag preview
  const createDragPreview = useCallback(() => {
    if (dragPreviewRef.current || !options.showVisualFeedback) return;

    const preview = document.createElement('div');
    preview.className = 'fixed pointer-events-none z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600 text-sm';
    preview.style.display = 'none';
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

    return () => {
      if (dragPreviewRef.current) {
        dragPreviewRef.current.remove();
        dragPreviewRef.current = null;
      }
    };
  }, [options.showVisualFeedback]);

  // Update drag preview position and content
  const updateDragPreview = useCallback((item: DragItem, x: number, y: number) => {
    if (!dragPreviewRef.current || !options.showVisualFeedback) return;

    dragPreviewRef.current.style.left = `${x + 10}px`;
    dragPreviewRef.current.style.top = `${y + 10}px`;
    dragPreviewRef.current.style.display = 'block';

    let content = '';
    switch (item.type) {
      case 'file':
        const files = item.data as VFSNode[];
        content = files.length === 1 ? files[0].name : `${files.length} files`;
        break;
      case 'files':
        const fileList = item.data as File[];
        content = fileList.length === 1 ? fileList[0].name : `${fileList.length} files`;
        break;
      case 'text':
        const text = item.data as string;
        content = text.length > 30 ? text.substring(0, 30) + '...' : text;
        break;
      case 'url':
        content = 'URL';
        break;
    }
    dragPreviewRef.current.textContent = content;
  }, [options.showVisualFeedback]);

  // Start drag operation
  const startDrag = useCallback((item: DragItem, event: DragEvent) => {
    setActiveDrag(item);
    setIsDragging(true);

    if (options.showVisualFeedback) {
      createDragPreview();
      updateDragPreview(item, event.clientX, event.clientY);
    }

    // Add visual feedback to document
    document.body.classList.add('dragging');
  }, [options.showVisualFeedback, createDragPreview, updateDragPreview]);

  // End drag operation
  const endDrag = useCallback(() => {
    setActiveDrag(null);
    setIsDragging(false);
    setDropTarget(null);

    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none';
    }

    document.body.classList.remove('dragging');
  }, []);

  // Handle mouse/touch movement
  const handleMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging || !activeDrag) return;

    const x = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const y = 'touches' in event ? event.touches[0].clientY : event.clientY;

    setDragPosition({ x, y });

    if (options.showVisualFeedback) {
      updateDragPreview(activeDrag, x, y);
    }

    // Check for drop zones under cursor
    const element = document.elementFromPoint(x, y);
    if (element) {
      let currentZone = null;
      let currentElement = element;

      // Traverse up the DOM tree to find drop zone
      while (currentElement && currentElement !== document.body) {
        for (const [id, zone] of dropZones.entries()) {
          if (zone.element === currentElement || zone.element.contains(currentElement)) {
            // Check if this drop zone accepts the drag item
            if (!zone.accepts || zone.accepts.includes(activeDrag.type)) {
              currentZone = id;
              break;
            }
          }
        }
        if (currentZone) break;
        currentElement = currentElement.parentElement;
      }

      setDropTarget(currentZone);
    } else {
      setDropTarget(null);
    }
  }, [isDragging, activeDrag, dropZones, options.showVisualFeedback, updateDragPreview]);

  // Register drop zone
  const registerDropZone = useCallback((zone: DropZone) => {
    setDropZones(prev => new Map(prev).set(zone.id, zone));

    // Add event listeners to the zone element
    const element = zone.element;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!activeDrag) return;

      if (zone.onDragOver) {
        const shouldAllow = zone.onDragOver(activeDrag, e);
        if (shouldAllow === false) return;
      }

      e.dataTransfer!.dropEffect = 'copy';
      element.classList.add('drop-target');
    };

    const handleDragLeave = (e: DragEvent) => {
      element.classList.remove('drop-target');
      if (zone.onDragLeave) {
        zone.onDragLeave(activeDrag!, e);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      element.classList.remove('drop-target');

      if (!activeDrag) return;

      // Create drag item from event
      let dragItem: DragItem;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        // Files from outside the app
        dragItem = {
          type: 'files',
          data: Array.from(e.dataTransfer.files),
          source: 'external'
        };
      } else if (e.dataTransfer?.types.includes('text/plain')) {
        const text = e.dataTransfer.getData('text/plain');
        // Check if it's a URL
        try {
          new URL(text);
          dragItem = {
            type: 'url',
            data: text,
            source: 'external'
          };
        } catch {
          dragItem = {
            type: 'text',
            data: text,
            source: 'external'
          };
        }
      } else if (activeDrag) {
        // Internal drag operation
        dragItem = activeDrag;
      } else {
        return;
      }

      zone.onDrop(dragItem, e);
      endDrag();
    };

    // Store event handlers for cleanup
    (element as any)._dragDropHandlers = {
      dragover: handleDragOver,
      dragleave: handleDragLeave,
      drop: handleDrop
    };

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => unregisterDropZone(zone.id);
  }, [activeDrag, endDrag]);

  // Unregister drop zone
  const unregisterDropZone = useCallback((zoneId: string) => {
    setDropZones(prev => {
      const zone = prev.get(zoneId);
      if (zone) {
        const handlers = (zone.element as any)._dragDropHandlers;
        if (handlers) {
          zone.element.removeEventListener('dragover', handlers.dragover);
          zone.element.removeEventListener('dragleave', handlers.dragleave);
          zone.element.removeEventListener('drop', handlers.drop);
          delete (zone.element as any)._dragDropHandlers;
        }
      }
      const newMap = new Map(prev);
      newMap.delete(zoneId);
      return newMap;
    });
  }, []);

  // Make element draggable
  const makeDraggable = useCallback((element: HTMLElement, item: DragItem) => {
    element.draggable = true;

    const handleDragStart = (e: DragEvent) => {
      e.dataTransfer!.effectAllowed = 'copy';

      // Store drag data
      if (item.type === 'file' && Array.isArray(item.data)) {
        // For VFS files, store path information
        const paths = (item.data as VFSNode[]).map(f => f.path).join('\n');
        e.dataTransfer!.setData('text/plain', paths);
      } else if (item.type === 'text') {
        e.dataTransfer!.setData('text/plain', item.data as string);
      }

      startDrag(item, e);
    };

    const handleDragEnd = () => {
      endDrag();
    };

    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);

    // Store handlers for cleanup
    (element as any)._draggableHandlers = {
      dragstart: handleDragStart,
      dragend: handleDragEnd
    };

    return () => {
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragend', handleDragEnd);
      delete (element as any)._draggableHandlers;
    };
  }, [startDrag, endDrag]);

  // Initialize global drag and drop
  useState(() => {
    createDragPreview();

    const handleGlobalMove = (e: Event) => handleMove(e as MouseEvent);
    const handleGlobalEnd = () => endDrag();
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault(); // Allow drop everywhere
    };

    // Add global event listeners
    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('touchmove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('dragover', handleGlobalDragOver);

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('dragover', handleGlobalDragOver);

      if (dragPreviewRef.current) {
        dragPreviewRef.current.remove();
        dragPreviewRef.current = null;
      }

      // Clean up all drop zones
      dropZones.forEach((zone) => {
        unregisterDropZone(zone.id);
      });
    };
  });

  return {
    // State
    activeDrag,
    isDragging,
    dragPosition,
    dropTarget,
    dropZones: Array.from(dropZones.values()),

    // Actions
    startDrag,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    makeDraggable,

    // Utilities
    createDragItem: (type: DragItem['type'], data: any, source?: string): DragItem => ({
      type,
      data,
      source
    })
  };
};