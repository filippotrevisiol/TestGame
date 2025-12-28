// app.js — ensures a fresh season and start-screen team selection on every page load
(function(){
  const $ = id => document.getElementById(id);
  const formatK = k => `$${(k/1000).toFixed(0)}k`;
  const UPGRADE_COST = 500000;
  let state = null;

  function buildTeamsFromData(){
    if(!DATA || !DATA.teams || !DATA.drivers) return [];
    const drvMap = Object.fromEntries((DATA.drivers||[]).map(d=>[d.id, {...d}]));
    return (DATA.teams||[]).map(t=>({
      id: t.id,
      name: t.name,
      downforce: t.downforce ?? Math.round(Math.random()*100),
      enginePower: t.enginePower ?? Math.round(Math.random()*100),
      reliability: t.reliability ?? Math.round(Math.random()*100),
      baseCar: t.baseCar ?? 70 + Math.floor(Math.random()*10),
      budget: t.budget ?? 2000000,
      drivers: (t.drivers||[]).map(did => drvMap[did] ? {...drvMap[did]} : { id: did, name: did })
    }));
  }

  function newSeason(){
    const teams = buildTeamsFromData();
    state = {
      teams,
      playerTeamId: null,
      raceIndex: 0,
      strategy: 'balanced',
      seasonRaces: (DATA.circuits||[]).slice(0).map((c,i)=>({ ...c, round: i+1 })),
      driverPoints: {},
      constructorPoints: {},
      lastResults: null
    };
    for(const d of (DATA.drivers||[])) state.driverPoints[d.id] = 0;
    for(const t of state.teams) state.constructorPoints[t.id] = 0;
    save();
  }

  function save(){ try{ localStorage.setItem('miniF1', JSON.stringify(state)); }catch(e){} }
  function load(){ try{ const s = localStorage.getItem('miniF1'); return s?JSON.parse(s):null }catch(e){ return null } }

  function renderTeamList(){ const container = $('teamList'); container.innerHTML=''; for(const t of state.teams){ const btn = document.createElement('button'); btn.type = 'button'; btn.className='team-card'; btn.dataset.selectTeam = t.id; btn.innerHTML = `<strong>${t.name}</strong><div class="small">Downf: ${t.downforce} · Pwr: ${t.enginePower} · Rel: ${t.reliability}</div>`; btn.addEventListener('click', ()=> selectTeam(t.id)); container.appendChild(btn); } }

  function selectTeam(teamId){ state.playerTeamId = teamId; const team = state.teams.find(t=>t.id===teamId); if(!team){ alert('Team not found'); return; } team.budget = team.budget || 2000000; save(); hideStartScreen(); renderAll(); }

  function renderAll(){ const playerTeam = state.teams.find(t=>t.id===state.playerTeamId) || { name: 'No team chosen', drivers: [] };
    $('teamName').textContent = playerTeam.name;
    const teamBudget = playerTeam.budget != null ? playerTeam.budget : 0; $('budget').textContent = `Budget: ${formatK(teamBudget)}`;
    const teamStatsEl = document.getElementById('teamStats'); if(teamStatsEl){ if(playerTeam && playerTeam.id){ teamStatsEl.innerHTML = `<div class="driver"><strong>${playerTeam.name}</strong><div class="small">Downforce: ${playerTeam.downforce} · Power: ${playerTeam.enginePower} · Reliability: ${playerTeam.reliability}</div></div>`; } else { teamStatsEl.innerHTML = `<div class="small">Choose a team to manage</div>`; } }
    $('upgradeStatus').textContent = `Upgrade level: ${(playerTeam && playerTeam.upgradeLevel) ? 'Installed' : 'None'}`;
    $('seasonInfo').textContent = `Race ${Math.min(state.raceIndex+1, state.seasonRaces.length)}/${state.seasonRaces.length}`;
    const dl = $('driversList'); dl.innerHTML = ''; (playerTeam.drivers||[]).forEach(d=>{ const div = document.createElement('div'); div.className='driver'; div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill||'-'}</span></div>`; dl.appendChild(div); });
    const used = new Set(state.teams.flatMap(t=>t.drivers.map(d=>d.id)));
    const av = $('availableDrivers'); av.innerHTML = '';
    (DATA.drivers||[]).filter(d=>!used.has(d.id)).forEach(d=>{ const div = document.createElement('div'); div.className='driver'; div.innerHTML = `<div><strong>${d.name}</strong> <span class="small">skill:${d.skill} wage:${formatK(d.wage*1000)}</span></div>`; av.appendChild(div); });
    const rl = $('raceList'); rl.innerHTML = '';
    (state.seasonRaces||[]).forEach((r,i)=>{ const div = document.createElement('div'); div.className='race'; div.innerHTML = `<div>Round ${r.round}: ${r.name}</div><div>${i < state.raceIndex ? 'Done' : (i===state.raceIndex ? 'Upcoming' : 'Pending')}</div>`; rl.appendChild(div); });
    const lr = $('lastResults'); lr.innerHTML = '';
    if(state.lastResults){ const table = document.createElement('div'); table.className = 'table'; state.lastResults.forEach((row, idx)=>{ const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<div>#${idx+1} ${row.driverName} (${row.teamName})</div><div class="small">${row.points} pts${row.crashed ? ' (ret)' : ''}</div>`; table.appendChild(r); }); lr.appendChild(table); } else lr.textContent = 'No races yet';
    renderStandings(); }

  function renderStandings(){ const ds = $('driverStandings'); ds.innerHTML = '<h3>Driver Standings</h3>'; const items = Object.entries(state.driverPoints).map(([id,pts])=>{ const d = (DATA.drivers||[]).find(x=>x.id===id) || { name: id }; return { id, name: d.name, pts }; }).sort((a,b)=>b.pts-a.pts).slice(0,10); items.forEach(it=>{ const div = document.createElement('div'); div.className='row'; div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`; ds.appendChild(div); }); const cs = $('constructorStandings'); cs.innerHTML = '<h3>Constructor Standings</h3>'; const citems = state.teams.map(t=>({ id:t.id, name:t.name, pts: state.constructorPoints[t.id] || 0 })).sort((a,b)=>b.pts-a.pts); citems.forEach(it=>{ const div = document.createElement('div'); div.className='row'; div.innerHTML = `<div>${it.name}</div><div class="small">${it.pts} pts</div>`; cs.appendChild(div); }); }

  function runRace(){ if(!state.playerTeamId){ alert('Please choose a team before racing.'); showStartScreen(); return } if(state.raceIndex >= state.seasonRaces.length){ alert('Season finished. Reset to play again.'); return } const circuit = state.seasonRaces[state.raceIndex]; const entries = []; for(const team of state.teams){ for(const d of team.drivers){ const engineBonus = (team.enginePower - 50) * 0.12; const downforceBias = (circuit.downforceFavor || (circuit.difficulty - 1)) || 0; const downforceBonus = (team.downforce - 50) * 0.10 * (1 + downforceBias); const upgradeBonus = team.upgradeLevel ? 6 : 0; const base = (team.baseCar||70) + (d.skill||75)*0.5 + engineBonus + downforceBonus + upgradeBonus; const strat = (team.id === state.playerTeamId) ? state.strategy : (Math.random()<0.5 ? 'balanced' : 'conservative'); let stratBonus = 0, crashRisk = 0.02; if(strat==='aggressive'){ stratBonus = 5; crashRisk = 0.08; } if(strat==='conservative'){ stratBonus = -2; crashRisk = 0.01; } const perf = base + stratBonus - (circuit.difficulty - 1) * 5 + randn(0,6); const crashed = Math.random() < crashRisk * circuit.difficulty * (1 + (1 - (team.reliability||75)/100)); entries.push({ driverId: d.id, driverName: d.name, teamId: team.id, teamName: team.name, perf, crashed }); } } const finished = entries.filter(e=>!e.crashed).sort((a,b)=>b.perf - a.perf); const crashed = entries.filter(e=>e.crashed).sort((a,b)=>b.perf - a.perf); const finalOrder = finished.concat(crashed); const results = []; for(let i=0;i<finalOrder.length;i++){ const e = finalOrder[i]; const pts = (i < (DATA.points||[]).length && !e.crashed) ? DATA.points[i] : 0; state.driverPoints[e.driverId] = (state.driverPoints[e.driverId]||0) + pts; state.constructorPoints[e.teamId] = (state.constructorPoints[e.teamId]||0) + pts; results.push({ position: i+1, driverName: e.driverName, teamName: e.teamName, points: pts, crashed: e.crashed }); } const playerTeam = state.teams.find(t=>t.id===state.playerTeamId); const winnerTeamName = results.length ? results[0].teamName : null; const playerResults = results.find(r=> r.teamName === playerTeam.name ); const sponsorship = 200000 + (winnerTeamName === playerTeam.name ? 300000 : 0) + (playerResults ? playerResults.points*50000 : 0); playerTeam.budget = (playerTeam.budget||0) + sponsorship; state.lastResults = results.slice(0,10); state.raceIndex++; save(); renderAll(); }

  function randn(mean=0,sd=1){ let u=0,v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random(); return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

  function wire(){ const next = $('nextRace'); if(next) next.addEventListener('click', ()=> runRace()); const buy = $('buyUpgrade'); if(buy) buy.addEventListener('click', ()=>{ const team = state.teams.find(t=>t.id===state.playerTeamId); if(!team){ alert('Choose a team first'); showStartScreen(); return; } if(team.upgradeLevel){ alert('Upgrade already installed.'); return; } if(team.budget < UPGRADE_COST){ alert('Not enough budget.'); return; } team.budget -= UPGRADE_COST; team.upgradeLevel = 1; save(); renderAll(); }); const strat = $('strategy'); if(strat) strat.addEventListener('change', (e)=>{ state.strategy = e.target.value; save(); }); const reset = $('reset'); if(reset) reset.addEventListener('click', ()=>{ if(confirm('Reset season and lose progress?')){ newSeason(); save(); renderAll(); showStartScreen(); } }); const changeBtn = $('changeTeam'); if(changeBtn) changeBtn.addEventListener('click', ()=>{ newSeason(); save(); renderAll(); showStartScreen(); }); }

  function showStartScreen(){ document.body.classList.add('noscroll'); $('startScreen').classList.remove('hidden'); $('appWrapper').classList.add('hidden'); renderTeamList(); // focus first team for keyboard users
    const first = document.querySelector('#teamList .team-card'); if(first) first.focus(); }
  function hideStartScreen(){ document.body.classList.remove('noscroll'); $('startScreen').classList.add('hidden'); $('appWrapper').classList.remove('hidden'); // focus a sensible control in the main UI
    const next = document.getElementById('nextRace'); if(next) next.focus(); }

  function boot(){ // always restart the season on load
    try{ localStorage.removeItem('miniF1'); }catch(e){}
    newSeason();
    wire();
    showStartScreen();
  }

  window._miniF1 = { boot, getState: ()=>state, save, runRace };
  boot();
})();