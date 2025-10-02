import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowLeft, Loader2, Edit, Trash2, MessageSquare, Save, X, Plus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"; // Temporarily disabled
import { PlayerService } from "@/lib/playerService";
import { CommentService, Comment } from "@/lib/commentService";
import { Player, PlayerNameAlias, PlayerPoolEntry } from "@/types/prd";
import { buildApiUrl, API_CONFIG } from "@/config/api";
import PlayerProps from "./PlayerProps";
import { GameLogCard } from "./GameLogCard";

interface PlayerProfileProps {
  playerId: string;
}


export function PlayerProfile({ playerId }: PlayerProfileProps) {
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [playerPoolData, setPlayerPoolData] = useState<PlayerPoolEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isHiding, setIsHiding] = useState(false);
  const [aliases, setAliases] = useState<PlayerNameAlias[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [isCreatingAlias, setIsCreatingAlias] = useState(false);


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

  const loadAliases = async (playerDkId: number) => {
    try {
      setAliasesLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/player-aliases/player/${playerDkId}`);
      if (response.ok) {
        const data = await response.json();
        setAliases(data);
      }
    } catch (error) {
      console.error('Error loading aliases:', error);
    } finally {
      setAliasesLoading(false);
    }
  };

  const createAlias = async () => {
    if (!playerData || !newAliasName.trim()) return;
    
    try {
      setIsCreatingAlias(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/player-aliases/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerDkId: playerData.playerDkId,
          alias_name: newAliasName.trim(),
        }),
      });
      
      if (response.ok) {
        const newAlias = await response.json();
        setAliases([...aliases, newAlias]);
        setNewAliasName('');
        setIsAliasModalOpen(false);
      } else {
        const error = await response.json();
        alert(`Error creating alias: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating alias:', error);
      alert('Error creating alias');
    } finally {
      setIsCreatingAlias(false);
    }
  };

  const deleteAlias = async (aliasId: number) => {
    if (!confirm('Are you sure you want to delete this alias?')) return;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/player-aliases/${aliasId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAliases(aliases.filter(alias => alias.id !== aliasId));
      } else {
        alert('Error deleting alias');
      }
    } catch (error) {
      console.error('Error deleting alias:', error);
      alert('Error deleting alias');
    }
  };

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("PlayerProfile - Fetching data for playerId:", playerId);

        // Get current week first
        const currentWeek = await PlayerService.getCurrentWeek();
        console.log("PlayerProfile - Current week:", currentWeek);

        // Get player pool data for the current week
        const playerPoolResponse = await PlayerService.getPlayerPool(currentWeek.id, { limit: 1000 });
        console.log("PlayerProfile - Player pool response:", playerPoolResponse);

        const playerPoolEntry = playerPoolResponse.entries?.find(entry =>
          entry.playerDkId.toString() === playerId
        );

        console.log("PlayerProfile - Found player pool entry:", playerPoolEntry);

        if (playerPoolEntry) {
          setPlayerData(playerPoolEntry.player);
          setPlayerPoolData(playerPoolEntry);
          // Load comments and aliases for this player
          await Promise.all([
            loadComments(playerPoolEntry.playerDkId),
            loadAliases(playerPoolEntry.playerDkId)
          ]);
        } else {
          setError(`Player with ID ${playerId} not found in current week's player pool`);
        }
      } catch (err) {
        console.error("PlayerProfile - Error fetching player data:", err);
        setError(`Failed to load player data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  // Handle anchor scrolling when component mounts
  useEffect(() => {
    const handleAnchorScroll = () => {
      if (window.location.hash === '#comments') {
        // Try multiple times with increasing delays
        const tryScroll = (attempt = 1) => {
          const commentsElement = document.getElementById('comments');
          
          if (commentsElement) {
            // Try different scroll methods
            commentsElement.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
            
            // Also try scrolling the window
            const elementTop = commentsElement.offsetTop;
            window.scrollTo({
              top: elementTop - 80, // Account for any fixed headers
              behavior: 'smooth'
            });
          } else if (attempt < 5) {
            // Retry after a longer delay
            setTimeout(() => tryScroll(attempt + 1), 200 * attempt);
          }
        };
        
        // Start trying after a short delay
        setTimeout(() => tryScroll(), 100);
      }
    };

    // Check on mount
    handleAnchorScroll();

    // Also listen for hash changes
    window.addEventListener('hashchange', handleAnchorScroll);
    
    return () => {
      window.removeEventListener('hashchange', handleAnchorScroll);
    };
  }, [playerData]); // Run when playerData is loaded

  // Comment handling functions
  const handleAddComment = async () => {
    if (newComment.trim() && playerData) {
      try {
        const newCommentData = await CommentService.createComment({
          content: newComment,
          playerDkId: playerData.playerDkId
        });
        
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
              Back to Player Card List
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

  // Get real data from player pool entry
  const currentWeekSalary = playerPoolData?.salary || 0;
  const currentWeekProj = playerPoolData?.projectedPoints || 0;
  const status = playerPoolData?.status || 'unknown';
  const ownership = playerPoolData?.ownership || 0;
  
  // Debug logging (can be removed in production)
  console.log('PlayerProfile rendering - playerData:', playerData);
  console.log('PlayerProfile rendering - playerPoolData:', playerPoolData);
  console.log('PlayerProfile rendering - loading:', loading);
  console.log('PlayerProfile rendering - error:', error);
  console.log('PlayerProfile rendering - aliases:', aliases);
  console.log('PlayerProfile rendering - isAliasModalOpen:', isAliasModalOpen);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <div className="mb-4">
        <Link href="/profile">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Player Card List
          </Button>
        </Link>
      </div>

      {/* Player Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              {playerData.playerImage160 ? (
                <img
                  src={playerData.playerImage160}
                  alt={playerData.displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarFallback className="text-2xl">
                  {playerData.displayName ? playerData.displayName.split(' ').map((n: string) => n[0]).join('') : 'N/A'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{playerData.displayName || 'Unknown Player'}</h1>
              <div className="flex items-center gap-4 text-lg text-muted-foreground mb-3">
                <span className="font-medium">{playerData.team || 'N/A'}</span>
                <span>•</span>
                <span className="font-medium">{playerData.position || 'N/A'}</span>
              </div>
              
              {/* Aliases - Small and subtle */}
              {aliases.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Also known as:</span>
                  <div className="flex flex-wrap gap-1">
                    {aliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-2 py-1"
                      >
                        <span className="text-xs text-gray-700">{alias.alias_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlias(alias.id)}
                          className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <div className="text-lg">{currentWeekProj > 0 ? currentWeekProj.toFixed(1) : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Week Ownership</div>
                  <div className="text-lg">{ownership > 0 ? `${ownership.toFixed(1)}%` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="secondary" className={getStatusColor(status)}>
                    {status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Hidden</div>
                  <Badge variant={playerData?.hidden ? "destructive" : "secondary"}>
                    {playerData?.hidden ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Excluded</div>
                  <Badge variant={playerPoolData?.excluded ? "destructive" : "secondary"}>
                    {playerPoolData?.excluded ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tier</div>
                  <div className="text-lg">{playerPoolData?.tier || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Disabled</div>
                  <Badge variant={playerPoolData?.isDisabled ? "destructive" : "secondary"}>
                    {playerPoolData?.isDisabled ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Log */}
          {playerData && (
            <GameLogCard 
              playerId={playerId} 
              playerPosition={playerData.position} 
            />
          )}

          {/* Player Props Section */}
          <PlayerProps playerId={playerData.playerDkId} />

          {/* Comments Section */}
          <Card id="comments" className="scroll-mt-20">
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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Quick Actions section */}
              <Button variant="outline" className="w-full justify-start">
                Compare Players
              </Button>
              
              {/* Add Player Alias button */}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsAliasModalOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Player Alias
              </Button>
              
              {isAliasModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                    <div>
                      <h2 className="text-lg font-bold">Add Player Alias</h2>
                      <p className="text-sm text-muted-foreground">
                        Add an alternative name or nickname for {playerData?.displayName} that can be used for matching.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="alias-name">Alias Name</Label>
                      <Input
                        id="alias-name"
                        value={newAliasName}
                        onChange={(e) => setNewAliasName(e.target.value)}
                        placeholder="e.g., Hollywood Brown"
                        disabled={isCreatingAlias}
                      />
                    </div>
                    {aliases.length > 0 && (
                      <div>
                        <Label>Existing Aliases</Label>
                        <div className="space-y-2 mt-2">
                          {aliases.map((alias) => (
                            <div key={alias.id} className="flex items-center justify-between p-2 border rounded">
                              <span>{alias.alias_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAlias(alias.id)}
                                disabled={isCreatingAlias}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAliasModalOpen(false);
                          setNewAliasName('');
                        }}
                        disabled={isCreatingAlias}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createAlias}
                        disabled={!newAliasName.trim() || isCreatingAlias}
                      >
                        {isCreatingAlias ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Alias'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
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
