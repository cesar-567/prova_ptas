import app from "./app.js";
import dotenv from "dotenv";
import express from 'express';
import {readEmprestimos, writeEmprestimos} from './db.js'

function logger(req, res, next) {
  const inicio = Date.now()

  // 'finish' dispara quando a resposta já foi enviada ao cliente
  res.on('finish', () => {
    const ms = Date.now() - inicio
    console.log(`${req.method} ${req.url} — ${ms}ms`)
  })

  next() // o fluxo segue IMEDIATAMENTE, sem esperar o log
}

app.use(logger)


app.use(express.json())

dotenv.config()

app.get('/health', (req, res) => {
    res.send({status:"ok"})
})

app.get('/', (req, res) => {
    res.send({info:"Prova de César Augusto, vá para /emprestimos para ver os emprestimos ativos"})
})

app.get('/emprestimos', async (req, res) => {
    const emprestimos = await readEmprestimos()
    res.send(emprestimos.filter(emprestimo => emprestimo.devolvidoEm === null))
})

app.get('/emprestimos/:id', async (req, res) => {
    const emprestimos = await readEmprestimos()
    const emprestimo = emprestimos.find(emprestimo => emprestimo.id === Number(req.params.id))
    if(!emprestimo){
        return res.status(404).json({erro: "não existe nenhum emprestimo com esse id"})
    }
    res.send(emprestimo)
})

app.post('/emprestimos', async (req, res) => {
  try{  
  const { nomeAluno, livro  } = req.body || {}

  // validação simples
  if (!nomeAluno || typeof nomeAluno !== 'string') {
    return res.status(400).json({ erro: 'nomeAluno é obrigatório' })
  }
  if (!livro || typeof livro !== 'string') {
    return res.status(400).json({ erro: 'livro é obrigatório' })
  }
  const emprestimos = await readEmprestimos()
  const novoId = emprestimos.length ? Math.max(...emprestimos.map(u => u.id)) + 1 : 1

  const novo = { id: novoId, nomeAluno, livro, devolvidoEm: null }
  emprestimos.push(novo)
  await writeEmprestimos(emprestimos)

  // 201 Created + recurso no body
  res.status(201).json(novo)
}catch(err){
next(err)
}
})

app.put('/emprestimos/:id', async (req, res) => {
  // 1. params vem SEMPRE como string → converter para number
  const id = Number(req.params.id)
  
  // 2. PUT exige TODOS os campos obrigatórios no body
  const { nomeAluno, livro } = req.body || {}

  if (!nomeAluno || !livro) {
    return res.status(400).json({ 
      erro: 'nomeAluno, livro são obrigatórios para PUT.' 
    })
  }

  // 3. Busca o índice (não o objeto) para poder substituir no array
  const emprestimos = await readEmprestimos()
  const idx = emprestimos.findIndex(emprestimo => emprestimo.id === id)
  const devolvidoEmx = emprestimos.find(emprestimo => emprestimo.id === id)
  const devolvidoEm = devolvidoEmx.devolvidoEm
  if (idx === -1) return res.status(404).json({ erro: 'Emprestimo não encontrado' })

  // 4. SUBSTITUI o objeto inteiro — mantém id da URL, descarta o do body
  emprestimos[idx] = { id, nomeAluno, livro, devolvidoEm}
  
  // 5. Persiste e responde com recurso atualizado
  await writeEmprestimos(emprestimos)
  res.json(emprestimos[idx])  // 200 OK
})

app.patch('/emprestimos/:id', async (req, res) => {
  const id = Number(req.params.id)
  const emprestimos = await readEmprestimos()
  const emprestimo = emprestimos.find(emprestimo => emprestimo.id === id)
  if (!emprestimo) return res.status(404).json({ erro: 'Usuário não encontrado' })

  
  // CORRETO: filtrar campos sensíveis ANTES do merge
  const { id: _, devolvidoEm:__, updatedAt: ___, ...dadosPermitidos } = req.body || {}
  Object.assign(emprestimo, dadosPermitidos)
  
  // Opcional: updatedAt automático
  emprestimo.updatedAt = new Date().toISOString()
  
  await writeEmprestimos(emprestimos)
  res.json(emprestimo)  // 200 OK com recurso mesclado
})

app.delete('/emprestimos/:id', async (req, res) => {
  const id = Number(req.params.id)
  const emprestimos = await readEmprestimos()
  const emprestimo = emprestimos.find(emprestimo => emprestimo.id === id)
  if (!emprestimo) return res.status(404).json({ erro: 'Emprestimo não encontrado' })
  if (emprestimo.devolvidoEm) return res.status(409).json({ erro: 'Já removido' })

  emprestimo.devolvidoEm = new Date().toISOString()  // marca remoção
  await writeEmprestimos(emprestimos)
  res.status(204).end()
})

app.use((req, res) => {
  res.status(404).json({ erro: `rota ${req.method} ${req.url} não existe` })
})

function errorHandler(err, req, res, next) {
  console.error(err.stack) // o rastro completo vai para o terminal (log do dev)

  const status = err.status || 500
  res.status(status).json({ erro: err.message || 'Erro interno' })
}

app.use(errorHandler)

//rodando o servidor
app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`)
})