import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { appointmentAPI } from '../../../utils/api';
export default function AppointmentDetails() {
  const router = useRouter(); const { id } = router.query;
  const { user, loading } = useAuth();
  const [item, setItem] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && !user) router.replace('/auth/login'); }, [loading, user, router]);
  useEffect(() => { if (!id || !user) return; let cancelled = false;
    appointmentAPI.getById(id).then(r => { if (!cancelled) setItem(r.data); }).catch(e => { if (!cancelled) setError(e.response?.data?.message || 'Could not load appointment.'); });
    return () => { cancelled = true; };
  }, [id, user]);
  const cancel = async () => { if (!window.confirm('Cancel this appointment?')) return; setBusy(true); setError('');
    try { const result = await appointmentAPI.cancel(id); setItem(result.data.appointment); }
    catch(e) { setError(e.response?.data?.message || 'Could not cancel.'); } finally { setBusy(false); }
  };
  if (loading || !user) return <p className="p-8">Loading…</p>;
  return <DashboardLayout><Link href="/dashboard/appointments">← Back to appointments</Link><h1 className="text-2xl font-bold my-4">Appointment details</h1>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!item ? !error && <p>Loading…</p> : <section className="card space-y-3">
      <p>Reference: {item._id}</p><p>Farm: {item.farm?.farmName || 'See farm records'}</p><p>Status: {item.status}</p>
      <p>Preferred date: {item.preferredDate?.slice(0,10)} · {item.preferredTimeSlot}</p><p>Straw: {item.strawDetails?.quantity} {item.strawDetails?.quantityUnit} ({item.strawDetails?.cropType})</p>
      <p>Payment status: {item.paymentStatus || 'pending'}</p><p>Recorded amount: ₹{item.paymentAmount || 0}</p>
      <p>Payment records are entered by officers; this app does not initiate a bank transfer.</p>
      {['pending','approved'].includes(item.status) && <button disabled={busy} className="btn-outline" onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel appointment'}</button>}
    </section>}
  </DashboardLayout>;
}
