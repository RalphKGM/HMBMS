import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 

export function MilkRecords() {
  // State management for records
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalVolume, setTotalVolume] = useState(0);

  // Form input states
  const [form, setForm] = useState({
    batchNumber: '',    // Accepts text alphanumeric codes (e.g., BATCH-2026-02)
    donorDtn: '',       // Accepts text alphanumeric codes (e.g., DTN-20260626-0001)
    collectionType: 'Walk-in',
    collectionDate: '',
    volume: ''
  });

  // Fetch milk records joined with parent human-readable codes from Supabase
  const fetchMilkRecords = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      // Use PostgREST resource embedding to auto-fetch parent labels
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          collection_id,
          collection_type,
          collection_date,
          volume_ml,
          status,
          created_at,
          milk_batches ( batch_number ),
          donors ( dtn )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten embedded object properties to keep rendering layouts clean
      const formattedRows = (data || []).map(item => ({
        collection_id: item.collection_id,
        batch_number: item.milk_batches?.batch_number || 'N/A',
        donor_dtn: item.donors?.dtn || 'N/A',
        collection_type: item.collection_type,
        collection_date: item.collection_date,
        volume_ml: Number(item.volume_ml), // Strips trailing structural .00 decimals
        status: item.status
      }));

      setRecords(formattedRows);
      
      // Calculate total volume dynamically from all records
      const total = formattedRows.reduce((sum, rec) => sum + (rec.volume_ml || 0), 0);
      setTotalVolume(total);
    } catch (err) {
      console.error('Error loading milk records:', err.message);
      setErrorMsg('Failed to load milk records from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilkRecords();
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit entry with programmatic mapping checks injected beforehand
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.batchNumber || !form.donorDtn || !form.collectionDate || !form.volume) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setLoading(true);

      // 1. Resolve alphanumeric batch text code to internal integer batch_id
      const { data: batchData, error: batchErr } = await supabase
        .from('milk_batches')
        .select('batch_id')
        .eq('batch_number', form.batchNumber.trim())
        .maybeSingle(); // Prevents crashing if 0 rows return

      if (batchErr) throw batchErr;
      if (!batchData) {
        throw new Error(`Batch tracking code "${form.batchNumber}" was not found. Please verify standard batch records.`);
      }

      // 2. Resolve alphanumeric Donor DTN code to internal integer donor_id
      const { data: donorData, error: donorErr } = await supabase
        .from('donors')
        .select('donor_id')
        .eq('dtn', form.donorDtn.trim())
        .maybeSingle();

      if (donorErr) throw donorErr;
      if (!donorData) {
        throw new Error(`Donor DTN code "${form.donorDtn}" was not found. Please register this donor profile first.`);
      }

      // 3. Construct insert payload using actual table primary identifier links
      const cleanPayload = {
        batch_id: batchData.batch_id,
        donor_id: donorData.donor_id,
        collection_type: form.collectionType,
        collection_date: form.collectionDate,
        volume_ml: Number(form.volume),
        status: 'Pending Lab'
      };

      const { error: insertErr } = await supabase
        .from('milk_collections')
        .insert([cleanPayload]);

      if (insertErr) throw insertErr;

      // Clear the form fields upon successful creation
      setForm({
        batchNumber: '',
        donorDtn: '',
        collectionType: 'Walk-in',
        collectionDate: '',
        volume: ''
      });
      
      // Refresh backend table logs
      await fetchMilkRecords();
      alert('Milk collection log saved successfully!');

    } catch (err) {
      console.error('Submission processing error:', err.message);
      setErrorMsg(err.message); // Displays structural validation notices to UI context
    } finally {
      setLoading(false);
    }
  };

  // Inline filter mapping matching alphanumeric tracking string searches
  const filteredRecords = records.filter(rec => 
    String(rec.donor_dtn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(rec.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to color-code statuses dynamically based on check constraints
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Available':
      case 'Passed':
      case 'Pasteurized':
        return { bg: '#d4edda', text: '#155724' };
      case 'Failed':
      case 'Disposed':
        return { bg: '#f8d7da', text: '#721c24' };
      case 'Pending Lab':
      default:
        return { bg: '#fff3cd', text: '#856404' };
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Milk Records</h2>
      
      <p style={{ fontWeight: 'bold' }}>
        Total volume available for dispensing: {totalVolume} mL
      </p>

      {errorMsg && (
        <div style={{ color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '4px', marginBottom: '15px', maxWidth: '400px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSaveRecord} style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Batch Number *</label>
          <input 
            type="text" 
            name="batchNumber" 
            placeholder="e.g., BATCH-2026-02"
            value={form.batchNumber}
            onChange={handleInputChange}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Donor DTN *</label>
          <input 
            type="text" 
            name="donorDtn" 
            placeholder="e.g., DTN-20260626-0001"
            value={form.donorDtn}
            onChange={handleInputChange}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Collection Type</label>
          <select name="collectionType" value={form.collectionType} onChange={handleInputChange} disabled={loading}>
            <option value="Walk-in">Walk-in</option>
            <option value="Mobile Drive">Mobile Drive</option>
            <option value="Home Pickup">Home Pickup</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Collection Date *</label>
          <input 
            type="date" 
            name="collectionDate" 
            value={form.collectionDate}
            onChange={handleInputChange}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Volume (mL) *</label>
          <input 
            type="number" 
            name="volume" 
            step="0.01"
            placeholder="Enter volume in mL"
            value={form.volume}
            onChange={handleInputChange}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: 'max-content', marginTop: '5px', padding: '6px 12px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Processing...' : 'Save Milk Record'}
        </button>
      </form>

      <hr />

      {/* Data Table View */}
      <h3>Milk Donation Records</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: '500' }}>Search </label>
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          placeholder="Search by Batch No. or DTN..."
          style={{ padding: '4px 8px', width: '250px' }}
        />
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Batch Number</th>
            <th>Collection ID</th>
            <th>Donor Tracking No. (DTN)</th>
            <th>Volume (mL)</th>
            <th>Collection Type</th>
            <th>Collection Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && records.length === 0 ? (
            <tr><td colSpan="7">Loading collection logs...</td></tr>
          ) : filteredRecords.length === 0 ? (
            <tr><td colSpan="7">No matching records found.</td></tr>
          ) : (
            filteredRecords.map((rec) => {
              const styles = getStatusStyle(rec.status);
              return (
                <tr key={rec.collection_id}>
                  <td style={{ fontWeight: '500' }}>{rec.batch_number}</td>
                  <td>{rec.collection_id}</td>
                  <td>{rec.donor_dtn}</td>
                  <td>{rec.volume_ml} mL</td>
                  <td>{rec.collection_type}</td>
                  <td>{rec.collection_date}</td>
                  <td>
                    <span style={{ 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: styles.bg,
                      color: styles.text,
                      fontWeight: '500'
                    }}>
                      {rec.status || 'Pending Lab'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MilkRecords;