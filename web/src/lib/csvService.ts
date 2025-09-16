import Papa from 'papaparse'

export interface DraftKingsPlayer {
  Name: string
  Position: string
  Salary: string
  TeamAbbrev: string
  'Game Info': string
  AvgPointsPerGame?: string
  [key: string]: string | undefined
}

export interface ImportResult {
  success: boolean
  message: string
  playersImported?: number
  errors?: string[]
  weekId?: string
}

export interface PlayerPoolEntry {
  id: string
  week_id: string
  player_id: string
  salary: number
  game_info?: string
  avg_points?: number
  status: string
  excluded: boolean
  roster_position?: string
}

export interface Player {
  id: string
  name: string
  position: string
  team_id: string
  stats?: Record<string, unknown>
}

export interface Team {
  id: string
  name: string
  abbreviation: string
}

export class CSVImportService {
  private static generatePlayerId(name: string, team: string): string {
    // Generate a unique player ID based on name and team
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const cleanTeam = team.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    return `${cleanName}_${cleanTeam}_${Date.now()}`
  }

  private static generateTeamId(abbreviation: string): string {
    return abbreviation.toUpperCase()
  }

  private static parseSalary(salaryStr: string): number {
    const salary = parseInt(salaryStr.replace(/[^0-9]/g, ''), 10)
    if (isNaN(salary) || salary <= 0) {
      throw new Error(`Invalid salary: ${salaryStr}`)
    }
    return salary
  }

  private static parseAvgPoints(pointsStr?: string): number | undefined {
    if (!pointsStr) return undefined
    const points = parseFloat(pointsStr)
    return isNaN(points) ? undefined : points
  }

  private static validateRequiredColumns(headers: string[]): string[] {
    const required = ['Name', 'Position', 'Salary', 'TeamAbbrev', 'Game Info']
    const missing = required.filter(col => !headers.includes(col))
    return missing
  }

  private static validatePosition(position: string): boolean {
    const validPositions = ['QB', 'RB', 'WR', 'TE', 'DST']
    return validPositions.includes(position.toUpperCase())
  }

  static parseDraftKingsCSV(csvText: string): ImportResult {
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      })

      if (result.errors.length > 0) {
        return {
          success: false,
          message: 'CSV parsing errors occurred',
          errors: result.errors.map(err => `Row ${(err.row || 0) + 1}: ${err.message}`)
        }
      }

      const headers = Object.keys(result.data[0] || {})
      const missingColumns = this.validateRequiredColumns(headers)
      
      if (missingColumns.length > 0) {
        return {
          success: false,
          message: `Missing required columns: ${missingColumns.join(', ')}`,
          errors: [`Required columns: ${headers.join(', ')}`]
        }
      }

      const players: DraftKingsPlayer[] = result.data as DraftKingsPlayer[]
      const validPlayers: DraftKingsPlayer[] = []
      const errors: string[] = []

      players.forEach((player, index) => {
        try {
          // Validate required fields
          if (!player.Name || !player.Position || !player.Salary || !player.TeamAbbrev) {
            errors.push(`Row ${index + 1}: Missing required fields`)
            return
          }

          // Validate position
          if (!this.validatePosition(player.Position)) {
            errors.push(`Row ${index + 1}: Invalid position "${player.Position}"`)
            return
          }

          // Validate salary
          try {
            this.parseSalary(player.Salary)
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Invalid salary'}`)
            return
          }

          // Validate team abbreviation
          if (player.TeamAbbrev.length !== 3) {
            errors.push(`Row ${index + 1}: Team abbreviation must be 3 characters`)
            return
          }

          validPlayers.push(player)
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Validation error'}`)
        }
      })

      if (validPlayers.length === 0) {
        return {
          success: false,
          message: 'No valid players found in CSV',
          errors
        }
      }

      return {
        success: true,
        message: `Successfully parsed ${validPlayers.length} players`,
        playersImported: validPlayers.length,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to parse CSV file',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  static async importPlayersToBackend(
    csvText: string, 
    weekId: string,
    apiBaseUrl: string = 'http://localhost:8000'
  ): Promise<ImportResult> {
    try {
      // First parse the CSV
      const parseResult = this.parseDraftKingsCSV(csvText)
      if (!parseResult.success) {
        return parseResult
      }

      // Parse the CSV data again to get the actual players
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      })

      const players: DraftKingsPlayer[] = result.data as DraftKingsPlayer[]
      
      // Process players and create/update teams and players
      const teams = new Map<string, Team>()
      const processedPlayers = new Map<string, Player>()
      const playerPoolEntries: PlayerPoolEntry[] = []

      for (const player of players) {
        try {
          // Create or get team
          const teamAbbr = player.TeamAbbrev.toUpperCase()
          if (!teams.has(teamAbbr)) {
            teams.set(teamAbbr, {
              id: this.generateTeamId(teamAbbr),
              name: `${teamAbbr} Team`, // We'll need to get actual team names
              abbreviation: teamAbbr
            })
          }

          // Create or get player
          const playerId = this.generatePlayerId(player.Name, teamAbbr)
          if (!processedPlayers.has(playerId)) {
            processedPlayers.set(playerId, {
              id: playerId,
              name: player.Name,
              position: player.Position.toUpperCase(),
              team_id: teamAbbr
            })
          }

          // Create player pool entry
          const entryId = `${weekId}_${playerId}`
          playerPoolEntries.push({
            id: entryId,
            week_id: weekId,
            player_id: playerId,
            salary: this.parseSalary(player.Salary),
            game_info: player['Game Info'],
            avg_points: this.parseAvgPoints(player.AvgPointsPerGame),
            status: 'Available',
            excluded: false
          })
        } catch (error) {
          console.error(`Error processing player ${player.Name}:`, error)
        }
      }

      // Import teams first
      for (const team of teams.values()) {
        try {
          await this.createTeam(team, apiBaseUrl)
        } catch (error) {
          console.error(`Error creating team ${team.id}:`, error)
        }
      }

      // Import players
      for (const player of processedPlayers.values()) {
        try {
          await this.createPlayer(player, apiBaseUrl)
        } catch (error) {
          console.error(`Error creating player ${player.id}:`, error)
        }
      }

      // Import player pool entries
      try {
        await this.createBulkPlayerPoolEntries(playerPoolEntries, apiBaseUrl)
      } catch (error) {
        console.error('Error creating player pool entries:', error)
        return {
          success: false,
          message: 'Failed to import player pool entries',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }

      return {
        success: true,
        message: `Successfully imported ${playerPoolEntries.length} players for week ${weekId}`,
        playersImported: playerPoolEntries.length,
        weekId
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to import players to backend',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private static async createTeam(team: Team, apiBaseUrl: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/teams/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(team),
    })

    if (!response.ok && response.status !== 400) { // 400 means team already exists
      throw new Error(`Failed to create team: ${response.statusText}`)
    }
  }

  private static async createPlayer(player: Player, apiBaseUrl: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/players/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(player),
    })

    if (!response.ok && response.status !== 400) { // 400 means player already exists
      throw new Error(`Failed to create player: ${response.statusText}`)
    }
  }

  private static async createBulkPlayerPoolEntries(
    entries: PlayerPoolEntry[], 
    apiBaseUrl: string
  ): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/players/pool/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entries),
    })

    if (!response.ok) {
      throw new Error(`Failed to create player pool entries: ${response.statusText}`)
    }
  }
}
