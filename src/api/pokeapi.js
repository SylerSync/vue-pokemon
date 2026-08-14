const BASE = 'https://pokeapi.co/api/v2'

// makes an api call using the provided path and foutputs the result formatted into json
async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const getIndex   = () => get('/pokemon?limit=100000')
export const getPokemon = (name) => get(`/pokemon/${name}`)
export const getSpecies = (name) => get(`/pokemon-species/${name}`)
export const getPokemonByGen    = (generation) => get(`/generation/${generation}`)
export const getMove = (index) => get(`/move/${index}`)
export const getEvoChain = (index) => get(`/evolution-chain/${index}`)

export async function fetchTrainerTeam(roster) {
  const teamPromises = roster.map(async (member) => {
    // 1. Fetch base pokemon data from PokeAPI
    const basePokemon = await getPokemon(member.name);
    
    // 2. Scale stats based on requested level
    const level = member.level || 50;
    const stats = basePokemon.stats.map(s => ({
      name: s.stat.name,
      base_stat: s.base_stat,
      stat: Math.floor(((2 * s.base_stat) * level) / 100) + (s.stat.name === 'hp' ? level + 10 : 5)
    }));

    const hpStat = stats.find(s => s.name === 'hp').stat;

    // 3. Fetch full move details for the first 4 moves in parallel
    const movePromises = basePokemon.moves.slice(0, 4).map(async (m) => {
      try {
        const moveData = await getMove(m.move.name);
        return {
          name: m.move.name,
          type: moveData.type?.name || 'normal',
          class: moveData.damage_class?.name || 'physical', // 'physical', 'special', or 'status'
          power: moveData.power || 0,
          accuracy: moveData.accuracy || 100,
          pp: moveData.pp || 15
        };
      } catch (error) {
        console.error(`Failed to fetch details for move ${m.move.name}:`, error);
        return {
          name: m.move.name,
          type: 'normal',
          class: 'physical',
          power: 50,
          accuracy: 100,
          pp: 15
        };
      }
    });

    const moves = await Promise.all(movePromises);

    // 4. Construct battle-ready Pokémon object
    return {
      id: basePokemon.id,
      name: basePokemon.name,
      level: level,
      totalHp: hpStat,
      currentHp: hpStat,
      types: basePokemon.types.map(t => t.type.name),
      sprite: basePokemon.sprites.front_default,
      backSprite: basePokemon.sprites.back_default,
      cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${basePokemon.id}.ogg`,
      instanceId: crypto.randomUUID(),
      stats: stats,
      moves: moves
    };
  });

  return await Promise.all(teamPromises);
}