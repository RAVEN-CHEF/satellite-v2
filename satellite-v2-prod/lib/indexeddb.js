import { openDB } from 'idb'

const DB_NAME    = 'satellite-offline'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending_checkins')) {
        db.createObjectStore('pending_checkins', { keyPath: 'localId', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('pending_firmas')) {
        db.createObjectStore('pending_firmas', { keyPath: 'localId', autoIncrement: true })
      }
    },
  })
}

export async function savePendingCheckin(data) {
  const db = await getDB()
  return db.add('pending_checkins', { ...data, synced: false, ts: Date.now() })
}
export async function getPendingCheckins() {
  const db = await getDB()
  return db.getAll('pending_checkins')
}
export async function deletePendingCheckin(localId) {
  const db = await getDB()
  return db.delete('pending_checkins', localId)
}
export async function savePendingFirma(data) {
  const db = await getDB()
  return db.add('pending_firmas', { ...data, synced: false, ts: Date.now() })
}
export async function getPendingFirmas() {
  const db = await getDB()
  return db.getAll('pending_firmas')
}
export async function deletePendingFirma(localId) {
  const db = await getDB()
  return db.delete('pending_firmas', localId)
}
