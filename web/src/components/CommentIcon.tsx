import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface CommentIconProps {
  playerDkId: number;
  hasRecentComments: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CommentIcon({ playerDkId, hasRecentComments, size = 'sm' }: CommentIconProps) {
  if (!hasRecentComments) return null;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <Link 
      href={`/profile/${playerDkId}#comments`}
      className="inline-flex items-center justify-center ml-1 hover:opacity-80 transition-opacity"
      title="View recent comments"
    >
      <MessageSquare 
        className={`${sizeClasses[size]} text-red-500`}
        fill="currentColor"
      />
    </Link>
  );
}
