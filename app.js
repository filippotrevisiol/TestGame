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
      qualifying: t.qualifying ?? Math.round(Math.random()*100),
      baseCar: t.baseCar ?? 70 + Math.floor(Math.random()*10),
      budget: t.budget ?? 2000000,
      drivers: (t.drivers||[]).map(did => drvMap[did] ? {...drvMap[did]} : { id: did, name: did })
    }));
  }

  function newSeason(){
    const teams = buildTeamsFromData();
    state = {
      teams,
      playerTeamId: state ? state.playerTeamId : null,
      raceIndex: 0,
      strategy: 'balanced',
      currentYear: (state && state.currentYear) ? state.currentYear + 1 : 2025,
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
    $('seasonInfoBar').textContent = `Season ${state.currentYear} - Race ${Math.min(state.raceIndex+1, state.seasonRaces.length)}/${state.seasonRaces.length}`;
    // top bar logo + standings
    renderTopBar();
    $('upgradeStatus').textContent = `Upgrade level: ${(playerTeam && playerTeam.upgradeLevel) ? 'Installed' : 'None'}`;
    $('seasonInfoBar').textContent = `Race ${Math.min(state.raceIndex+1, state.seasonRaces.length)}/${state.seasonRaces.length}`;
    const rl = $('raceList'); rl.innerHTML = '';
    (state.seasonRaces||[]).forEach((r,i)=>{ const div = document.createElement('div'); div.className='race'; let content = `<div>Round ${r.round}: ${r.name}</div>`; if(i < state.raceIndex){ content += `<div class="small">Pole: ${r.poleDriver} (${r.poleTeam})<br>Winner: ${r.winnerDriver} (${r.winnerTeam})</div>`; } else { content += `<div>${i === state.raceIndex ? 'Upcoming' : 'Pending'}</div>`; } div.innerHTML = content; rl.appendChild(div); });
    const lr = $('lastResults'); lr.innerHTML = '';
    if(state.lastResults){ const table = document.createElement('div'); table.className = 'table'; state.lastResults.forEach((row, idx)=>{ const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<div>#${idx+1} ${row.driverName} (${row.teamName})</div><div class="small">${row.points} pts${row.crashed ? ' (ret)' : ''}</div>`; table.appendChild(r); }); lr.appendChild(table); } else lr.textContent = 'No races yet';
    renderStandings(); }

  function renderTopBar(){ const logo = $('teamLogo'); const nameBar = $('teamNameBar'); const dStand = $('topDriverStandings'); const cStand = $('topConstructorStandings'); const playerTeam = state.teams.find(t=>t.id===state.playerTeamId) || null; if(logo){ if(playerTeam){ logo.style.backgroundImage = `url('teams/${playerTeam.id}.png')`; logo.style.backgroundSize = 'cover'; nameBar.textContent = playerTeam.name; } else { logo.style.backgroundImage = ''; nameBar.textContent = ''; } }
    // Top drivers (3)
    if(dStand){ const items = Object.entries(state.driverPoints).map(([id,pts])=>{ const d = (DATA.drivers||[]).find(x=>x.id===id) || { name: id }; return { id, name: d.name, pts }; }).sort((a,b)=>b.pts-a.pts).slice(0,3); dStand.innerHTML = `<strong>Top drivers</strong><div class="small">${items.map(i=>`${i.name} (${i.pts})`).join(' · ')}</div>`; }
    if(cStand){ const citems = state.teams.map(t=>({ id:t.id, name:t.name, pts: state.constructorPoints[t.id]||0 })).sort((a,b)=>b.pts-a.pts).slice(0,3); cStand.innerHTML = `<strong>Top teams</strong><div class="small">${citems.map(i=>`${i.name} (${i.pts})`).join(' · ')}</div>`; } }

  function getInitials(name){ if(!name) return ''; const parts = name.split(/\s|\-|_/).filter(Boolean); if(parts.length===1) return parts[0].slice(0,2).toUpperCase(); return (parts[0][0]+parts[1][0]).toUpperCase(); }

  function renderStandings(){ const ds = $('driverStandings'); ds.innerHTML = '<h3>Driver Standings</h3>'; const items = Object.entries(state.driverPoints).map(([id,pts])=>{ const d = (DATA.drivers||[]).find(x=>x.id===id) || { name: id }; const team = state.teams.find(t => t.drivers.some(dr => dr.id === id)); return { id: team ? team.id : id, name: d.name, pts }; }).sort((a,b)=>b.pts-a.pts); items.forEach((it, idx)=>{ const div = document.createElement('div'); div.className='row'; div.innerHTML = `<div style="display:flex; align-items:center;"><span>${idx+1}. </span><img src="teams/${it.id}.png" alt="${it.name} logo" style="width:24px; height:24px; margin:0 8px;"><span>${it.name}</span></div><div class="small">${it.pts} pts</div>`; ds.appendChild(div); }); const cs = $('constructorStandings'); cs.innerHTML = '<h3>Constructor Standings</h3>'; const citems = state.teams.map(t=>({ id:t.id, name:t.name, pts: state.constructorPoints[t.id] || 0 })).sort((a,b)=>b.pts-a.pts); citems.forEach((it, idx)=>{ const div = document.createElement('div'); div.className='row'; div.innerHTML = `<div style="display:flex; align-items:center;"><span>${idx+1}. </span><img src="teams/${it.id}.png" alt="${it.name} logo" style="width:24px; height:24px; margin:0 8px;"><span>${it.name}</span></div><div class="small">${it.pts} pts</div>`; cs.appendChild(div); }); }

  function showSeasonEnd(){
    if (state.raceIndex < state.seasonRaces.length) return; // Only show if season completed
    const year = state.currentYear;
    $('seasonTitle').textContent = `Season ${year} Finished!`;
    const driverChamp = Object.entries(state.driverPoints).map(([id,pts])=>{ const d = (DATA.drivers||[]).find(x=>x.id===id) || { name: id }; return { name: d.name, pts }; }).sort((a,b)=>b.pts-a.pts)[0];
    const teamChamp = state.teams.map(t=>({ name: t.name, pts: state.constructorPoints[t.id] || 0 })).sort((a,b)=>b.pts-a.pts)[0];
    const top3Drivers = Object.entries(state.driverPoints).map(([id,pts])=>{ const d = (DATA.drivers||[]).find(x=>x.id===id) || { name: id }; return { name: d.name, pts }; }).sort((a,b)=>b.pts-a.pts).slice(0,3);
    const top3Teams = state.teams.map(t=>({ name: t.name, pts: state.constructorPoints[t.id] || 0 })).sort((a,b)=>b.pts-a.pts).slice(0,3);
    $('champions').innerHTML = `
      <h3>World Champion Driver: ${driverChamp.name} (${driverChamp.pts} pts)</h3>
      <h3>World Champion Constructor: ${teamChamp.name} (${teamChamp.pts} pts)</h3>
      <h4>Top 3 Drivers:</h4>
      <ol>
        ${top3Drivers.map(d => `<li>${d.name} (${d.pts} pts)</li>`).join('')}
      </ol>
      <h4>Top 3 Constructors:</h4>
      <ol>
        ${top3Teams.map(t => `<li>${t.name} (${t.pts} pts)</li>`).join('')}
      </ol>
    `;
    $('nextSeasonBtn').textContent = `Next Season (${year + 1})`;
    $('seasonEndPopup').style.display = 'flex';
  }

  function hideSeasonEnd(){
    $('seasonEndPopup').style.display = 'none';
    newSeason();
    renderAll();
  }





  function wire(){
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(tab + '-tab').classList.add('active');
    }));

    const next = $('nextRace'); if(next) next.addEventListener('click', ()=> window.runRace(state, renderAll, save, showStartScreen, showSeasonEnd));
    const nextSeasonBtn = $('nextSeasonBtn'); if(nextSeasonBtn) nextSeasonBtn.addEventListener('click', hideSeasonEnd); const buy = $('buyUpgrade'); if(buy) buy.addEventListener('click', ()=>{ const team = state.teams.find(t=>t.id===state.playerTeamId); if(!team){ alert('Choose a team first'); showStartScreen(); return; } if(team.upgradeLevel){ alert('Upgrade already installed.'); return; } if(team.budget < UPGRADE_COST){ alert('Not enough budget.'); return; } team.budget -= UPGRADE_COST; team.upgradeLevel = 1; save(); renderAll(); }); const strat = $('strategy'); if(strat) strat.addEventListener('change', (e)=>{ state.strategy = e.target.value; save(); }); const reset = $('reset'); if(reset) reset.addEventListener('click', ()=>{ if(confirm('Reset season and lose progress?')){ newSeason(); save(); renderAll(); showStartScreen(); } }); const changeBtn = $('changeTeam'); if(changeBtn) changeBtn.addEventListener('click', ()=>{ newSeason(); save(); renderAll(); showStartScreen(); }); }

  function showStartScreen(){ document.body.classList.add('noscroll'); $('startScreen').classList.remove('hidden'); $('appWrapper').classList.add('hidden'); $('seasonEndPopup').style.display = 'none'; renderTeamList(); const first = document.querySelector('#teamList .team-card'); if(first) first.focus(); }
  function hideStartScreen(){ document.body.classList.remove('noscroll'); $('startScreen').classList.add('hidden'); $('startScreen').style.display = 'none'; $('appWrapper').classList.remove('hidden'); const next = document.getElementById('nextRace'); if(next) next.focus(); }

  function boot(){ try{ localStorage.removeItem('miniF1'); }catch(e){} newSeason(); wire(); $('seasonEndPopup').style.display = 'none'; showStartScreen(); }

  window._miniF1 = { boot, getState: ()=>state, save, runRace: () => window.runRace(state, renderAll, save, showStartScreen, showSeasonEnd) };
  boot();
})();
