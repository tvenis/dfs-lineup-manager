import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { ArrowLeft, Loader2, Edit, Trash2, MessageSquare, Save, X } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { PlayerService } from "@/lib/playerService";
import { CommentService, Comment } from "@/lib/commentService";
import { Player } from "@/types/prd";
import { buildApiUrl, API_CONFIG } from "@/config/api";
import PlayerProps from "./PlayerProps";

interface PlayerProfileProps {
  playerId: string;
}

// Mock data for stats (keeping for now until we have real stats API)
const mockStats = {
  season: {
    games: 16,
    yards: 4250,
    touchdowns: 28,
    interceptions: 8,
    rating: 98.5
  },
  career: {
    games: 89,
    yards: 24500,
    touchdowns: 156,
    interceptions: 45,
    rating: 94.2
  }
};

export function PlayerProfile({ playerId }: PlayerProfileProps) {
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isHiding, setIsHiding] = useState(false);

  // Simple test to see if component is working
  console.log("PlayerProfile component rendered with playerId:", playerId);

  const loadComments = async (playerDkId: number) => {
    try {
      setCommentsLoading(true);
      
      // Test connection first
      const isConnected = await CommentService.testConnection();
      console.log("Backend connection test:", isConnected);
      
      if (!isConnected) {
        throw new Error("Cannot connect to backend server");
      }
      
      const commentsData = await CommentService.getPlayerComments(playerDkId);
      setComments(commentsData);
    } catch (err) {
      console.error("Error loading comments:", err);
      // Don't show error to user for comments, just log it
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get player from the profiles endpoint
        const response = await PlayerService.getPlayerProfiles({ limit: 1000 });
        const player = response.players?.find(p => 
          p.playerDkId.toString() === playerId
        );
        
        if (player) {
          setPlayerData(player);
          // Load comments for this player
          await loadComments(player.playerDkId);
        } else {
          setError("Player not found");
        }
      } catch (err) {
        setError("Failed to load player data");
        console.error("Error fetching player data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  // Comment handling functions
  const handleAddComment = async () => {
    if (newComment.trim() && playerData) {
      try {
        console.log("Attempting to create comment for player:", playerData.playerDkId);
        console.log("Comment content:", newComment);
        
        const newCommentData = await CommentService.createComment({
          content: newComment,
          playerDkId: playerData.playerDkId
        });
        
        console.log("Comment created successfully:", newCommentData);
        setComments([newCommentData, ...comments]);
        setNewComment('');
      } catch (err) {
        console.error("Error adding comment:", err);
        // You could add a toast notification here
      }
    }
  };

  const handleEditComment = (id: number) => {
    const comment = comments.find(c => c.id === id);
    if (comment) {
      setEditingComment(id);
      setEditText(comment.content);
    }
  };

  const handleSaveEdit = async () => {
    if (editingComment && editText.trim()) {
      try {
        const updatedComment = await CommentService.updateComment(editingComment, {
          content: editText
        });
        setComments(comments.map(comment =>
          comment.id === editingComment ? updatedComment : comment
        ));
        setEditingComment(null);
        setEditText('');
      } catch (err) {
        console.error("Error updating comment:", err);
        // You could add a toast notification here
      }
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      await CommentService.deleteComment(id);
      setComments(comments.filter(comment => comment.id !== id));
    } catch (err) {
      console.error("Error deleting comment:", err);
      // You could add a toast notification here
    }
  };

  const handleToggleHide = async () => {
    if (!playerData) return;
    
    try {
      setIsHiding(true);
      const newHiddenStatus = !playerData.hidden;
      
      // Call API to update player hidden status
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl.slice(0, -1)}/${playerData.playerDkId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hidden: newHiddenStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update player status');
      }
      
      // Update local state
      setPlayerData({ ...playerData, hidden: newHiddenStatus });
    } catch (error) {
      console.error('Error updating player hide status:', error);
      // You could add a toast notification here
    } finally {
      setIsHiding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'questionable': return 'bg-yellow-100 text-yellow-800';
      case 'doubtful': return 'bg-orange-100 text-orange-800';
      case 'out': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading player data for ID: {playerId}...</p>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Player Profile
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error || "Player not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data for current week stats
  const currentWeekSalary = Math.floor(Math.random() * 3000) + 5000;
  const currentWeekProj = Math.random() * 10 + 15;
  const status = 'active';
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Player Profile
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {playerData.playerImage160 ? (
              <img
                src={playerData.playerImage160}
                alt={playerData.displayName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <AvatarFallback className="text-lg">
                {playerData.displayName ? playerData.displayName.split(' ').map((n: string) => n[0]).join('') : 'N/A'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-2xl">{playerData.displayName || 'Unknown Player'}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{playerData.team || 'N/A'}</span>
              <span>•</span>
              <span>{playerData.position || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Info */}
          <Card>
            <CardHeader>
              <CardTitle>Player Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Current Week Salary</div>
                  <div className="text-lg">${currentWeekSalary.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Week Proj</div>
                  <div className="text-lg">{currentWeekProj.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="secondary" className={getStatusColor(status)}>
                    {status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Hidden</div>
                  <Badge variant={playerData?.hidden ? "destructive" : "secondary"}>
                    {playerData?.hidden ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Season Stats */}
          <Card>
            <CardHeader>
              <CardTitle>2024 Season Stats</CardTitle>
              <CardDescription>{mockStats.season.games} games played</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Passing Yards</div>
                  <div className="text-2xl">{mockStats.season.yards.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Touchdowns</div>
                  <div className="text-2xl">{mockStats.season.touchdowns}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Interceptions</div>
                  <div className="text-2xl">{mockStats.season.interceptions}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Passer Rating</div>
                  <div className="text-2xl">{mockStats.season.rating}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Props Section */}
          <PlayerProps playerId={playerData.playerDkId} />

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments & Notes
              </CardTitle>
              <CardDescription>Add your research, insights, and general notes about this player</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a general note about this player's performance, value, or strategy considerations..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim()}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </Button>
              </div>

              <Separator />

              {/* Comments List */}
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading comments...
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()} at{' '}
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingComment === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit} className="gap-2">
                              <Save className="w-4 h-4" />
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setEditingComment(null)
                                setEditText('')
                              }}
                              className="gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">{comment.content}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments yet. Add your first note about this player.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Career Stats</CardTitle>
              <CardDescription>{mockStats.career.games} career games</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Passing Yards</span>
                <span className="text-sm">{mockStats.career.yards.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Touchdowns</span>
                <span className="text-sm">{mockStats.career.touchdowns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Interceptions</span>
                <span className="text-sm">{mockStats.career.interceptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Career Rating</span>
                <span className="text-sm">{mockStats.career.rating}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                View Game Log
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Compare vs Position
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Injury History
              </Button>
              <Button 
                variant={playerData?.hidden ? "default" : "destructive"} 
                className="w-full justify-start"
                onClick={handleToggleHide}
                disabled={isHiding}
              >
                {isHiding ? "Updating..." : (playerData?.hidden ? "Show Player" : "Hide Player")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
