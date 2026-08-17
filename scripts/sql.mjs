import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const sql = process.argv[2] || readFileSync(0, 'utf8')

const res = await fetch(
  `https://api.supabase.com/v1/projects/hjmqwueengqqubzolycn/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

if (!res.ok) {
  console.error(`Error ${res.status}: ${await res.text()}`)
  process.exit(1)
}
console.log(JSON.stringify(await res.json(), null, 2))
