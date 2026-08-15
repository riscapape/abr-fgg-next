'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Money } from '@/components/ui/compact'
import { toast } from 'sonner'
import {
  ATTR_FILTERS,
  SORT_OPTIONS,
  loadMarket,
  saveMarket,
  normalizeDrivers,
  type MarketData
} from '@/lib/gpro/market'

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isNaN(n) ? 0 : n
}

export function MarketPlanner() {
  const [data, setData] = useState<MarketData | null>(null)
  const [ranges, setRanges] = useState<Record<string, { min: string; max: string }>>(() =>
    Object.fromEntries(ATTR_FILTERS.map(a => [a.key, { min: '0', max: String(a.defMax) }]))
  )
  const [salary, setSalary] = useState({ min: '0', max: '990000000' })
  const [fee, setFee] = useState({ min: '0', max: '990000000' })
  const [offers, setOffers] = useState({ min: '0', max: '99' })
  const [limit, setLimit] = useState('50')
  const [sorts, setSorts] = useState(['---', '---', '---'])
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    setData(loadMarket())
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : parsed.drivers ?? parsed.data ?? []
      const drivers = normalizeDrivers(arr)
      if (!drivers.length) throw new Error('vazio')
      if (!saveMarket(drivers)) {
        toast.error('localStorage cheio: lista grande demais.')
        return
      }
      setData(loadMarket())
      toast.success(`${drivers.length} pilotos importados.`)
    } catch (err) {
      toast.error('Arquivo JSON inválido. Baixe o arquivo correto do GPRO.')
    }
    e.target.value = ''
  }

  function calcular() {
    if (!data) return
    const list = data.drivers.filter(d => {
      for (const a of ATTR_FILTERS) {
        const v = Number(d[a.key] ?? 0)
        const r = ranges[a.key]
        if (v < num(r.min) || v > num(r.max)) return false
      }
      const sal = Number(d.salary ?? 0)
      if (sal < num(salary.min) || sal > num(salary.max)) return false
      const f = Number(d.sign_fee ?? 0)
      if (f < num(fee.min) || f > num(fee.max)) return false
      const off = Number(d.offers ?? 0)
      if (off < num(offers.min) || off > num(offers.max)) return false
      return true
    })

    const keys = sorts.filter(k => k !== '---')
    if (keys.length) {
      list.sort((a, b) => {
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
              href="https://gpro.net/br/GetMarketFile.asp?market=drivers&type=json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              https://gpro.net/br/GetMarketFile.asp?market=drivers&type=json
            </a>
          </p>
          <p className="text-sm">
            <strong>Passo 2:</strong> Selecione o arquivo baixado:
          </p>
          <Input
            type="file"
            accept=".json,application/json"
            onChange={onFile}
            className="h-8 w-64"
          />
          {data && (
            <p className="text-xs text-muted-foreground">
              ✓ {data.drivers.length} pilotos carregados. Última atualização:{' '}
              {new Date(data.updated_at).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Piloto */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Piloto</CardTitle>
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

        <div className="space-y-6">
          {/* Ordenar */}
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
                  onChange={e =>
                    setSorts(p => p.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ))}
            </CardContent>
          </Card>

          

          {/* Info */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-4 pt-0 text-xs sm:text-sm">
              <p>
                Visualizado: <strong>{results.length}</strong> /{' '}
                <strong>{data?.drivers.length ?? 0}</strong>
              </p>
              <p>
                Última atualização:{' '}
                <strong>
                  {data?.updated_at ? new Date(data.updated_at).toLocaleString('pt-BR') : '—'}
                </strong>
              </p>
            </CardContent>
          </Card>
        </div>
         <div className="space-y-6">
            {/* Filtração */}
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
                  <Input
                    className="h-7 w-full text-center"
                    value={val.min}
                    onChange={e => set(p => ({ ...p, min: e.target.value }))}
                  />
                  <span>-</span>
                  <Input
                    className="h-7 w-full text-center"
                    value={val.max}
                    onChange={e => set(p => ({ ...p, max: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs sm:text-sm">Limite</span>
                <Input
                  className="h-7 w-20 text-center"
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                />
              </div>
              <Button onClick={calcular} className="w-full">
                Calcular
              </Button>
            </CardContent>
          </Card>
         </div>
      </div>

      {/* Resultado — grid sozinho embaixo */}
            
          <div className="space-y-2">
        <h2 className="text-sm font-semibold">Resultado</h2>
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/95">
                <tr>
                  {['Piloto', 'Id', 'Peso', 'Tot', 'Conc', 'Tal', 'Agr', 'Exp', 'Téc', 'Res', 'Car', 'Mot', 'Rep', 'Salário', 'Taxa', 'Ofs'].map(h => (
                    <th key={h} className="px-1.5 py-1 text-center whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-1.5 py-1 whitespace-nowrap">
                      <a
                        href={`https://gpro.net/br/DriverProfile.asp?ID=${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {d.name}
                      </a>
                      {d.nationality ? ` (${d.nationality})` : ''}
                    </td>
                    <td className="px-1.5 py-1 text-center">{d.age}</td>
                    <td className="px-1.5 py-1 text-center">{d.weight_kg}</td>
                    <td className="px-1.5 py-1 text-center font-semibold">{d.total}</td>
                    <td className="px-1.5 py-1 text-center">{d.concentration}</td>
                    <td className="px-1.5 py-1 text-center">{d.talent}</td>
                    <td className="px-1.5 py-1 text-center">{d.aggression}</td>
                    <td className="px-1.5 py-1 text-center">{d.experience}</td>
                    <td className="px-1.5 py-1 text-center">{d.technical_knowledge}</td>
                    <td className="px-1.5 py-1 text-center">{d.endurance}</td>
                    <td className="px-1.5 py-1 text-center">{d.charisma}</td>
                    <td className="px-1.5 py-1 text-center">{d.motivation}</td>
                    <td className="px-1.5 py-1 text-center">{d.reputation}</td>
                    <td className="px-1.5 py-1 text-center">
                      <Money value={d.salary} />
                    </td>
                    <td className="px-1.5 py-1 text-center">
                      <Money value={d.sign_fee} />
                    </td>
                    <td className="px-1.5 py-1 text-center">{d.offers}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-2 py-6 text-center text-muted-foreground">
                      Importe o JSON do GPRO e clique em Calcular.
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