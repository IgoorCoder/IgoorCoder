// Desenha o cartão "Meus números" do perfil (perfil/numeros.svg), no visual do Cosmo.
// Roda sozinho uma vez por dia pelo GitHub Actions (.github/workflows/numeros.yml),
// com os números do próprio GitHub. Sem serviço de fora: nunca fica quebrado.
// Teste local: NUMEROS_FALSOS=1 node scripts/numeros.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const USUARIO = process.env.USUARIO || 'IgoorCoder'
const TOKEN = process.env.GITHUB_TOKEN
const C = { fundo: '#0b0918', borda: '#2a2440', lilas: '#c9b8ff', ouro: '#f5c451', texto: '#e9e4ff', texto2: '#cfc8ea', mu: '#a097c8', mu2: '#8c83b4', sup3: '#221b3d' }
const CORES_LING = [C.lilas, C.ouro, '#7de3f5', '#8be3a8']

async function buscar() {
  if (process.env.NUMEROS_FALSOS) {
    return { contribuicoes: 0, repos: 0, estrelas: 0, seguidores: 0, linguagens: [] }
  }
  if (!TOKEN) throw new Error('faltou o GITHUB_TOKEN')
  const query = `query($login:String!){user(login:$login){
    followers{totalCount}
    repositories(ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,first:100){totalCount nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}
    contributionsCollection{contributionCalendar{totalContributions} restrictedContributionsCount}
  }}`
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'perfil-numeros' },
    body: JSON.stringify({ query, variables: { login: USUARIO } }),
  })
  const d = await r.json()
  if (!r.ok || d.errors) throw new Error(JSON.stringify(d.errors ?? d).slice(0, 300))
  const u = d.data.user
  const tam = {}
  for (const repo of u.repositories.nodes) for (const e of repo.languages.edges) tam[e.node.name] = (tam[e.node.name] ?? 0) + e.size
  return {
    contribuicoes: u.contributionsCollection.contributionCalendar.totalContributions + (u.contributionsCollection.restrictedContributionsCount ?? 0),
    repos: u.repositories.totalCount,
    estrelas: u.repositories.nodes.reduce((s, x) => s + x.stargazerCount, 0),
    seguidores: u.followers.totalCount,
    linguagens: Object.entries(tam).map(([nome, t]) => ({ nome, tam: t })).sort((a, b) => b.tam - a.tam),
  }
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (v) => v.toLocaleString('pt-BR')

function desenhar(n) {
  const f = JSON.parse(readFileSync(new URL('../perfil/fontes.json', import.meta.url), 'utf8'))
  const W = 400, H = 170
  const itens = [
    ['Contribuições no ano', n.contribuicoes],
    ['Repositórios', n.repos],
    ['Estrelas', n.estrelas],
    ['Seguidores', n.seguidores],
  ]
  const cards = itens
    .map(([rotulo, v], i) => {
      const x = 24 + (i % 2) * 180, y = 66 + Math.floor(i / 2) * 42
      return `<text x="${x}" y="${y}" class="ti" font-size="20" fill="${i === 0 ? C.ouro : C.texto}">${num(v)}</text><text x="${x}" y="${y + 16}" class="tx" font-size="11" fill="${C.mu}">${esc(rotulo)}</text>`
    })
    .join('')
  // linguagens: as 3 maiores + "outras"
  const total = n.linguagens.reduce((s, l) => s + l.tam, 0)
  let ling = ''
  if (total) {
    const top = n.linguagens.slice(0, 3)
    const resto = total - top.reduce((s, l) => s + l.tam, 0)
    const partes = [...top, ...(resto > 0 ? [{ nome: 'Outras', tam: resto }] : [])].map((l, i) => ({ ...l, pct: (l.tam / total) * 100, cor: CORES_LING[i] }))
    let x = 24
    const barra = partes.map((p) => { const w = (p.pct / 100) * 352; const r = `<rect x="${x.toFixed(1)}" y="138" width="${Math.max(2, w).toFixed(1)}" height="6" fill="${p.cor}"/>`; x += w; return r }).join('')
    let lx = 24
    const legenda = partes.map((p) => { const t = `${p.nome} ${Math.round(p.pct)}%`; const s = `<circle cx="${lx + 3}" cy="${158}" r="3" fill="${p.cor}"/><text x="${lx + 10}" y="161.5" class="tx" font-size="10" fill="${C.mu2}">${esc(t)}</text>`; lx += 18 + t.length * 5.6; return s }).join('')
    ling = `<clipPath id="b"><rect x="24" y="138" width="352" height="6" rx="3"/></clipPath><rect x="24" y="138" width="352" height="6" rx="3" fill="${C.sup3}"/><g clip-path="url(#b)">${barra}</g>${legenda}`
  } else {
    ling = `<text x="24" y="150" class="tx" font-size="11" fill="${C.mu2}">Ainda sem código público para medir as linguagens</text>`
  }
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Meus números no GitHub: ${itens.map(([r, v]) => `${r} ${v}`).join(', ')}">
<title>Meus números no GitHub</title>
<style>
@font-face{font-family:'Unb';src:url(data:font/woff2;base64,${f.unb}) format('woff2')}
@font-face{font-family:'ManM';src:url(data:font/woff2;base64,${f.manM}) format('woff2')}
@font-face{font-family:'ManB';src:url(data:font/woff2;base64,${f.manB}) format('woff2')}
.ti{font-family:'Unb',sans-serif;font-weight:600}
.tx{font-family:'ManM','Segoe UI',sans-serif;font-weight:500}
.tb{font-family:'ManB','Segoe UI',sans-serif;font-weight:700}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${C.fundo}" stroke="${C.borda}"/>
<text x="24" y="30" class="tb" font-size="13" fill="${C.mu}">Meus números</text>
<text x="${W - 24}" y="30" class="tx" font-size="10" fill="${C.mu2}" text-anchor="end">atualizado em ${hoje}</text>
${cards}
${ling}
</svg>
`
}

const n = await buscar()
writeFileSync(new URL('../perfil/numeros.svg', import.meta.url), desenhar(n))
console.log('cartão desenhado:', JSON.stringify({ ...n, linguagens: n.linguagens.slice(0, 4) }))
