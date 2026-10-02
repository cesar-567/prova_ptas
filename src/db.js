// src/db.js — carrega o "banco" em arquivo
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFile } from 'node:fs/promises'

export async function writeEmprestimos(users) {
  await writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf8')
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'emprestimos.json')

// lê e devolve o array de usuários; se arquivo não existir, devolve []
export async function readEmprestimos() {
  try {
    const raw = await readFile(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return []   // arquivo não existe ainda
    throw err                              // outro erro: propaga
  }
}