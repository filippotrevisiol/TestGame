// race.js — handles race simulation logic
(function(){
  function randn(mean=0,sd=1){
    let u=0,v=0;
    while(u===0) u=Math.random();
    while(v===0) v=Math.random();
    return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  window.runQualifying = function(state, circuit){
    const entries = [];
    for(const team of state.teams){
      for(const d of team.drivers){
        const engineBonus = (team.enginePower - 50) * 0.12;
        const downforceBias = (circuit.downforceFavor || (circuit.difficulty - 1)) || 0;
        const downforceBonus = (team.downforce - 50) * 0.10 * (1 + downforceBias);
        const upgradeBonus = team.upgradeLevel ? 6 : 0;
        const base = (team.baseCar||70) + (team.qualifying||75)*0.5 + engineBonus + downforceBonus + upgradeBonus;
        const perf = base - (circuit.difficulty - 1) * 5 + randn(0,6);
        entries.push({ driverId: d.id, teamId: team.id, perf });
      }
    }
    entries.sort((a,b)=>b.perf - a.perf);
    const results = [];
    for(let i=0;i<entries.length;i++){
      results.push({ driverId: entries[i].driverId, teamId: entries[i].teamId, position: i+1 });
    }
    return results;
  };

  window.runRace = function(state, renderAll, save, showStartScreen, showSeasonEnd){
    if(!state.playerTeamId){
      alert('Please choose a team before racing.');
      showStartScreen();
      return;
    }
    if(state.raceIndex >= state.seasonRaces.length){
      showSeasonEnd();
      return;
    }
    const circuit = state.seasonRaces[state.raceIndex];
    const qualResults = runQualifying(state, circuit);
    const qualPositions = Object.fromEntries(qualResults.map(r=>[r.driverId, r.position]));
    const entries = [];
    for(const team of state.teams){
      for(const d of team.drivers){
        const engineBonus = (team.enginePower - 50) * 0.12;
        const downforceBias = (circuit.downforceFavor || (circuit.difficulty - 1)) || 0;
        const downforceBonus = (team.downforce - 50) * 0.10 * (1 + downforceBias);
        const upgradeBonus = team.upgradeLevel ? 6 : 0;
        const base = (team.baseCar||70) + (d.skill||75)*0.5 + engineBonus + downforceBonus + upgradeBonus;
        const strat = (team.id === state.playerTeamId) ? state.strategy : (Math.random()<0.5 ? 'balanced' : 'conservative');
        let stratBonus = 0, crashRisk = 0.02;
        if(strat==='aggressive'){
          stratBonus = 5;
          crashRisk = 0.08;
        }
        if(strat==='conservative'){
          stratBonus = -2;
          crashRisk = 0.01;
        }
        const qualPos = qualPositions[d.id];
        const qualBonus = qualPos <= 10 ? [20,18,16,14,12,10,8,6,4,2][qualPos-1] : 0;
        const perf = base + stratBonus + qualBonus - (circuit.difficulty - 1) * 5 + randn(0,6);
        const crashed = Math.random() < crashRisk * circuit.difficulty * (1 + (1 - (team.reliability||75)/100));
        entries.push({ driverId: d.id, driverName: d.name, teamId: team.id, teamName: team.name, perf, crashed });
      }
    }
    const finished = entries.filter(e=>!e.crashed).sort((a,b)=>b.perf - a.perf);
    const crashed = entries.filter(e=>e.crashed).sort((a,b)=>b.perf - a.perf);
    const finalOrder = finished.concat(crashed);
    const results = [];
    for(let i=0;i<finalOrder.length;i++){
      const e = finalOrder[i];
      const pts = (i < (DATA.points||[]).length && !e.crashed) ? DATA.points[i] : 0;
      state.driverPoints[e.driverId] = (state.driverPoints[e.driverId]||0) + pts;
      state.constructorPoints[e.teamId] = (state.constructorPoints[e.teamId]||0) + pts;
      results.push({ position: i+1, driverName: e.driverName, teamName: e.teamName, points: pts, crashed: e.crashed });
    }
    // Store pole and winner
    const poleResult = qualResults[0];
    const winnerResult = results[0];
    const poleDriver = (DATA.drivers||[]).find(d=>d.id===poleResult.driverId) || { name: poleResult.driverId };
    const winnerDriver = (DATA.drivers||[]).find(d=>d.id===finalOrder[0].driverId) || { name: finalOrder[0].driverId };
    const poleTeam = state.teams.find(t=>t.id===poleResult.teamId);
    state.seasonRaces[state.raceIndex].poleDriver = poleDriver.name;
    state.seasonRaces[state.raceIndex].poleTeam = poleTeam ? poleTeam.name : poleResult.teamId;
    state.seasonRaces[state.raceIndex].winnerDriver = winnerDriver.name;
    state.seasonRaces[state.raceIndex].winnerTeam = finalOrder[0].teamName;
    const playerTeam = state.teams.find(t=>t.id===state.playerTeamId);
    const winnerTeamName = results.length ? results[0].teamName : null;
    const playerResults = results.find(r=> r.teamName === playerTeam.name );
    const sponsorship = 200000 + (winnerTeamName === playerTeam.name ? 300000 : 0) + (playerResults ? playerResults.points*50000 : 0);
    playerTeam.budget = (playerTeam.budget||0) + sponsorship;
    state.lastResults = results;
    state.raceIndex++;
    save();
    renderAll();
  };
})();