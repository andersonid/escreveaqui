#!/usr/bin/env node
import WebSocket from 'ws'
import http from 'http'
import * as Y from 'yjs'
import { setupWSConnection } from '@y/websocket-server/utils'
import { setPersistence } from '@y/websocket-server/utils'

const BACKEND_URL = process.env.BACKEND_URL || 'http://escreveaqui-backend:8080'
const HOST = process.env.HOST || '::'
const PORT = parseInt(process.env.PORT || '1234', 10)
const SAVE_DEBOUNCE_MS = parseInt(process.env.SAVE_DEBOUNCE_MS || '3000', 10)

const saveTimers = new Map()
const roomTokens = new Map()

async function fetchNoteContent(slug, token) {
  const headers = { Accept: 'application/json' }
  if (token) headers['X-Note-Token'] = token
  const res = await fetch(`${BACKEND_URL}/api/v1/notes/${encodeURIComponent(slug)}`, { headers })
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
    await fetch(`${BACKEND_URL}/api/v1/notes/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ content }),
    })
  } catch (err) {
    console.error(`[save] ${slug}: ${err.message}`)
  }
}

function debouncedSave(slug, ydoc) {
  if (saveTimers.has(slug)) clearTimeout(saveTimers.get(slug))
  saveTimers.set(slug, setTimeout(() => {
    saveTimers.delete(slug)
    const text = ydoc.getText('content').toString()
    saveNoteContent(slug, text)
  }, SAVE_DEBOUNCE_MS))
}

setPersistence({
  bindState: async (docName, ydoc) => {
    const slug = docName
    try {
      const content = await fetchNoteContent(slug, roomTokens.get(slug))
      if (content) {
        const ytext = ydoc.getText('content')
        ydoc.transact(() => {
          ytext.insert(0, content)
        })
      }
    } catch (err) {
      console.error(`[bind] ${slug}: ${err.message}`)
    }

    ydoc.on('update', () => {
      debouncedSave(slug, ydoc)
    })
  },

  writeState: async (docName, ydoc) => {
    const slug = docName
    if (saveTimers.has(slug)) {
      clearTimeout(saveTimers.get(slug))
      saveTimers.delete(slug)
    }
    const text = ydoc.getText('content').toString()
    await saveNoteContent(slug, text)
    roomTokens.delete(slug)
  },
})

const wss = new WebSocket.Server({ noServer: true })
wss.on('connection', setupWSConnection)

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('ok')
})

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const slug = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
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

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`escreveaqui-yws running on ${HOST}:${PORT}`)
})
