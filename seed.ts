import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ==========================================
// HELPERS
// ==========================================

// Limpa espaços extras em chaves e valores string
function cleanObject(obj: any) {
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = key.trim()
    if (typeof value === 'string') {
      cleaned[cleanKey] = value.trim()
    } else {
      cleaned[cleanKey] = value
    }
  }
  return cleaned
}

// Garante conversão de números que vieram como string
const toNumber = (val: any) => {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  const n = parseFloat(String(val).trim())
  return Number.isNaN(n) ? null : n
}

// Converte nome da pista (ex: "Baku City") em ID (ex: "baku-city")
function nameToId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Gera datas das corridas (alternando terça e sexta)
function generateRaceDates(startDate: Date, totalRaces: number): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)

  for (let i = 0; i < totalRaces; i++) {
    dates.push(new Date(current))

    // Avança para o próximo dia de corrida (terça ou sexta)
    if (current.getDay() === 5) {
      // sexta -> próxima terça (+3 dias)
      current.setDate(current.getDate() + 3)
    } else {
      // terça -> próxima sexta (+4 dias... não, terça -> sexta é +3 dias)
      // Espera: terça (2) -> sexta (5) = +3 dias
      current.setDate(current.getDate() + 3)
    }
  }

  return dates
}

// ==========================================
// SEED FUNCTIONS
// ==========================================

async function seedTires() {
  console.log('\n🏎️  Inserindo pneus...')
  
  const pneus = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'pneus.json'), 'utf-8')
  )
  
  const cleanPneus = pneus.map(cleanObject).map((p: any) => ({
    id: nameToId(p.nome),
    name: p.nome,
    dry_grip: p.seco,
    wet_grip: p.molhado,
    ideal_temp: p.temperatura,
    durability: p.durabilidade,
    warmup: p.aquecimento,
    price: p.preco,
    durability_coef: toNumber(p.coefDurab),
    temp_coef: toNumber(p.coefTemp)
  }))

  const { error } = await supabase
    .from('tires')
    .upsert(cleanPneus, { onConflict: 'id' })

  if (error) {
    console.error('❌ Erro ao inserir pneus:', error.message)
    return false
  }
  
  console.log(`✅ ${cleanPneus.length} pneus inseridos`)
  return true
}

async function seedTracks() {
  console.log('\n🏁 Inserindo pistas...')
  
  const pistas = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'pistas.json'), 'utf-8')
  )

  const cleanPistas = pistas.map(cleanObject).map((p: any) => ({
    id: nameToId(p.nome),
    name: p.nome,
    country: p.pais,
    distance_km: toNumber(p.km),
    laps: p.numVoltas,
    lap_length_km: toNumber(p.volta),
    power_req: p.potencia,
    handling_req: p.dirigibilidade,
    acceleration_req: p.aceleracao,
    downforce: p.downforce,
    overtaking: p.ultrapassagem,
    suspension_req: p.suspensao,
    grip: p.aderencia,
    fuel_consumption: p.consumo,
    tire_wear: p.desgaste,
    pit_lane_time: toNumber(p.pits),
    corners: p.curvas,
    rain_coef: toNumber(p.coefChuva),
    durability_coef: toNumber(p.coefDurab),
    tire_coef: toNumber(p.coefPneu),
    setup_wing: p.setupAsa,
    setup_engine: p.setupMot,
    setup_brakes: p.setupFre,
    setup_gear: p.setupCam,
    setup_suspension: p.setupSus,
    setup_split: p.setupSplit,
    base_wing: toNumber(p.wingBase),
    total_wear: toNumber(p.desgasteSoma),
    wear_chassis: toNumber(p.desgasteCha),
    wear_engine: toNumber(p.desgasteMot),
    wear_front_wing: toNumber(p.desgasteAsd),
    wear_rear_wing: toNumber(p.desgasteAst),
    wear_underbody: toNumber(p.desgasteAss),
    wear_sidepods: toNumber(p.desgasteLat),
    wear_radiator: toNumber(p.desgasteRad),
    wear_gearbox: toNumber(p.desgasteCam),
    wear_brakes: toNumber(p.desgasteFre),
    wear_suspension: toNumber(p.desgasteSus),
    wear_electronics: toNumber(p.desgasteEle)
  }))

  const { error } = await supabase
    .from('tracks')
    .upsert(cleanPistas, { onConflict: 'id' })

  if (error) {
    console.error('❌ Erro ao inserir pistas:', error.message)
    return false
  }

  console.log(`✅ ${cleanPistas.length} pistas inseridas`)
  return true
}

async function seedSeason112() {
  console.log('\n📅 Inserindo Temporada 112...')

  // Desativa outras temporadas
  await supabase.from('seasons').update({ is_active: false }).neq('number', 112)

  const temporadaNomes = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data','temporada.json'), 'utf-8')
  ).map((n: string) => n.trim())

  const pistaTesteNome = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'pistaTestes.json'), 'utf-8')
  ).trim()

  const testTrackId = nameToId(pistaTesteNome)
  const startDate = new Date('2026-08-14') // Sexta-feira
  const raceDates = generateRaceDates(startDate, temporadaNomes.length)
  const endDate = raceDates[raceDates.length - 1]

  // Cria ou atualiza a temporada 112
  const { data: existingSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('number', 112)
    .maybeSingle()

  let seasonId: string

  if (existingSeason) {
    const { error } = await supabase
      .from('seasons')
      .update({
        name: 'Temporada 112',
        test_track_id: testTrackId,
        is_active: true,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      })
      .eq('id', existingSeason.id)

    if (error) {
      console.error('❌ Erro ao atualizar temporada:', error.message)
      return false
    }

    seasonId = existingSeason.id
    console.log('✅ Temporada 112 atualizada')
  } else {
    const { data, error } = await supabase
      .from('seasons')
      .insert({
        name: 'Temporada 112',
        test_track_id: testTrackId,
        is_active: true,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        number: 112
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao criar temporada:', error.message)
      return false
    }

    seasonId = data.id
    console.log('✅ Temporada 112 criada')
  }

  // Remove corridas antigas da temporada 112
  await supabase.from('season_races').delete().eq('season_id', seasonId)

  // Insere as 17 corridas com suas datas
  const races = temporadaNomes.map((trackName: string, index: number) => ({
    season_id: seasonId,
    track_id: nameToId(trackName),
    race_number: index + 1,
    race_date: raceDates[index].toISOString().split('T')[0]
  }))

  const { error: racesError } = await supabase
    .from('season_races')
    .upsert(races, { onConflict: 'season_id,race_number' })

  if (racesError) {
    console.error('❌ Erro ao inserir calendário:', racesError.message)
    return false
  }

  console.log(`✅ Calendário da Temporada 112 inserido (${races.length} corridas)`)
  
  // Exibe o calendário
  console.log('\n📆 Calendário:')
  races.forEach((r: any) => {
    const date = new Date(r.race_date + 'T00:00:00')
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
    const track = temporadaNomes[r.race_number - 1]
    console.log(
      `  Corrida ${String(r.race_number).padStart(2, '0')}: ` +
      `${date.toLocaleDateString('pt-BR')} (${weekday}) - ${track}`
    )
  })

  return true
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')
  console.log('📦 Temporada 112 - Início: 14/08/2026')
  console.log('🗓️  Corridas: terças e sextas\n')

  const ok1 = await seedTires()
  const ok2 = await seedTracks()
  const ok3 = await seedSeason112()

  if (ok1 && ok2 && ok3) {
    console.log('\n🎉 Seed concluído com sucesso!')
    process.exit(0)
  } else {
    console.error('\n❌ Seed concluído com erros')
    process.exit(1)
  }
}

main()