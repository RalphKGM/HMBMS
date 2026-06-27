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


export async function fetchBeneficiariesData() {
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured. Falling back to empty arrays.");
    return { beneficiaries: [], inquiries: [] };
  }

  const { data: beneficiaries, error: bError } = await supabase
    .from('beneficiaries')
    .select('*')
    .order('created_at', { ascending: false });

  if (bError) throw new Error(bError.message);

  const { data: inquiries, error: iError } = await supabase
    .from('milk_inquiries')
    .select('*')
    .order('inquiry_date', { ascending: false });

  if (iError) throw new Error(iError.message);

  return {
    beneficiaries: beneficiaries.map(b => ({
      id: b.beneficiary_id,
      firstName: b.first_name,
      lastName: b.last_name,
      contactNumber: b.contact_number,
      address: b.address,
      isActive: b.is_active,
    })),
    inquiries: inquiries.map(i => ({
      id: i.inquiry_id,
      beneficiaryId: i.beneficiary_id,
      inquiryDate: i.inquiry_date,
      status: i.status,
    }))
  };
}

export async function dbInsertBeneficiary(form, currentUserId = null) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .insert([{
      first_name: form.firstName,
      last_name: form.lastName,
      contact_number: form.contactNumber,
      address: form.address,
      is_active: true,
      created_by: currentUserId 
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function dbToggleBeneficiaryStatus(id, currentStatus) {
  const { error } = await supabase
    .from('beneficiaries')
    .update({ is_active: !currentStatus })
    .eq('beneficiary_id', id);

  if (error) throw new Error(error.message);
}

export async function dbInsertInquiry(beneficiaryId, currentUserId = null) {
  const { data, error } = await supabase
    .from('milk_inquiries')
    .insert([{
      beneficiary_id: beneficiaryId,
      inquiry_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      logged_by: currentUserId
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}