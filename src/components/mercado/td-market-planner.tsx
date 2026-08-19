'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Money } from '@/components/ui/compact'
import { toast } from 'sonner'

const LS_KEY = 'abr_td_market_v1'

const normKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

const KEY_MAP: [string, string[]][] = [
  ['id', ['id']],
  ['name', ['name']],
  ['total', ['oa', 'total']],
  ['leadership', ['lea', 'leadership', 'lideranca']],
  ['rd_mech', ['mec', 'rdmech']],
  ['rd_elec', ['ele', 'rdelec']],
  ['rd_aero', ['aer', 'rdaero']],
  ['experience', ['exp', 'experience', 'experiencia']],
  ['pitstop', ['pit', 'pitstop', 'coordenacaodepitstop']],
  ['motivation', ['mot', 'motivation', 'motivacao']],
  ['age', ['age', 'idade']],
  ['salary', ['sal', 'salary', 'salario']],
  ['fee', ['fee', 'taxa']],
  ['offers', ['off', 'offers', 'ofertas']]
]

function normalizeTds(rawList: any[]) {
  return rawList
    .map(raw => {
      if (!raw || typeof raw !== 'object') return null
      const lookup: Record<string, any> = {}
      for (const [k, v] of Object.entries(raw)) lookup[normKey(k)] = v
      const d: any = {}
      for (const [col, cands] of KEY_MAP) {
        for (const c of cands) {
          if (lookup[c] !== undefined) {
            d[col] = col === 'name' ? String(lookup[c]).trim() : Number(lookup[c]) || 0
            break
          }
        }
        if (d[col] === undefined) d[col] = col === 'name' ? '—' : 0
      }
      return d
    })
    .filter(Boolean)
}

const ATTR_FILTERS = [
  { key: 'total', label: 'Total', defMax: 250 },
  { key: 'leadership', label: 'Liderança', defMax: 250 },
  { key: 'rd_mech', label: 'I&D Mecânica', defMax: 250 },
  { key: 'rd_elec', label: 'I&D Eletrônica', defMax: 250 },
  { key: 'rd_aero', label: 'I&D Aerodinâmica', defMax: 250 },
  { key: 'experience', label: 'Experiência', defMax: 400 },
  { key: 'pitstop', label: 'Coordenação de Pitstop', defMax: 250 },
  { key: 'motivation', label: 'Motivação', defMax: 250 },
  { key: 'age', label: 'Idade', defMax: 99 }
]

const SORT_OPTIONS = [
  { value: '---', label: '---' },
  { value: 'total', label: 'Total' },
  { value: 'leadership', label: 'Liderança' },
  { value: 'rd_mech', label: 'I&D Mecânica' },
  { value: 'rd_elec', label: 'I&D Eletrônica' },
  { value: 'rd_aero', label: 'I&D Aerodinâmica' },
  { value: 'experience', label: 'Experiência' },
  { value: 'pitstop', label: 'Coordenação de Pitstop' },
  { value: 'motivation', label: 'Motivação' },
  { value: 'age', label: 'Idade' },
  { value: 'salary', label: 'Salário' },
  { value: 'fee', label: 'Taxa' },
  { value: 'offers', label: 'Ofertas' }
]

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isNaN(n) ? 0 : n
}

export function TdMarketPlanner() {
  const [data, setData] = useState<{ updated_at: string; tds: any[] } | null>(null)
  const [ranges, setRanges] = useState<Record<string, { min: string; max: string }>>(() =>
    Object.fromEntries(ATTR_FILTERS.map(a => [a.key, { min: '0', max: String(a.defMax) }]))
  )
  const [salary, setSalary] = useState({ min: '0', max: '990000000' })
  const [fee, setFee] = useState({ min: '0', max: '990000000' })
  const [offers, setOffers] = useState({ min: '0', max: '99' })
  const [limit, setLimit] = useState('20')
  const [sorts, setSorts] = useState<string[]>(['---', '---', '---'])
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const arr = Array.isArray(parsed) ? parsed : parsed.tds ?? parsed['tds '] ?? []
      const tds = normalizeTds(arr)
      if (!tds.length) throw new Error('vazio')
      const updated =
        String(parsed['Last updated '] ?? parsed['Last updated'] ?? '').trim() ||
        new Date().toLocaleString('pt-BR')
      localStorage.setItem(LS_KEY, JSON.stringify({ updated_at: updated, tds }))
      setData({ updated_at: updated, tds })
      toast.success(`${tds.length} diretores técnicos importados.`)
    } catch {
      toast.error('Arquivo JSON inválido. Baixe a lista de DTs do GPRO.')
    }
    e.target.value = ''
  }

  function calcular() {
    if (!data) return
    const list = data.tds.filter(
      (d: any) =>
        ATTR_FILTERS.every(a => {
          const v = Number(d[a.key] ?? 0)
          const r = ranges[a.key]
          return v >= num(r.min) && v <= num(r.max)
        }) &&
        Number(d.salary ?? 0) >= num(salary.min) &&
        Number(d.salary ?? 0) <= num(salary.max) &&
        Number(d.fee ?? 0) >= num(fee.min) &&
        Number(d.fee ?? 0) <= num(fee.max) &&
        Number(d.offers ?? 0) >= num(offers.min) &&
        Number(d.offers ?? 0) <= num(offers.max)
    )
    const keys = sorts.filter(k => k !== '---')
    if (keys.length) {
      list.sort((a: any, b: any) => {
        for (const k of keys) {
          const va = Number(a[k] ?? 0)
          const vb = Number(b[k] ?? 0)
          if (va !== vb) return vb - va
        }
        return 0
      })
    }
    setResults(list.slice(0, Math.max(1, num(limit))))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm">
            <strong>Passo 1:</strong> Baixe o arquivo JSON do GPRO:{' '}
            <a
              href="https://gpro.net/br/GetMarketFile.asp?market=tds&type=json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              https://gpro.net/br/GetMarketFile.asp?market=tds&type=json
            </a>
          </p>
          <p className="text-sm">
            <strong>Passo 2:</strong> Selecione o arquivo baixado:
          </p>
          <Input type="file" accept=".json,application/json" className="h-8 w-64" onChange={onFile} />
          {data && (
            <p className="text-xs text-muted-foreground">
              ✓ {data.tds.length} DTs carregados. Última atualização: {data.updated_at}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Diretor técnico</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <tbody>
                {ATTR_FILTERS.map(a => (
                  <tr key={a.key} className="border-b last:border-0">
                    <td className="py-1 pr-2">{a.label}</td>
                    <td className="w-20 py-1">
                      <Input
                        className="h-7 w-full text-center"
                        value={ranges[a.key]?.min ?? '0'}
                        onChange={e =>
                          setRanges(p => ({ ...p, [a.key]: { ...p[a.key], min: e.target.value } }))
                        }
                      />
                    </td>
                    <td className="px-1 text-center">-</td>
                    <td className="w-20 py-1">
                      <Input
                        className="h-7 w-full text-center"
                        value={ranges[a.key]?.max ?? '0'}
                        onChange={e =>
                          setRanges(p => ({ ...p, [a.key]: { ...p[a.key], max: e.target.value } }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Ordenar por</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {sorts.map((s, i) => (
                  <select
                    key={i}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={s}
                    onChange={e => setSorts(p => p.map((v, idx) => (idx === i ? e.target.value : v)))}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Filtração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {(
                  [
                    ['Salário', salary, setSalary],
                    ['Taxa', fee, setFee],
                    ['Ofertas', offers, setOffers]
                  ] as const
                ).map(([label, val, set]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-16 text-xs sm:text-sm">{label}</span>
                    <Input className="h-7 w-full text-center" value={val.min}
                      onChange={e => set(p => ({ ...p, min: e.target.value }))} />
                    <span>-</span>
                    <Input className="h-7 w-full text-center" value={val.max}
                      onChange={e => set(p => ({ ...p, max: e.target.value }))} />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs sm:text-sm">Limite</span>
                  <Input className="h-7 w-20 text-center" value={limit} onChange={e => setLimit(e.target.value)} />
                </div>
                <Button onClick={calcular} className="w-full">Calcular</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-4 pt-0 text-xs sm:text-sm">
              <p>
                Visualizado: <strong>{results.length}</strong> /{' '}
                <strong>{data?.tds.length ?? 0}</strong>
              </p>
              <p>
                Última atualização: <strong>{data?.updated_at ?? '—'}</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Mercado de diretores técnicos</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/95">
              <tr>
                <th className="px-2 py-1 text-left">Nome</th>
                <th className="px-2 py-1 text-center">Total</th>
                <th className="px-2 py-1 text-center">Lidera.</th>
                <th className="px-2 py-1 text-center">Mecân.</th>
                <th className="px-2 py-1 text-center">Eletrôn.</th>
                <th className="px-2 py-1 text-center">Aerodin.</th>
                <th className="px-2 py-1 text-center">Experi.</th>
                <th className="px-2 py-1 text-center">Pit</th>
                <th className="px-2 py-1 text-center">Motiva.</th>
                <th className="px-2 py-1 text-center">Idade</th>
                <th className="px-2 py-1 text-center">Salário</th>
                <th className="px-2 py-1 text-center">Taxa</th>
                <th className="px-2 py-1 text-center">Ofertas</th>
              </tr>
            </thead>
            <tbody>
              {results.map((d: any, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-2 py-1 whitespace-nowrap">
                    <a
                      href={`https://gpro.net/br/TechDProfile.asp?ID=${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {d.name}
                    </a>
                  </td>
                  <td className="px-2 py-1 text-center font-semibold">{d.total}</td>
                  <td className="px-2 py-1 text-center">{d.leadership}</td>
                  <td className="px-2 py-1 text-center">{d.rd_mech}</td>
                  <td className="px-2 py-1 text-center">{d.rd_elec}</td>
                  <td className="px-2 py-1 text-center">{d.rd_aero}</td>
                  <td className="px-2 py-1 text-center">{d.experience}</td>
                  <td className="px-2 py-1 text-center">{d.pitstop}</td>
                  <td className="px-2 py-1 text-center">{d.motivation}</td>
                  <td className="px-2 py-1 text-center">{d.age}</td>
                  <td className="px-2 py-1 text-center"><Money value={d.salary} /></td>
                  <td className="px-2 py-1 text-center"><Money value={d.fee} /></td>
                  <td className="px-2 py-1 text-center">{d.offers}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-2 py-6 text-center text-muted-foreground">
                    Importe o JSON de DTs do GPRO e clique em Calcular.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}