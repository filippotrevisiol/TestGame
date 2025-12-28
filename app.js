// Simple manager game logic (uses real 2025 teams from data.js)
(function(){
  // Utilities
  const $ = id => document.getElementById(id);
  const formatK = k => `$${(k/1000).toFixed(0)}k`;

  // Game constants
  const UPGRADE_COST = 500000; // $500k
  const START_BUDGET = 3000000; // $3M

  // State
  let state = null;

  // Helper to build teams from DATA.teams and DATA.drivers
  function buildTeamsFromData(){
    // Map drivers by id for quick lookup
    const drvMap = Object.fromEntries((DATA.drivers||[]).map(d=>[d.id, {...d}]));
    // Clone teams, attach driver objects
    const teams = (DATA.teams||[]).map(t=>({
      id: t.id,
      name: t.name,
      baseCar: t.baseCar || 75 + Math.floor(Math.random()*10),
      budget: t.budget || 2000000,
      reputation: t.reputation || 50,
      aiStrength: t.aiStrength || 0.5,
      drivers: (t.drivers||[]).map(did => {
        const drv = drvMap[did];
        return drv? {...drv} : { id: did, name: did };
      })
    }));
    return teams;
  }

  // Initialize or load
  function newSeason(){
    // Use real teams from DATA
    const baseTeams = buildTeamsFromData();
    state = {
      teams: baseTeams.map(t=>({ ...t })),
      playerTeamId: null,
      raceIndex: 0,
      budget: START_BUDGET,
      upgradeLevel: 0,
      strategy: 'balanced',
      seasonRaces: DATA.circuits.slice(0).map((c,i)=>({ ...c, round: i+1 })),
      driverPoints: {}, // id -> points
      constructorPoints: {}, // teamId -> points
      lastResults: null
    };
    // init points
    for(const d of DATA.drivers) state.driverPoints[d.id] = 0;
    for(const t of state.teams) state.constructorPoints[t.id] = 0;
    save();
  }

  function save(){ localStorage.setItem('miniF1', JSON.stringify(state)); }
  function load(){ const raw=localStorage.getItem('miniF1'); return raw?JSON.parse(raw):null; }

  // Rendering
  function renderAll(){
    const playerTeam = state.teams.find(t=>t.id===state.playerTeamId) || { name: 'No team chosen', drivers: [] };
    $('teamName').textContent = playerTeam.name;
    $('budget').textContent = `Budget: ${formatK(playerTeam.budget || state.budget)}`;
    $('upgradeStatus').textContent = `Upgrade level: ${playerTeam.upgradeLevel ? 'Installed' : 'None'}`;
    const nextRound = Math.min(state.raceIndex+1, state.seasonRaces.length);
    $('seasonInfo').textContent = `Race ${nextRound}/${state.seasonRaces.length}`;

    // Drivers
    const dl = $('driversList'); dl.innerHTML = '';
    (playerTeam.drivers || []).forEach(d=>{
      const div = document.createElement('div'); div.className='driver';
      div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill||'-'}</span></div>`;
      dl.appendChild(div);
    });

    // Available drivers (pool): those not in any team
    const used = new Set(state.teams.flatMap(t=>t.drivers.map(d=>d.id)));
    const avail = DATA.drivers.filter(d=>!used.has(d.id));
    const av = $('availableDrivers'); av.innerHTML='';
    avail.forEach(d=>{
      const div = document.createElement('div'); div.className='driver';
      div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill} wage:${formatK(d.wage*1000)}</span></div>`;
      av.appendChild(div);
    });

    // Race list
    const rl = $('raceList'); rl.innerHTML='';
    state.seasonRaces.forEach((r,i)=>{
      const div = document.createElement('div'); div.className='race';
      div.innerHTML = `<div>Round ${r.round}: ${r.name}</div><div>${i < state.raceIndex ? 'Done' : (i===state.raceIndex ? 'Upcoming' : 'Pending')}</div>`;
      rl.appendChild(div);
    });

    // Last results
    const lr = $('lastResults'); lr.innerHTML='';
    if(state.lastResults){
      const table = document.createElement('div'); table.className='table';
      state.lastResults.forEach((row, idx)=>{
        const r = document.createElement('div'); r.className='row';
        r.innerHTML = `<div>#${idx+1} ${row.driverName} (${row.teamName})</div><div class="small">${row.points} pts${row.crashed? ' (ret)':''}</div>`;
        table.appendChild(r);
      }); lr.appendChild(table);
    } else lr.textContent = 'No races yet';

    renderStandings();
  }

  function renderStandings(){
    const ds = $('driverStandings'); ds.innerHTML = '<h3>Driver Standings</h3>';
    const items = Object.entries(state.driverPoints).map(([id,pts])=>{
      const d = DATA.drivers.find(x=>x.id===id) || { name: id };
      return { id, name: d.name, pts };
    }).sort((a,b)=>b.pts-a.pts).slice(0,10);
    ds.innerHTML = '<h3>Driver Standings</h3>';
    items.forEach(it=>{ const div=document.createElement('div'); div.className='row'; div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`; ds.appendChild(div); });

    const cs = $('constructorStandings'); cs.innerHTML = '<h3>Constructor Standings</h3>';
    const citems = state.teams.map(t=>({ id:t.id, name:t.name, pts: state.constructorPoints[t.id] || 0 })).sort((a,b)=>b.pts-a.pts);
    citems.forEach(it=>{ const div=document.createElement('div'); div.className='row'; div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`; cs.appendChild(div); });
  }

  // Race simulation (keeps previous logic)
  function runRace(){
    if(!state.playerTeamId){ alert('Please choose a team before racing.'); showTeamModal(); return; }
    if(state.raceIndex >= state.seasonRaces.length) { alert('Season finished. Reset to play again.'); return; }
    const circuit = state.seasonRaces[state.raceIndex];
    const entries = [];
    for(const team of state.teams){
      for(const d of team.drivers){
        const upgradeBonus = team.upgradeLevel ? 6 : 0;
        const base = (team.baseCar||70) + (d.skill||75) * 0.5 + upgradeBonus;
        const strat = (team.id === state.playerTeamId) ? state.strategy : (Math.random()<0.5 ? 'balanced' : 'conservative');
        let stratBonus = 0; let crashRisk = 0.02;
        if(strat==='aggressive'){ stratBonus = 5; crashRisk = 0.08; }
        if(strat==='conservative'){ stratBonus = -2; crashRisk = 0.01; }
        const perf = base + stratBonus - (circuit.difficulty-1)*5 + randn(0,6);
        entries.push({ driverId: d.id, driverName: d.name, teamId: team.id, teamName: team.name, perf, crashed: Math.random() < crashRisk * circuit.difficulty });
      }
    }
    const finished = entries.filter(e=>!e.crashed).sort((a,b)=>b.perf - a.perf);
    const crashed = entries.filter(e=>e.crashed).sort((a,b)=>b.perf - a.perf);
    const finalOrder = finished.concat(crashed);
    const results = [];
    for(let i=0;i<finalOrder.length;i++){ const e = finalOrder[i]; const pts = (i < DATA.points.length && !e.crashed) ? DATA.points[i] : 0; state.driverPoints[e.driverId] = (state.driverPoints[e.driverId]||0) + pts; state.constructorPoints[e.teamId] = (state.constructorPoints[e.teamId]||0) + pts; results.push({ position: i+1, driverName: e.driverName, teamName: e.teamName, points: pts, crashed: e.crashed }); }
    const playerTeam = state.teams.find(t=>t.id===state.playerTeamId);
    const winnerTeamName = results.length ? results[0].teamName : null;
    const playerResults = results.find(r=> r.teamName === playerTeam.name );
    const sponsorship = 200000 + (winnerTeamName === playerTeam.name ? 300000 : 0) + (playerResults ? playerResults.points*50000 : 0);
    playerTeam.budget = (playerTeam.budget||0) + sponsorship;
    state.lastResults = results.slice(0,10);
    state.raceIndex++; save(); renderAll();
  }

  // Helpers
  function randn(mean=0,sd=1){ let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random(); return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

  // UI actions
  function wire(){
    $('nextRace').addEventListener('click', ()=> runRace());
    $('buyUpgrade').addEventListener('click', ()=>{
      const team = state.teams.find(t=>t.id===state.playerTeamId);
      if(!team){ alert('Choose a team first'); showTeamModal(); return; }
      if(team.upgradeLevel){ alert('Upgrade already installed.'); return; }
      if(team.budget < UPGRADE_COST){ alert('Not enough budget.'); return; }
      team.budget -= UPGRADE_COST; team.upgradeLevel = 1; save(); renderAll();
    });
    $('strategy').addEventListener('change', (e)=>{ state.strategy = e.target.value; save(); });
    $('reset').addEventListener('click', ()=>{ if(confirm('Reset season and lose progress?')){ newSeason(); save(); renderAll(); showTeamModal(); } });

    document.addEventListener('click',(e)=>{
      const hi = e.target.dataset.hire; if(hi){ hireDriver(hi); return; }
      const fd = e.target.dataset.driver; if(fd){ fireDriver(fd); return; }
      const selTeam = e.target.dataset.selectTeam; if(selTeam){ selectTeam(selTeam); return; }
    });

    // Modal close
    $('closeTeamModal').addEventListener('click', ()=>{ hideTeamModal(); });
  }

  function hireDriver(driverId){ const drv = DATA.drivers.find(d=>d.id===driverId); if(!drv){ alert('Driver not found'); return; } const cost = drv.wage * 1000; const team = state.teams.find(t=>t.id===state.playerTeamId); if(team.drivers.length>=2){ alert('You already have 2 drivers. Fire one to hire.'); return; } if(team.budget < cost){ alert('Not enough budget to hire.'); return; } team.budget -= cost; team.drivers.push({...drv}); save(); renderAll(); }
  function fireDriver(driverId){ const team = state.teams.find(t=>t.id===state.playerTeamId); const idx = team.drivers.findIndex(d=>d.id===driverId); if(idx===-1) return; if(!confirm(`Fire ${team.drivers[idx].name}?`)) return; team.drivers.splice(idx,1); save(); renderAll(); }

  // Team modal
  function showTeamModal(){ const modal = $('teamModal'); modal.setAttribute('aria-hidden','false'); renderTeamList(); }
  function hideTeamModal(){ const modal = $('teamModal'); modal.setAttribute('aria-hidden','true'); }
  function renderTeamList(){ const container = $('teamList'); container.innerHTML=''; for(const t of DATA.teams){ const btn = document.createElement('button'); btn.className='team-card'; btn.dataset.selectTeam = t.id; btn.innerHTML = `<strong>${t.name}</strong><div class="small">${t.constructor || ''}</div>`; container.appendChild(btn); } }
  function selectTeam(teamId){ state.playerTeamId = teamId; // ensure team object exists in state
    const team = state.teams.find(t=>t.id===teamId);
    if(!team){ alert('Team not found'); return; }
    // give player initial budget from team data
    team.budget = team.budget || 2000000;
    save(); hideTeamModal(); renderAll(); }

  // Boot
  function boot(){ const saved = load(); if(saved) state = saved; else newSeason(); wire(); if(!state.playerTeamId){ showTeamModal(); } renderAll(); }

  window._miniF1 = { boot, state, save };
  boot();
})();
