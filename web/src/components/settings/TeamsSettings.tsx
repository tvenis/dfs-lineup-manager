import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'

interface Team {
  id: number;
  full_name: string;
  abbreviation: string | null;
  mascot: string | null;
  logo: string | null;
  division: string | null;
  conference: string | null;
  created_at: string;
  updated_at: string | null;
  odds_api_id: string | null;
}

const divisions = [
  'AFC North', 'AFC South', 'AFC East', 'AFC West',
  'NFC North', 'NFC South', 'NFC East', 'NFC West'
]

const conferences = ['AFC', 'NFC']

// Separate component to prevent re-renders
const TeamForm = ({ team, onChange, onSubmit, onCancel, title }: any) => {
  const handleInputChange = useCallback((field: string, value: string) => {
    onChange({ ...team, [field]: value })
  }, [team, onChange])

  const handleConferenceChange = useCallback((newConference: string) => {
    onChange({ 
      ...team, 
      conference: newConference,
      division: newConference === 'AFC' ? 'AFC North' : 'NFC North'
    })
  }, [team, onChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="teamName">Team Name</Label>
        <Input
          id="teamName"
          value={team.full_name}
          onChange={(e) => handleInputChange('full_name', e.target.value)}
          placeholder="Enter team name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="abbreviation">Abbreviation</Label>
        <Input
          id="abbreviation"
          value={team.abbreviation || ''}
          onChange={(e) => handleInputChange('abbreviation', e.target.value.toUpperCase())}
          placeholder="e.g., BAL, KC, SF"
          maxLength={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mascot">Mascot</Label>
        <Input
          id="mascot"
          value={team.mascot || ''}
          onChange={(e) => handleInputChange('mascot', e.target.value)}
          placeholder="e.g., Ravens, Chiefs, 49ers"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo URL</Label>
        <Input
          id="logo"
          value={team.logo || ''}
          onChange={(e) => handleInputChange('logo', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="conference">Conference</Label>
          <select
            id="conference"
            value={team.conference || 'AFC'}
            onChange={(e) => handleConferenceChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {conferences.map((conf) => (
              <option key={conf} value={conf}>{conf}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="division">Division</Label>
          <select
            id="division"
            value={team.division || 'AFC North'}
            onChange={(e) => handleInputChange('division', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {divisions.filter(div => div.startsWith(team.conference || 'AFC')).map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!team.full_name}>
          {title}
        </Button>
      </div>
    </div>
  )
}

export function TeamsSettings() {
  const [teams, setTeams] = useState<Team[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingTeam, setIsAddingTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newTeam, setNewTeam] = useState({
    full_name: '',
    abbreviation: '',
    division: 'AFC North',
    conference: 'AFC',
    mascot: '',
    logo: ''
  })

  // Fetch teams from API
  const fetchTeams = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('http://localhost:8000/api/teams/')
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      } else {
        console.error('Failed to fetch teams')
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const filteredTeams = teams.filter(team => {
    return searchTerm === '' || 
      team.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.abbreviation && team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.division && team.division.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const handleAddTeam = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/teams/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: newTeam.full_name,
          abbreviation: newTeam.abbreviation || null,
          division: newTeam.division,
          conference: newTeam.conference,
          mascot: newTeam.mascot || null,
          logo: newTeam.logo || null
        })
      })

      if (response.ok) {
        const createdTeam = await response.json()
        setTeams(prev => [...prev, createdTeam])
        setNewTeam({
          full_name: '',
          abbreviation: '',
          division: 'AFC North',
          conference: 'AFC',
          mascot: '',
          logo: ''
        })
        setIsAddingTeam(false)
      } else {
        const error = await response.json()
        alert(`Failed to create team: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team')
    }
  }

  const handleEditTeam = useCallback((team: Team) => {
    setEditingTeam({ ...team })
  }, [])

  const handleUpdateTeam = useCallback(async () => {
    if (!editingTeam) return

    try {
      const response = await fetch(`http://localhost:8000/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: editingTeam.full_name,
          abbreviation: editingTeam.abbreviation || null,
          division: editingTeam.division,
          conference: editingTeam.conference,
          mascot: editingTeam.mascot || null,
          logo: editingTeam.logo || null
        })
      })

      if (response.ok) {
        const updatedTeam = await response.json()
        setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t))
        setEditingTeam(null)
      } else {
        const error = await response.json()
        alert(`Failed to update team: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Failed to update team')
    }
  }, [editingTeam])

  const handleDeleteTeam = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/teams/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTeams(prev => prev.filter(t => t.id !== id))
      } else {
        const error = await response.json()
        alert(`Failed to delete team: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Failed to delete team')
    }
  }

  const getConferenceColor = (conference: string | null) => {
    return conference === 'AFC' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
  }

  const handleCancelEdit = useCallback(() => {
    setEditingTeam(null)
  }, [])



  if (isLoading) {
    return (
      <div className="max-w-6xl">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading teams...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Header and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teams Management</CardTitle>
              <CardDescription>
                View, add, edit, and remove NFL teams and their attributes
              </CardDescription>
            </div>
            <Dialog open={isAddingTeam} onOpenChange={setIsAddingTeam}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Team</DialogTitle>
                  <DialogDescription>
                    Create a new team profile
                  </DialogDescription>
                </DialogHeader>
                <TeamForm
                  team={newTeam}
                  onChange={setNewTeam}
                  onSubmit={handleAddTeam}
                  onCancel={() => setIsAddingTeam(false)}
                  title="Add Team"
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search teams, abbreviations, or divisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Teams Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead>Conference</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-xs">{team.abbreviation || '?'}</span>
                        </div>
                        <span>{team.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {team.abbreviation || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getConferenceColor(team.conference)} border-0`}>
                        {team.conference || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>{team.division || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditTeam(team)} 
                          className="hover:bg-blue-50 border-blue-300"
                          title="Edit Team"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        
                        <Dialog key={`edit-dialog-${team.id}`} open={editingTeam?.id === team.id} onOpenChange={(open) => !open && setEditingTeam(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Team</DialogTitle>
                              <DialogDescription>
                                Update team information
                              </DialogDescription>
                            </DialogHeader>
                            {editingTeam && (
                              <TeamForm
                                key={editingTeam.id}
                                team={editingTeam}
                                onChange={setEditingTeam}
                                onSubmit={handleUpdateTeam}
                                onCancel={handleCancelEdit}
                                title="Update Team"
                              />
                            )}
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-red-50">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Team</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {team.full_name}? This will also affect all players assigned to this team. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTeam(team.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No teams found matching your search criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
