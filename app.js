// Simple manager game logic (fixed)
(function(){
  // Utilities
  const $ = id => document.getElementById(id);
  const formatK = k => `$${(k/1000).toFixed(0)}k`;

  // Game constants
  const UPGRADE_COST = 500000; // $500k
  const START_BUDGET = 3000000; // $3M
  const SEASON_RACES = 6;

  // State
  let state = null;

  // Initialize or load
  function newSeason(){
    // Create ai teams (simple)
    const aiTeams = [
      makeTeam('Red Falcon'),
      makeTeam('Blue Arrow'),
      makeTeam('Green Comet'),
    ];
    // Player team
    const playerTeam = makeTeam('Your Team');
    playerTeam.isPlayer = true;
    // Assign initial drivers
    const pool = JSON.parse(JSON.stringify(DATA.drivers));
    shuffle(pool);
    playerTeam.drivers = [pool.pop(), pool.pop()];
    aiTeams[0].drivers = [pool.pop(), pool.pop()];
    aiTeams[1].drivers = [pool.pop(), pool.pop()];
    aiTeams[2].drivers = [pool.pop(), pool.pop()];

    state = {
      teams: [playerTeam, ...aiTeams],
      playerTeamId: playerTeam.id,
      raceIndex: 0,
      budget: START_BUDGET,
      upgradeLevel: 0,
      strategy: 'balanced',
      seasonRaces: DATA.circuits.slice(0, SEASON_RACES).map((c,i)=>({ ...c, round: i+1 })),
      driverPoints: {}, // id -> points
      constructorPoints: {}, // teamId -> points
      lastResults: null
    };
    // init points
    for(const d of DATA.drivers) state.driverPoints[d.id] = 0;
    for(const t of state.teams) state.constructorPoints[t.id] = 0;
    save();
  }

  function makeTeam(name){
    return {
      id: 't'+Math.random().toString(36).slice(2,8),
      name,
      baseCar: 70 + Math.floor(Math.random()*10), // base car performance
      drivers: [],
      cash: 0,
    };
  }

  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

  function save(){ localStorage.setItem('miniF1', JSON.stringify(state)); }
  function load(){ const raw=localStorage.getItem('miniF1'); return raw?JSON.parse(raw):null; }

  // Rendering
  function renderAll(){
    const playerTeam = state.teams.find(t=>t.id===state.playerTeamId) || { name: 'Your Team', drivers: [] };
    $('teamName').textContent = playerTeam.name;
    $('budget').textContent = `Budget: ${formatK(state.budget)}`;
    $('upgradeStatus').textContent = `Upgrade level: ${state.upgradeLevel ? 'Installed' : 'None'}`;
    // show next race index, but cap at season length
    const nextRound = Math.min(state.raceIndex+1, state.seasonRaces.length);
    $('seasonInfo').textContent = `Race ${nextRound}/${state.seasonRaces.length}`;

    // Drivers
    const dl = $('driversList');
    dl.innerHTML = '';
    (playerTeam.drivers || []).forEach(d=>{
      const div = document.createElement('div'); div.className='driver';
      div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill}</span></div>
        <div><button data-driver="${d.id}" class="fire">Fire</button></div>`;
      dl.appendChild(div);
    });

    // Available drivers (pool): those not in any team
    const used = new Set(state.teams.flatMap(t=>t.drivers.map(d=>d.id)));
    const avail = DATA.drivers.filter(d=>!used.has(d.id));
    const av = $('availableDrivers'); av.innerHTML='';
    avail.forEach(d=>{
      const div = document.createElement('div'); div.className='driver';
      div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill} wage:${formatK(d.wage*1000)}</span></div>
        <div><button data-hire="${d.id}">Hire</button></div>`;
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
      const table = document.createElement('div');
      table.className = 'table';
      state.lastResults.forEach((row, idx)=>{
        const r = document.createElement('div'); r.className='row';
        r.innerHTML = `<div>#${idx+1} ${row.driverName} (${row.teamName})</div><div class="small">${row.points} pts${row.crashed ? ' (ret)' : ''}</div>`;
        table.appendChild(r);
      });
      lr.appendChild(table);
    } else lr.textContent = 'No races yet';

    // Standings
    renderStandings();
  }

  function renderStandings(){
    // Driver standings
    const ds = $('driverStandings'); ds.innerHTML = '<h3>Driver Standings</h3>';
    const items = Object.entries(state.driverPoints).map(([id,pts])=>{
      const d = DATA.drivers.find(x=>x.id===id) || { name: id };
      return { id, name: d.name, pts };
    }).sort((a,b)=>b.pts-a.pts).slice(0,10);
    items.forEach(it=>{
      const div = document.createElement('div'); div.className='row';
      div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`;
      ds.appendChild(div);
    });

    // Constructor
    const cs = $('constructorStandings'); cs.innerHTML = '<h3>Constructor Standings</h3>';
    const citems = state.teams.map(t=>({ id:t.id, name:t.name, pts: state.constructorPoints[t.id] || 0 }))
      .sort((a,b)=>b.pts-a.pts);
    citems.forEach(it=>{
      const div = document.createElement('div'); div.className='row';
      div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`;
      cs.appendChild(div);
    });
  }

  // Race simulation
  function runRace(){
    if(state.raceIndex >= state.seasonRaces.length) { alert('Season finished. Reset to play again.'); return; }
    const circuit = state.seasonRaces[state.raceIndex];
    // Build list of entries (driver + team)
    const entries = [];
    for(const team of state.teams){
      for(const d of team.drivers){
        // performance = team.baseCar + driver.skill * factor + upgrade effect + circuit difficulty + random
        const upgradeBonus = state.upgradeLevel ? 6 : 0;
        const base = team.baseCar + (d.skill * 0.5) + upgradeBonus;
        // strategy modifies risk
        const strat = team.isPlayer ? state.strategy : (Math.random()<0.5 ? 'balanced' : 'conservative');
        let stratBonus = 0;
        let crashRisk = 0.02;
        if(strat==='aggressive'){ stratBonus = 5; crashRisk = 0.08; }
        if(strat==='conservative'){ stratBonus = -2; crashRisk = 0.01; }
        // circuit difficulty affects spread
        const perf = base + stratBonus - (circuit.difficulty-1)*5 + randn(0,6);
        entries.push({
          driverId: d.id,
          driverName: d.name,
          teamId: team.id,
          teamName: team.name,
          perf,
          crashed: Math.random() < crashRisk * circuit.difficulty
        });
      }
    }

    // Filter retirements and sort
    const finished = entries.filter(e=>!e.crashed).sort((a,b)=>b.perf - a.perf);
    // crashed at the end (sorted best-to-worst among crashers)
    const crashed = entries.filter(e=>e.crashed).sort((a,b)=>b.perf - a.perf);
    const finalOrder = finished.concat(crashed);

    // Assign points
    const results = [];
    for(let i=0;i<finalOrder.length;i++){
      const e = finalOrder[i];
      const pts = (i < DATA.points.length && !e.crashed) ? DATA.points[i] : 0;
      state.driverPoints[e.driverId] = (state.driverPoints[e.driverId]||0) + pts;
      state.constructorPoints[e.teamId] = (state.constructorPoints[e.teamId]||0) + pts;
      results.push({ position: i+1, driverName: e.driverName, teamName: e.teamName, points: pts, crashed: e.crashed });
    }

    // Sponsorship/payout: guard accesses
    const playerTeam = state.teams.find(t=>t.id===state.playerTeamId);
    const winnerTeamName = results.length ? results[0].teamName : null;
    const playerResults = results.find(r=> r.teamName === playerTeam.name );
    const sponsorship = 200000 + (winnerTeamName === playerTeam.name ? 300000 : 0) + (playerResults ? playerResults.points*50000 : 0);
    state.budget += sponsorship;

    state.lastResults = results.slice(0,10);
    state.raceIndex++;
    save();
    renderAll();
  }

  // Helpers
  function randn(mean=0,sd=1){
    // Box-Muller
    let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random();
    return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  // UI actions
  function wire(){
    $('nextRace').addEventListener('click', ()=> {
      runRace();
    });
    $('buyUpgrade').addEventListener('click', ()=> {
      if(state.upgradeLevel){ alert('Upgrade already installed.'); return; }
      if(state.budget < UPGRADE_COST){ alert('Not enough budget.'); return; }
      state.budget -= UPGRADE_COST;
      state.upgradeLevel = 1;
      save(); renderAll();
    });
    $('strategy').addEventListener('change', (e)=> {
      state.strategy = e.target.value;
      save();
    });
    $('reset').addEventListener('click', ()=> {
      if(confirm('Reset season and lose progress?')) {
        newSeason(); save(); renderAll();
      }
    });

    // Delegation for hire/fire buttons
    document.addEventListener('click', (e)=>{
      const hi = e.target.dataset.hire;
      if(hi){
        hireDriver(hi);
        return;
      }
      const fd = e.target.dataset.driver;
      if(fd){
        fireDriver(fd);
        return;
      }
    });
  }

  function hireDriver(driverId){
    // cost is wage * 1000 (simplified)
    const drv = DATA.drivers.find(d=>d.id===driverId);
    if(!drv){ alert('Driver not found'); return; }
    const cost = drv.wage * 1000;
    if(state.budget < cost){ alert('Not enough budget to hire.'); return; }
    const team = state.teams.find(t=>t.id===state.playerTeamId);
    if(team.drivers.length>=2){ alert('You already have 2 drivers. Fire one to hire.'); return; }
    state.budget -= cost;
    team.drivers.push({...drv});
    save(); renderAll();
  }

  function fireDriver(driverId){
    const team = state.teams.find(t=>t.id===state.playerTeamId);
    const idx = team.drivers.findIndex(d=>d.id===driverId);
    if(idx===-1) return;
    if(!confirm(`Fire ${team.drivers[idx].name}?`)) return;
    team.drivers.splice(idx,1);
    save(); renderAll();
  }

  // Boot
  function boot(){
    const saved = load();
    if(saved) state = saved; else newSeason();
    // Apply default strategy to UI (ensure element exists)
    const sel = $('strategy');
    if(sel) sel.value = state.strategy;
    wire();
    renderAll();
  }

  // expose for debugging (optional)
  window._miniF1 = { boot, state, save };

  boot();
})();