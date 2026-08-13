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