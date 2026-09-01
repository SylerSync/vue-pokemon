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
export const getInventory = (email) => get(`inventory/${email}`)
export const buyItem = (email, itemId, quantity) => post('inventory/buyItem', {email, itemId, quantity})
export const useIten = (email, itemId, quantity) => post('inventory/useItem', {email, itemId, quantity})
export const addItem = (email, itemId, quantity) => post('inventory/addItem', {email, itemId, quantity})
export const addFunds = (email, amount) => post(`addFunds/${email}/${amount}`)
export const getAllItems = () => get('item') // Get full item catalog