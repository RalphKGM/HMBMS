import { isSupabaseConfigured, supabase } from './supabase'

const LOCAL_STORAGE_KEY = 'hmbms-react-data'
const APP_STATE_ID = 'main'

function loadLocalData(seedData) {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
  return saved ? JSON.parse(saved) : seedData
}

function saveLocalData(data) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

export async function loadAppData(seedData) {
  if (!isSupabaseConfigured) {
    return { data: loadLocalData(seedData), source: 'localStorage' }
  }

  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', APP_STATE_ID)
    .maybeSingle()

  if (error) {
    return { data: loadLocalData(seedData), source: 'localStorage', error: error.message }
  }

  if (!data) {
    await saveAppData(seedData)
    return { data: seedData, source: 'supabase' }
  }

  saveLocalData(data.data)
  return { data: data.data, source: 'supabase' }
}

export async function saveAppData(data) {
  saveLocalData(data)

  if (!isSupabaseConfigured) {
    return { source: 'localStorage' }
  }

  const { error } = await supabase.from('app_state').upsert({
    id: APP_STATE_ID,
    data,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return { source: 'localStorage', error: error.message }
  }

  return { source: 'supabase' }
}
