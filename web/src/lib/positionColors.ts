/**
 * Utility function to get consistent position badge colors across all pages
 * Based on the standard fantasy football position color scheme
 */
export const getPositionColor = (position: string): string => {
  // Handle numbered positions (RB1, RB2, WR1, WR2, WR3, etc.)
  const basePosition = position.replace(/\d+$/, ''); // Remove trailing numbers
  
  switch (basePosition) {
    case 'QB': 
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'RB': 
      return 'bg-green-100 text-green-800 border-green-200';
    case 'WR': 
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'TE': 
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'FLEX': 
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'DST': 
      return 'bg-red-100 text-red-800 border-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get position color classes for different badge variants
 */
export const getPositionBadgeClasses = (position: string, variant: 'default' | 'outline' = 'outline'): string => {
  const baseClasses = 'text-xs px-1.5 py-0.5 font-medium rounded inline-block';
  const positionClasses = getPositionColor(position);
  
  if (variant === 'outline') {
    // For outline variant, we want the background and text colors but no border
    return `${baseClasses} ${positionClasses} border-0`;
  }
  
  return `${baseClasses} ${positionClasses}`;
};
