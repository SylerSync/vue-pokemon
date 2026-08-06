const BASE = 'https://pokeapi.co/api/v2/'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const getIndex   = () => get('/pokemon?limit=100000')
export const getPokemon = (name) => get(`/pokemon/${name}`)
export const getSpecies = (name) => get(`/pokemon-species/${name}`)