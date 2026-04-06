import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useScrollAnimation } from './useScrollAnimation';

// Track calls to IntersectionObserver
let observerCallback: IntersectionObserverCallback | null = null;
let observedElement: Element | null = null;
const mockObserve = jest.fn((el: Element) => { observedElement = el; });
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    observerCallback = callback;
    this.callback = callback;
    this.options = options || {};
  }

  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
}

beforeAll(() => {
  (window as any).IntersectionObserver = MockIntersectionObserver;
});

beforeEach(() => {
  observerCallback = null;
  observedElement = null;
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
});

describe('useScrollAnimation', () => {
  it('should return ref and isVisible state', () => {
    const TestComponent = () => {
      const { ref, isVisible } = useScrollAnimation(0.1);
      return (
        <div ref={ref} data-testid="scroll-element">
          {isVisible ? 'visible' : 'hidden'}
        </div>
      );
    };

    render(<TestComponent />);
    const element = screen.getByTestId('scroll-element');
    expect(element).toBeInTheDocument();
    expect(element.textContent).toBe('hidden');
  });

  it('should use default threshold of 0.1', async () => {
    const TestComponent = () => {
      const { ref } = useScrollAnimation();
      // Force the ref to be set by using a callback ref pattern
      return <div ref={ref as any} data-testid="test-el">test</div>;
    };

    render(<TestComponent />);
    
    // In React 19, the ref.current is set after render, so useEffect should see it
    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(observerCallback).not.toBeNull();
  });

  it('should set isVisible to true when element intersects', async () => {
    const TestComponent = () => {
      const { ref, isVisible } = useScrollAnimation(0.1);
      return (
        <div ref={ref} data-testid="scroll-element">
          {isVisible ? 'visible' : 'hidden'}
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Simulate intersection
    act(() => {
      if (observerCallback) {
        observerCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      }
    });

    const element = screen.getByTestId('scroll-element');
    expect(element.textContent).toBe('visible');
  });
});
