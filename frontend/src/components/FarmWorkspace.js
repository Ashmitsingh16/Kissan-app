import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { farmAPI, aiAPI } from '../utils/api';

const emptyCrop = { cropName: '', cropType: 'rabi', sowingDate: '', areaUnderCrop: '' };
export default function FarmWorkspace({ mode = 'details' }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { id } = router.query;
  const [farm, setFarm] = useState(null);
  const [draft, setDraft] = useState(null);
  const [states, setStates] = useState([]);
  const [crop, setCrop] = useState(emptyCrop);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/auth/login');
    else if (user.userType !== 'farmer') router.replace('/dashboard');
  }, [loading, user, router]);
  useEffect(() => {
    if (!id || user?.userType !== 'farmer') return;
    let cancelled = false;
    setFarm(null); setError(''); setNotice('');
    Promise.all([farmAPI.getById(id), farmAPI.getStates()]).then(([result, stateList]) => {
      if (!cancelled) { setFarm(result.data); setDraft(result.data); setStates(stateList.data); }
    }).catch(e => { if (!cancelled) setError(e.response?.data?.message || 'Could not load this farm. Please try again.'); });
    return () => { cancelled = true; };
  }, [id, user]);
  const run = async action => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e.response?.data?.message || e.message || 'Could not save. Please retry.'); }
    finally { setBusy(false); }
  };
  const saveFarm = e => { e.preventDefault(); run(async () => {
    const { farmName, totalArea, areaUnit, location, soilType, irrigationType } = draft;
    const cleanLocation = { ...location };
    if (!cleanLocation.pincode) delete cleanLocation.pincode;
    const result = await farmAPI.update(id, { farmName, totalArea: Number(totalArea), areaUnit, location: cleanLocation, soilType, irrigationType });
    setFarm(result.data); setDraft(result.data); setNotice('Farm saved.');
  }); };
  const addCrop = e => { e.preventDefault(); run(async () => {
    const result = await farmAPI.addCrop(id, { ...crop, areaUnderCrop: Number(crop.areaUnderCrop) });
    setFarm(result.data); setCrop(emptyCrop); setNotice('Crop added.');
  }); };
  const field = (label, key, props = {}) => <label className="block" key={key}>{label}<input className="input-field mt-1" value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: e.target.value })} {...props} /></label>;
  if (loading || !user || user.userType !== 'farmer') return <p className="p-8">Loading…</p>;
  return <DashboardLayout>
    <Link className="text-primary-600" href="/dashboard/farms">← Back to farms</Link>
    <h1 className="text-2xl font-bold my-4">{mode === 'edit' ? 'Edit farm' : mode === 'crops' ? 'Manage crops' : 'Farm details'}</h1>
    {error && <p role="alert" className="p-4 mb-4 bg-red-100 text-red-900 rounded">{error}</p>}
    {notice && <p role="status" className="p-4 mb-4 bg-green-100 text-green-900 rounded">{notice}</p>}
    {!farm ? !error && <p>Loading farm…</p> : <>
      <nav className="flex gap-4 mb-6" aria-label="Farm sections">
        <Link href={`/dashboard/farms/${id}`}>Details</Link><Link href={`/dashboard/farms/${id}/edit`}>Edit farm</Link><Link href={`/dashboard/farms/${id}/crops`}>Manage crops</Link>
      </nav>
      {!farm.isActive && <p className="mb-4">This farm has been removed from active farms.</p>}
      {mode === 'edit' ? <form onSubmit={saveFarm} className="card space-y-4">
        {field('Farm name', 'farmName', { required: true })}
        {field('Total area', 'totalArea', { type: 'number', min: '0.1', step: 'any', required: true })}
        <label className="block">Area unit<select className="input-field" value={draft.areaUnit} onChange={e => setDraft({ ...draft, areaUnit: e.target.value })}>{['acres', 'hectares', 'bigha'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="block">State<select required className="input-field" value={draft.location.state} onChange={e => setDraft({ ...draft, location: { ...draft.location, state: e.target.value } })}>{states.map(x => <option key={x}>{x}</option>)}</select></label>
        {['district', 'village', 'pincode'].map(key => <label className="block capitalize" key={key}>{key}<input className="input-field" required={key === 'district'} pattern={key === 'pincode' ? '[0-9]{6}' : undefined} value={draft.location[key] || ''} onChange={e => setDraft({ ...draft, location: { ...draft.location, [key]: e.target.value } })} /></label>)}
        <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save farm'}</button>
      </form> : <section className="card mb-6"><h2 className="text-xl font-semibold">{farm.farmName}</h2><p>{farm.location.district}, {farm.location.state}</p><p>{farm.totalArea} {farm.areaUnit}</p><p>Soil: {farm.soilType || 'Not specified'} · Irrigation: {farm.irrigationType || 'Not specified'}</p></section>}
      {mode !== 'edit' && <section className="space-y-4">
        <h2 className="text-xl font-semibold">Crops</h2>
        {!farm.crops.length && <p>No crops yet. Add your first crop below.</p>}
        {farm.crops.map(item => <article key={item._id} className="card space-y-2"><h3 className="font-semibold">{item.cropName}</h3><p>{item.areaUnderCrop} {farm.areaUnit} · {item.cropType}</p><p>Sown: {item.sowingDate?.slice(0, 10)} · Status: {item.status}</p><p>Expected harvest: {item.expectedHarvestDate?.slice(0, 10) || 'Not set'}</p>
          {mode === 'crops' && <><label className="block">Crop status<select className="input-field" disabled={busy} value={item.status} onChange={e => { const status = e.target.value; run(async () => { const result = await farmAPI.updateCrop(id, item._id, { status }); setFarm(result.data); setNotice('Crop status saved.'); }); }}>{['sowing', 'growing', 'ready_to_harvest', 'harvested', 'sold'].map(x => <option key={x}>{x}</option>)}</select></label>
          <button disabled={busy} className="btn-outline" onClick={() => run(async () => { await aiAPI.predictHarvest(id, item._id); const result = await farmAPI.getById(id); setFarm(result.data); setNotice('AI harvest estimate updated. Review it against actual crop conditions.'); })}>Estimate harvest with AI</button></>}
        </article>)}
      </section>}
      {mode === 'crops' && <form onSubmit={addCrop} className="card space-y-4 mt-6"><h2 className="text-xl font-semibold">Add crop</h2>
        <label className="block">Crop name<input required className="input-field" value={crop.cropName} onChange={e => setCrop({ ...crop, cropName: e.target.value })} /></label>
        <label className="block">Season<select className="input-field" value={crop.cropType} onChange={e => setCrop({ ...crop, cropType: e.target.value })}>{['kharif', 'rabi', 'zaid'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="block">Sowing date<input required type="date" className="input-field" value={crop.sowingDate} onChange={e => setCrop({ ...crop, sowingDate: e.target.value })} /></label>
        <label className="block">Area ({farm.areaUnit})<input required type="number" min="0.1" step="any" className="input-field" value={crop.areaUnderCrop} onChange={e => setCrop({ ...crop, areaUnderCrop: e.target.value })} /></label>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add crop'}</button>
      </form>}
    </>}
  </DashboardLayout>;
}
