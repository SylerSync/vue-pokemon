const BASE = '/api/'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
    }
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

const get = (path) => request(path)

const post = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const getIndex = () => get('pokemon')
export const login = (email, password) => post('user/authenticate', {email, password})
export const addToWishList = (pokemonName, user) => post('user/newWishList', {pokemonName, user})
export const removeFromWishList = (pokemonName, user) => post('user/removeWishList', {pokemonName, user})