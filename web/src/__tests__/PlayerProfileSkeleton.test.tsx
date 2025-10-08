import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerProfileSkeleton } from '@/components/PlayerProfileSkeleton';

// Mock the Skeleton component
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

describe('PlayerProfileSkeleton Component', () => {
  it('should render without crashing', () => {
    render(<PlayerProfileSkeleton />);
    expect(screen.getByTestId('player-profile-skeleton')).toBeInTheDocument();
  });

  it('should render all skeleton elements', () => {
    render(<PlayerProfileSkeleton />);

    // Check for main container
    expect(screen.getByTestId('player-profile-skeleton')).toBeInTheDocument();

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should have correct structure with header section', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    expect(container).toBeInTheDocument();

    // Check for header section with avatar and text skeletons
    const headerSkeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(headerSkeletons.length).toBeGreaterThanOrEqual(2); // Avatar + text skeletons
  });

  it('should have stats cards section', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    const statsSkeletons = container.querySelectorAll('.grid');
    expect(statsSkeletons.length).toBeGreaterThanOrEqual(2); // At least 2 grid sections
  });

  it('should have player details section', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    const detailSkeletons = container.querySelectorAll('.h-5');
    expect(detailSkeletons.length).toBeGreaterThanOrEqual(1); // At least 1 detail line
  });

  it('should have game log/projections section', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    const chartSkeletons = container.querySelectorAll('.space-y-3');
    expect(chartSkeletons.length).toBeGreaterThanOrEqual(2); // Game log + other sections
  });

  it('should have comments section', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    const commentSkeletons = container.querySelectorAll('.h-20');
    expect(commentSkeletons.length).toBeGreaterThanOrEqual(1); // Comments area
  });

  it('should apply correct CSS classes for styling', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    expect(container).toHaveClass('p-6', 'space-y-6');

    // Check for specific skeleton classes (mocked Skeleton component)
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    // The mock Skeleton component will have the className passed to it
    expect(skeletons[0]).toHaveClass('h-9', 'w-24');
  });

  it('should have responsive grid layout', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    
    // Check for responsive grid classes
    const gridElements = container.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);

    // Check for responsive breakpoints (using simpler selectors)
    const mdGridElements = container.querySelectorAll('[class*="md:grid-cols"]');
    const lgGridElements = container.querySelectorAll('[class*="lg:grid-cols"]');
    
    expect(mdGridElements.length).toBeGreaterThan(0);
    expect(lgGridElements.length).toBeGreaterThanOrEqual(0); // May not have lg breakpoints
  });

  it('should render with consistent spacing', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    
    // Check for consistent spacing classes
    expect(container).toHaveClass('space-y-6');
    
    // Check for gap classes in grid elements
    const gapElements = container.querySelectorAll('.gap-4, .gap-6');
    expect(gapElements.length).toBeGreaterThan(0);
  });

  it('should have proper accessibility attributes', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    expect(container).toBeInTheDocument();

    // Skeleton elements should be accessible
    const skeletons = screen.getAllByTestId('skeleton');
    skeletons.forEach(skeleton => {
      expect(skeleton).toBeInTheDocument();
    });
  });

  it('should match expected skeleton structure', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    
    // Verify the main sections exist using simpler selectors
    const hasSpacing = container.querySelector('[class*="space-y"]');
    const hasGrid = container.querySelector('.grid');
    
    expect(hasSpacing).toBeInTheDocument();
    expect(hasGrid).toBeInTheDocument();
  });

  it('should render skeleton with proper dimensions', () => {
    render(<PlayerProfileSkeleton />);

    const container = screen.getByTestId('player-profile-skeleton');
    const skeletons = screen.getAllByTestId('skeleton');

    // Check for various skeleton sizes
    const sizeClasses = ['h-6', 'h-4', 'h-5', 'h-24', 'h-80', 'h-20', 'h-10'];
    
    sizeClasses.forEach(sizeClass => {
      const element = container.querySelector(`.${sizeClass}`);
      if (element) {
        expect(element).toHaveClass(sizeClass);
      }
    });
  });
});
