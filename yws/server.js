#!/usr/bin/env node
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import pg from 'pg'

const BACKEND_URL = process.env.BACKEND_URL || 'http://escreveaqui-backend:8080'
const DATABASE_URL = process.env.DATABASE_URL || ''
const HOST = process.env.HOST || '::'
const PORT = parseInt(process.env.PORT || '1234', 10)
const SAVE_DEBOUNCE_MS = parseInt(process.env.SAVE_DEBOUNCE_MS || '3000', 10)
const VERSION = '1.2.1'

const MSG_SYNC = 0
const MSG_AWARENESS = 1

const docs = new Map()
const saveTimers = new Map()
const roomTokens = new Map()

class Room {
  constructor(name) {
    this.name = name
    this.doc = new Y.Doc()
    this.awareness = new awarenessProtocol.Awareness(this.doc)
    this.conns = new Map()
    this.loaded = false
    this._loadPromise = null
    this.lastSavedContent = null

    this.awareness.on('update', ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed)
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn)
        if (connControlledIDs) {
          added.forEach((id) => connControlledIDs.add(id))
          removed.forEach((id) => connControlledIDs.delete(id))
        }
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MSG_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      )
      const msg = encoding.toUint8Array(encoder)
      this.conns.forEach((_, c) => send(c, msg))
    })

    this.doc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MSG_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      const msg = encoding.toUint8Array(encoder)
      this.conns.forEach((_, c) => {
        if (c !== origin) send(c, msg)
      })
      if (origin !== 'external') {
        this._debouncedSave()
      }
    })
  }

  async load() {
    if (this.loaded) return
    if (this._loadPromise) return this._loadPromise
    this._loadPromise = this._doLoad()
    return this._loadPromise
  }

  async _doLoad() {
    try {
      const content = await fetchNoteContent(this.name, roomTokens.get(this.name))
      if (content) {
        const ytext = this.doc.getText('content')
        this.doc.transact(() => {
          ytext.insert(0, content)
        })
      }
      this.lastSavedContent = content || ''
    } catch (err) {
      console.error(`[load] ${this.name}: ${err.message}`)
      this.lastSavedContent = ''
    }
    this.loaded = true
  }

  applyExternalContent(newContent) {
    const ytext = this.doc.getText('content')
    const current = ytext.toString()
    if (newContent === current) return
    this.lastSavedContent = newContent
    this.doc.transact(() => {
      ytext.delete(0, ytext.length)
      if (newContent) ytext.insert(0, newContent)
    }, 'external')
  }

  _debouncedSave() {
    if (saveTimers.has(this.name)) clearTimeout(saveTimers.get(this.name))
    saveTimers.set(
      this.name,
      setTimeout(() => {
        saveTimers.delete(this.name)
        const text = this.doc.getText('content').toString()
        this.lastSavedContent = text
        saveNoteContent(this.name, text)
      }, SAVE_DEBOUNCE_MS)
    )
  }

  addConn(conn) {
    this.conns.set(conn, new Set())
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_SYNC)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    send(conn, encoding.toUint8Array(encoder))

    const awarenessStates = this.awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder2 = encoding.createEncoder()
      encoding.writeVarUint(encoder2, MSG_AWARENESS)
      encoding.writeVarUint8Array(
        encoder2,
        awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          Array.from(awarenessStates.keys())
        )
      )
      send(conn, encoding.toUint8Array(encoder2))
    }
  }

  removeConn(conn) {
    const controlledIDs = this.conns.get(conn)
    this.conns.delete(conn)
    if (controlledIDs) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        Array.from(controlledIDs),
        null
      )
    }
    if (this.conns.size === 0) {
      this._flush()
    }
  }

  async _flush() {
    if (saveTimers.has(this.name)) {
      clearTimeout(saveTimers.get(this.name))
      saveTimers.delete(this.name)
    }
    const text = this.doc.getText('content').toString()
    await saveNoteContent(this.name, text)
    this.doc.destroy()
    this.awareness.destroy()
    docs.delete(this.name)
    roomTokens.delete(this.name)
  }

  onMessage(conn, data) {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data))
      const messageType = decoding.readVarUint(decoder)
      switch (messageType) {
        case MSG_SYNC:
          {
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, MSG_SYNC)
            syncProtocol.readSyncMessage(decoder, encoder, this.doc, conn)
            if (encoding.length(encoder) > 1) {
              send(conn, encoding.toUint8Array(encoder))
            }
          }
          break
        case MSG_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          )
          break
      }
    } catch (err) {
      console.error(`[msg] ${this.name}: ${err.message}`)
    }
  }
}

function send(conn, msg) {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(msg, (err) => {
      if (err) conn.close()
    })
  }
}

function getOrCreateRoom(name) {
  let room = docs.get(name)
  if (!room) {
    room = new Room(name)
    docs.set(name, room)
  }
  return room
}

async function fetchNoteContent(slug, token) {
  const headers = { Accept: 'application/json' }
  if (token) headers['X-Note-Token'] = token
  const res = await fetch(
    `${BACKEND_URL}/api/v1/notes/${encodeURIComponent(slug)}`,
    { headers }
  )
  if (res.status === 403) throw new Error('FORBIDDEN')
  if (!res.ok) return ''
  const data = await res.json()
  return data.content ?? ''
}

async function saveNoteContent(slug, content) {
  const token = roomTokens.get(slug)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['X-Note-Token'] = token
  try {
    await fetch(
      `${BACKEND_URL}/api/v1/notes/${encodeURIComponent(slug)}`,
      { method: 'PUT', headers, body: JSON.stringify({ content }) }
    )
  } catch (err) {
    console.error(`[save] ${slug}: ${err.message}`)
  }
}

// --- PostgreSQL LISTEN/NOTIFY ---

async function startPgListener() {
  if (!DATABASE_URL) {
    console.warn('[pg] DATABASE_URL não configurada — LISTEN/NOTIFY desativado')
    return
  }

  const client = new pg.Client({ connectionString: DATABASE_URL })

  client.on('error', (err) => {
    console.error(`[pg] conexão perdida: ${err.message}`)
    setTimeout(startPgListener, 3000)
  })

  try {
    await client.connect()
    await client.query('LISTEN nota_updated')
    console.log('[pg] LISTEN nota_updated ativo')

    client.on('notification', async (msg) => {
      const slug = msg.payload
      const room = docs.get(slug)
      if (!room || !room.loaded) return

      try {
        const content = await fetchNoteContent(slug, roomTokens.get(slug))
        if (content !== room.lastSavedContent) {
          room.applyExternalContent(content)
        }
      } catch (err) {
        console.error(`[pg-notify] ${slug}: ${err.message}`)
      }
    })
  } catch (err) {
    console.error(`[pg] falha ao conectar: ${err.message}`)
    setTimeout(startPgListener, 5000)
  }
}

// --- HTTP + WebSocket server ---

const wss = new WebSocketServer({ noServer: true })

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', version: VERSION }))
})

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const slug = url.pathname.replace(/^\/ws\//, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const token = url.searchParams.get('token') || undefined

  if (!slug) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
    socket.destroy()
    return
  }

  if (token) {
    try {
      await fetchNoteContent(slug, token)
      roomTokens.set(slug, token)
    } catch (err) {
      if (err.message === 'FORBIDDEN') {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
    }
  }

  wss.handleUpgrade(req, socket, head, async (ws) => {
    const room = getOrCreateRoom(slug)
    await room.load()
    room.addConn(ws)

    ws.on('message', (data) => room.onMessage(ws, data))
    ws.on('close', () => room.removeConn(ws))
    ws.on('error', () => room.removeConn(ws))
  })
})

server.listen(PORT, HOST, () => {
  console.log(`escreveaqui-yws v${VERSION} running on ${HOST}:${PORT}`)
  startPgListener()
})
