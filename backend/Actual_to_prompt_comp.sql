select p.displayName
,p.playerDkId
, p.team
, p.position
,pa.completions
  , MAX(CASE WHEN market = 'player_pass_completions' 
         THEN outcome_point END) AS proj_pass_comp
,pa.attempts
,  MAX(CASE WHEN ppb.market = 'player_pass_attempts' 
         THEN ppb.outcome_point END) AS proj_pass_att
, pa.pass_yds
,   MAX(CASE WHEN market = 'player_pass_yds' 
         THEN outcome_point END) AS proj_pass_yards
,pa.pass_tds
  , MAX(CASE WHEN market = 'player_pass_tds' 
         THEN outcome_point END) AS proj_pass_tds
,pa.interceptions
,pa.rush_att
  , MAX(CASE WHEN market = 'player_rush_attempts' 
         THEN outcome_point END) AS proj_rush_att
, pa.rush_yds
  , MAX(CASE WHEN market = 'player_rush_yds' 
         THEN outcome_point END) AS proj_rush_yds
,pa.rush_tds
,pa.rec_tgt
,pa.receptions
  , MAX(CASE WHEN market = 'player_receptions' 
         THEN outcome_point END) AS proj_receptions
,pa.rec_yds
  , MAX(CASE WHEN market = 'player_reception_yds' 
         THEN outcome_point END) AS proj_reception_yds
,pa.fumbles
,pa.fumbles_lost
,pa.total_tds
, MAX(CASE WHEN ppb.market = 'player_tds_over' 
        THEN outcome_point END) AS proj_total_tds
, ppe.projectedPoints
, pa.dk_actuals
,pa.dk_actuals - ppe.projectedPoints as ptDiff
, pa.vbd
,pa.pos_rank
,pa.ov_rank

from player_actuals pa, player_prop_bets ppb, players p, player_pool_entries ppe
where pa.playerDkId = ppb.playerDkId
and p.playerDkId = pa.playerDkId
and p.playerDkId = ppe.playerDkId
and pa.week_id= 1
and p.position = 'QB'
and ppb.bookmaker = 'draftkings'
and ppb.outcome_name = 'Over'
Group BY p.displayName, p.playerDkId, p.team, p.position
-- and p.playerDkId = 485441
order by ptDiff DESC