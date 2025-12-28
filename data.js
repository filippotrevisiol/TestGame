// 2025 season data: drivers, circuits, points
const DATA = {
  points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  drivers: [
    { id: 'verstappen', name: 'Max Verstappen', number: 1, skill: 99, wage: 800 },
    { id: 'hamilton', name: 'Lewis Hamilton', number: 44, skill: 98, wage: 780 },
    { id: 'leclerc', name: 'Charles Leclerc', number: 16, skill: 97, wage: 760 },
    { id: 'piastri', name: 'Oscar Piastri', number: 81, skill: 96, wage: 740 },
    { id: 'norris', name: 'Lando Norris', number: 4, skill: 95, wage: 720 },
    { id: 'alonso', name: 'Fernando Alonso', number: 14, skill: 94, wage: 700 },
    { id: 'russell', name: 'George Russell', number: 63, skill: 93, wage: 680 },
    { id: 'sainz', name: 'Carlos Sainz', number: 55, skill: 92, wage: 660 },
    { id: 'gasly', name: 'Pierre Gasly', number: 10, skill: 90, wage: 620 },
    { id: 'hulkenberg', name: 'Nico Hülkenberg', number: 27, skill: 89, wage: 600 },
    { id: 'stroll', name: 'Lance Stroll', number: 18, skill: 88, wage: 580 },
    { id: 'ocon', name: 'Esteban Ocon', number: 31, skill: 87, wage: 560 },
    { id: 'albon', name: 'Alexander Albon', number: 23, skill: 86, wage: 540 },
    { id: 'antonelli', name: 'Andrea Kimi Antonelli', number: 12, skill: 83, wage: 420 },
    { id: 'bearman', name: 'Oliver Bearman', number: 87, skill: 84, wage: 440 },
    { id: 'bortoleto', name: 'Gabriel Bortoleto', number: 65, skill: 82, wage: 400 },
    { id: 'colapinto', name: 'Franco Colapinto', number: 7, skill: 80, wage: 380 },
    { id: 'tsunoda', name: 'Yuki Tsunoda', number: 22, skill: 81, wage: 400 },
    { id: 'lawson', name: 'Liam Lawson', number: 30, skill: 79, wage: 360 },
    { id: 'hadjar', name: 'Isack Hadjar', number: 6, skill: 78, wage: 340 }
  ],
  // Full 2025 calendar in order (difficulty is a small game-heuristic value)
  circuits: [
    { id: 'australia', name: 'Melbourne (Albert Park)', difficulty: 0.95 },
    { id: 'china', name: 'Shanghai International Circuit', difficulty: 0.94 },
    { id: 'japan', name: 'Suzuka Circuit', difficulty: 1.05 },
    { id: 'bahrain', name: 'Bahrain International Circuit (Sakhir)', difficulty: 0.9 },
    { id: 'saudiarabia', name: 'Jeddah Corniche Circuit', difficulty: 1.02 },
    { id: 'miami', name: 'Miami International Autodrome', difficulty: 0.96 },
    { id: 'emiliaromagna', name: 'Imola (Autodromo Enzo e Dino Ferrari)', difficulty: 1.0 },
    { id: 'monaco', name: 'Circuit de Monaco', difficulty: 1.12 },
    { id: 'spain', name: 'Circuit de Barcelona-Catalunya', difficulty: 0.98 },
    { id: 'canada', name: 'Circuit Gilles Villeneuve (Montreal)', difficulty: 1.0 },
    { id: 'austria', name: 'Red Bull Ring (Spielberg)', difficulty: 0.92 },
    { id: 'britain', name: 'Silverstone Circuit', difficulty: 0.97 },
    { id: 'belgium', name: 'Circuit de Spa-Francorchamps', difficulty: 1.06 },
    { id: 'hungary', name: 'Hungaroring', difficulty: 0.99 },
    { id: 'netherlands', name: 'Circuit Zandvoort', difficulty: 0.98 },
    { id: 'italy', name: 'Autodromo Nazionale Monza', difficulty: 0.9 },
    { id: 'azerbaijan', name: 'Baku City Circuit', difficulty: 1.08 },
    { id: 'singapore', name: 'Marina Bay Street Circuit', difficulty: 1.05 },
    { id: 'usa', name: 'Circuit of the Americas (Austin)', difficulty: 0.97 },
    { id: 'mexico', name: 'Autódromo Hermanos Rodríguez (Mexico City)', difficulty: 0.95 },
    { id: 'saopaulo', name: 'Autódromo José Carlos Pace (Interlagos)', difficulty: 1.0 },
    { id: 'lasvegas', name: 'Las Vegas Strip Circuit', difficulty: 1.03 },
    { id: 'qatar', name: 'Losail International Circuit', difficulty: 1.02 },
    { id: 'abudhabi', name: 'Yas Marina Circuit (Abu Dhabi)', difficulty: 0.96 }
  ]
};

// Export for other modules (optional)
if(typeof module !== 'undefined' && module.exports) module.exports = { DATA };