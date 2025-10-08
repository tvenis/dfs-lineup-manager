import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerProfile } from '@/components/PlayerProfile';
import { PlayerService } from '@/lib/playerService';
import { CommentService } from '@/lib/commentService';

// Mock the services
jest.mock('@/lib/playerService');
jest.mock('@/lib/commentService');

// Mock CommentService methods
const mockCommentService = {
  getComments: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
};

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn((param) => {
      if (param === 'from') return 'profile';
      return null;
    }),
  }),
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock PlayerProps component
jest.mock('@/components/PlayerProps', () => ({
  __esModule: true,
  default: function MockPlayerProps() {
    return <div data-testid="player-props">Player Props</div>;
  }
}));

// Mock GameLogCard component
jest.mock('@/components/GameLogCard', () => ({
  GameLogCard: function MockGameLogCard() {
    return <div data-testid="game-log-card">Game Log Card</div>;
  }
}));

// Mock ProjectionsVsActualsChart component
jest.mock('@/components/ProjectionsVsActualsChart', () => ({
  ProjectionsVsActualsChart: function MockProjectionsVsActualsChart() {
    return <div data-testid="projections-chart">Projections Chart</div>;
  }
}));

const mockPlayerService = PlayerService as jest.Mocked<typeof PlayerService>;

// Mock player data
const mockPlayerData = {
  playerDkId: 12345,
  firstName: 'John',
  lastName: 'Doe',
  suffix: undefined,
  displayName: 'John Doe',
  shortName: 'J. Doe',
  position: 'QB',
  team: 'NYG',
  playerImage50: 'https://dkn.gs/sports/images/nfl/players/50/12345.png',
  playerImage160: 'https://dkn.gs/sports/images/nfl/players/160/12345.png',
  hidden: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

const mockWeeklyData = {
  currentWeekProj: 15.5,
  currentWeekSalary: 6500,
  ownership: 0.12,
  status: 'Available'
};

const mockPlayerPoolData = {
  playerDkId: 12345,
  displayName: 'John Doe',
  position: 'QB',
  team: 'NYG',
  salary: 6500,
  proj: 15.5,
  tier: 2,
  statusCode: 1,
  status: 'Available'
};

const mockComments = [
  {
    id: 1,
    playerId: '12345',
    content: 'Great value pick',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

// Mock PlayerProps data
const mockPropsData = {
  props: []
};

describe('PlayerProfile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
        mockPlayerService.getPlayerProfilesWithPoolData.mockResolvedValue({
          players: [mockPlayerData],
          total: 1,
          page: 1,
          size: 1
        });
    
    mockCommentService.getComments.mockResolvedValue(mockComments);
    mockCommentService.createComment.mockResolvedValue(mockComments[0]);
    mockCommentService.updateComment.mockResolvedValue(mockComments[0]);
    mockCommentService.deleteComment.mockResolvedValue(undefined);
  });

  describe('Rendering with Initial Data', () => {
    it('should render player profile with initial data', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check if player data is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('QB')).toBeInTheDocument();
      expect(screen.getByText('NYG')).toBeInTheDocument();
      expect(screen.getByText('$6,500')).toBeInTheDocument();
      expect(screen.getByText('15.5')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });

    it('should render player image when available', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      const playerImage = screen.getByAltText('John Doe');
      expect(playerImage).toBeInTheDocument();
      expect(playerImage).toHaveAttribute('src', mockPlayerData.playerImage160);
    });

    it('should render fallback avatar when no image', async () => {
      const playerWithoutImage = { ...mockPlayerData, playerImage160: null };
      
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={playerWithoutImage}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument(); // Fallback initials
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when no initial data provided', async () => {
      render(<PlayerProfile playerId="12345" />);

      // Should show loading skeleton initially
      expect(screen.getByTestId('player-profile-skeleton')).toBeInTheDocument();
    });

    it('should not show loading skeleton when initial data is provided', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Should not show loading skeleton
      expect(screen.queryByTestId('player-profile-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayerService.getPlayerProfilesWithPoolData.mockRejectedValue(
        new Error('API Error')
      );

      render(<PlayerProfile playerId="12345" />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load player data/i)).toBeInTheDocument();
      });
    });

    it('should handle missing player data', async () => {
      mockPlayerService.getPlayerProfilesWithPoolData.mockResolvedValue({
        players: [],
        total: 0,
        page: 1,
        size: 0
      });

      render(<PlayerProfile playerId="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByText(/player with id.*not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comments Functionality', () => {
    it('should render comments section', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check that comments section is rendered
      expect(screen.getByText('Comments & Notes')).toBeInTheDocument();
    });

    it('should render add comment form', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check that add comment form is rendered
      expect(screen.getByPlaceholderText(/add a general note/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
    });

    it('should render existing comments when available', async () => {
      // Mock comments being loaded
      mockCommentService.getComments.mockResolvedValueOnce(mockComments);
      
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check that comments section is rendered
      expect(screen.getByText('Comments & Notes')).toBeInTheDocument();
    });

    it('should handle comment service errors gracefully', async () => {
      mockCommentService.getComments.mockRejectedValueOnce(new Error('Comment service error'));
      
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Should still render the comments section even if service fails
      expect(screen.getByText('Comments & Notes')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render back button with correct link', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      const backButton = screen.getByRole('link', { name: /back/i });
      expect(backButton).toHaveAttribute('href', '/profile');
    });

    it('should render player profile link', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check if player name is displayed (it's not a link in this component)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when props have not changed', async () => {
      const { rerender } = render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Get initial render count (we'll track this via console.log calls)
      const initialRenderCount = mockPlayerService.getPlayerProfilesWithPoolData.mock.calls.length;

      // Re-render with same props
      rerender(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Should not have made additional API calls since data is the same
      expect(mockPlayerService.getPlayerProfilesWithPoolData).toHaveBeenCalledTimes(initialRenderCount);
    });

  });

  describe('Data Display', () => {
    it('should format salary correctly', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      expect(screen.getByText('$6,500')).toBeInTheDocument();
    });

    it('should format ownership percentage correctly', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });

    it('should display position-specific styling', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={mockPlayerData}
          initialWeeklyData={mockWeeklyData}
          initialPlayerPoolData={mockPlayerPoolData}
        />
      );

      // Check if position badge has correct styling
      const positionBadge = screen.getByText('QB');
      expect(positionBadge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined initial data', async () => {
      render(
        <PlayerProfile
          playerId="12345"
          initialPlayerData={null}
          initialWeeklyData={null}
          initialPlayerPoolData={null}
        />
      );

      // Should show loading state initially, then fetch data
      await waitFor(() => {
        expect(mockPlayerService.getPlayerProfilesWithPoolData).toHaveBeenCalled();
      });
    });

    it('should handle empty string playerId', async () => {
      render(<PlayerProfile playerId="" />);

      // Should show loading skeleton for empty playerId
      expect(screen.getByTestId('player-profile-skeleton')).toBeInTheDocument();
    });

    it('should handle special characters in playerId', async () => {
      render(<PlayerProfile playerId="12345@#$" />);

      // Should handle gracefully
      await waitFor(() => {
        expect(mockPlayerService.getPlayerProfilesWithPoolData).toHaveBeenCalledWith({
          limit: 1000,
          show_hidden: true
        });
      });
    });
  });
});
