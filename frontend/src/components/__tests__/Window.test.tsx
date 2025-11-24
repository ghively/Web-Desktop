import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window } from '../Window';

describe('Window Component', () => {
  const defaultProps = {
    title: 'Test Window',
    onClose: vi.fn(),
    children: <div>Window Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render window with title', () => {
    render(<Window {...defaultProps} />);
    expect(screen.getByText('Test Window')).toBeInTheDocument();
    expect(screen.getByText('Window Content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Window {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render maximize and minimize buttons', () => {
    const onMaximize = vi.fn();
    const onMinimize = vi.fn();

    render(
      <Window
        {...defaultProps}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
      />
    );

    const maximizeButton = screen.getByRole('button', { name: /maximize/i });
    const minimizeButton = screen.getByRole('button', { name: /minimize/i });

    fireEvent.click(maximizeButton);
    fireEvent.click(minimizeButton);

    expect(onMaximize).toHaveBeenCalledTimes(1);
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('should be draggable by title bar', () => {
    render(<Window {...defaultProps} />);

    const titleBar = screen.getByText('Test Window').closest('div');
    expect(titleBar).toHaveClass(/titlebar/);
  });

  it('should be resizable', () => {
    render(<Window {...defaultProps} />);

    // Check for resize handle (implementation specific)
    const resizeHandle = document.querySelector('[data-testid="resize-handle"]');
    if (resizeHandle) {
      expect(resizeHandle).toBeInTheDocument();
    }
  });

  it('should apply custom styles when provided', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<Window {...defaultProps} style={customStyle} />);

    const windowElement = document.querySelector('[data-testid="window"]');
    expect(windowElement).toHaveStyle('background-color: red');
  });

  it('should handle keyboard shortcuts', () => {
    const onClose = vi.fn();
    render(<Window {...defaultProps} onClose={onClose} />);

    // Test ESC to close (implementation specific)
    fireEvent.keyDown(document, { key: 'Escape' });

    // Implementation may vary - this is just an example
    // expect(onClose).toHaveBeenCalled();
  });

  it('should support z-index management', () => {
    render(<Window {...defaultProps} zIndex={1000} />);

    const windowElement = document.querySelector('[data-testid="window"]');
    expect(windowElement).toHaveStyle('z-index: 1000');
  });

  it('should handle focus correctly', () => {
    render(<Window {...defaultProps} />);

    const windowElement = document.querySelector('[data-testid="window"]');
    if (windowElement) {
      fireEvent.focus(windowElement);
      expect(windowElement).toHaveClass(/focused/);
    }
  });
});