import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔧 Replace these with your Supabase project values
const SUPABASE_URL = "https://zppkkolnuobwvrunsdkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGtrb2xudW9id3ZydW5zZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTY5NTEsImV4cCI6MjA4NjkzMjk1MX0.hp9m4QudTMi-eKBjyEsRzEel4_QoPJCAvbur06INtnE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CURRENCY = "₪";
const CORRECT_PIN = "090353";
const STATUS = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  late: "bg-red-100 text-red-700",
};

function fmt(n) { return Number(n || 0).toLocaleString(); }
function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null; }
const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";

function Badge({ status }) {
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>;
}
function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black bg-opacity-50">
      <div className="bg-gray-50 rounded-t-3xl overflow-y-auto pb-8" style={{ maxHeight: "92vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white rounded-t-3xl sticky top-0">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl font-bold">&times;</button>
        </div>
        <div className="px-5 pt-4">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>;
}
function Btn({ onClick, children, variant = "primary", className = "" }) {
  const cls = variant === "primary" ? "bg-indigo-600 text-white active:bg-indigo-700"
    : variant === "ghost" ? "bg-gray-100 text-gray-700 active:bg-gray-200"
    : "bg-red-50 text-red-500 active:bg-red-100";
  return <button onClick={onClick} className={`${cls} font-semibold rounded-xl px-4 py-3 text-sm transition-colors ${className}`}>{children}</button>;
}

const Icons = {
  dashboard: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${a}`}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  payments: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${a}`}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  contracts: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${a}`}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  properties: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${a}`}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
};
const TABS = [
  { key: "dashboard", label: "Home" },
  { key: "payments", label: "Payments" },
  { key: "contracts", label: "Contracts" },
  { key: "properties", label: "Properties" },
];

// ─── PIN SCREEN ───────────────────────────────────────────────────────────────

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const press = useCallback((val) => {
    setPin(prev => {
      if (prev.length >= 6) return prev;
      const next = prev + val;
      if (next.length === 6) {
        if (next === CORRECT_PIN) {
          setTimeout(() => onUnlock(), 150);
        } else {
          setShake(true);
          setAttempts(a => a + 1);
          setTimeout(() => { setPin(""); setShake(false); }, 600);
        }
      }
      return next;
    });
  }, [onUnlock]);

  const del = useCallback(() => setPin(p => p.slice(0, -1)), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") del();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [press, del]);
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 bg-indigo-700 flex flex-col items-center justify-center" style={{ fontFamily: "system-ui,sans-serif" }}>
      <div className="text-white text-3xl font-bold mb-1">🏠 PropManager</div>
      <div className="text-indigo-300 text-sm mb-10">Enter your PIN to continue</div>
      <div className={`flex gap-3 mb-10 transition-transform ${shake ? "animate-bounce" : ""}`}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? "bg-white border-white" : "border-indigo-300"}`} />
        ))}
      </div>
      {attempts > 0 && <div className="text-red-300 text-sm mb-4">Incorrect PIN. Try again.</div>}
      <div className="grid grid-cols-3 gap-4">
        {keys.map((k, i) => (
          k === "" ? <div key={i} /> :
          <button key={i} onClick={() => k === "⌫" ? del() : press(k)}
            className="w-20 h-20 rounded-full bg-indigo-600 active:bg-indigo-500 text-white text-2xl font-semibold flex items-center justify-center shadow-lg">
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pay, c] = await Promise.all([
        supabase.from("properties").select("*").order("created_at"),
        supabase.from("payments").select("*").order("month", { ascending: false }),
        supabase.from("contracts").select("*").order("created_at"),
      ]);
      if (p.error) throw p.error;
      if (pay.error) throw pay.error;
      if (c.error) throw c.error;
      setProperties(p.data || []);
      setPayments(pay.data || []);
      setContracts(c.data || []);
    } catch (e) {
      setError("Could not connect to database. Check your Supabase config.");
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadData(); }, [unlocked, loadData]);

  // CRUD helpers
  async function addProperty(f) {
    const { error } = await supabase.from("properties").insert([f]);
    if (!error) { loadData(); setModal(null); }
  }
  async function addPayment(f) {
    const { error } = await supabase.from("payments").insert([f]);
    if (!error) { loadData(); setModal(null); }
  }
  async function addContract(f) {
    const { error } = await supabase.from("contracts").insert([f]);
    if (!error) { loadData(); setModal(null); }
  }
  async function updatePaymentStatus(id, status) {
    await supabase.from("payments").update({ status }).eq("id", id);
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }
  async function delItem(table, id) {
    await supabase.from(table).delete().eq("id", id);
    if (table === "properties") setProperties(p => p.filter(i => i.id !== id));
    if (table === "payments") setPayments(p => p.filter(i => i.id !== id));
    if (table === "contracts") setContracts(p => p.filter(i => i.id !== id));
  }

  const propName = (id) => properties.find(p => p.id === id)?.name || "—";

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-indigo-400 text-lg font-semibold animate-pulse">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 px-8">
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-red-500 font-semibold mb-2">Connection Error</div>
        <div className="text-gray-500 text-sm mb-6">{error}</div>
        <Btn onClick={loadData}>Try Again</Btn>
      </div>
    </div>
  );

  const thisMonth = new Date().toISOString().slice(0, 7);
  const mp = payments.filter(p => p.month === thisMonth);
  const totalExp = properties.reduce((s, p) => s + (+p.rent || 0), 0);
  const collected = mp.filter(p => p.status === "paid").reduce((s, p) => s + (+p.amount || 0), 0);
  const pending = mp.filter(p => p.status === "pending").reduce((s, p) => s + (+p.amount || 0), 0);
  const late = mp.filter(p => p.status === "late").reduce((s, p) => s + (+p.amount || 0), 0);
  const pct = totalExp > 0 ? Math.min(100, Math.round((collected / totalExp) * 100)) : 0;
  const expiring = contracts.filter(c => { const d = daysUntil(c.end_date); return d !== null && d <= 60 && d >= 0; });

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: "system-ui,sans-serif" }}>
      <div className="bg-indigo-700" style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="bg-indigo-700 text-white px-5 pt-3 pb-4 flex-shrink-0 flex items-end justify-between">
        <div>
          <div className="text-xs text-indigo-300 font-semibold uppercase tracking-widest mb-0.5">PropManager</div>
          <div className="text-2xl font-bold">{TABS.find(t => t.key === tab)?.label}</div>
        </div>
        <button onClick={() => setUnlocked(false)} className="text-indigo-300 text-xs font-semibold pb-1">🔒 Lock</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
              {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Expected", val: totalExp, color: "text-indigo-700" },
                { label: "Collected", val: collected, color: "text-green-600" },
                { label: "Pending", val: pending, color: "text-amber-500" },
                { label: "Late", val: late, color: "text-red-500" },
              ].map(s => (
                <Card key={s.label} className="p-4">
                  <div className="text-xs text-gray-400 font-semibold mb-1">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color}`}>{CURRENCY}{fmt(s.val)}</div>
                </Card>
              ))}
            </div>
            <Card className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">Collection</span>
                <span className="font-bold text-indigo-600">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-indigo-500 to-green-400 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{CURRENCY}{fmt(collected)} collected</span>
                <span>{CURRENCY}{fmt(totalExp)} expected</span>
              </div>
            </Card>
            {expiring.length > 0 && (
              <Card className="p-4 border-orange-200 bg-orange-50">
                <div className="font-bold text-orange-700 mb-2">⚠️ Contracts Expiring Soon</div>
                {expiring.map(c => (
                  <div key={c.id} className="text-sm text-orange-800 mb-1">
                    <span className="font-semibold">{propName(c.property_id)}</span> · {c.tenant_name} · <span className="font-bold">{daysUntil(c.end_date)}d left</span>
                  </div>
                ))}
              </Card>
            )}
            <Card className="overflow-hidden">
              <div className="px-4 pt-4 pb-2 font-bold text-gray-700 border-b">This Month</div>
              {mp.length === 0
                ? <div className="text-center text-gray-400 py-8 text-sm">No payments logged this month</div>
                : mp.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3.5 border-b last:border-0">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{propName(p.property_id)}</div>
                      <div className="text-xs text-gray-400">{p.tenant_name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{CURRENCY}{fmt(p.amount)}</span>
                      <Badge status={p.status} />
                    </div>
                  </div>
                ))
              }
            </Card>
            <div className="text-center text-xs text-gray-400 py-2">{properties.length} properties · {contracts.length} contracts</div>
          </div>
        )}

        {/* PAYMENTS */}
        {tab === "payments" && (
          <div className="space-y-3">
            <Btn onClick={() => setModal("payment")} className="w-full py-4 text-base">+ Log Payment</Btn>
            {payments.length === 0
              ? <div className="text-center text-gray-400 py-16">No payments yet</div>
              : payments.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-gray-800">{propName(p.property_id)}</div>
                    <div className="text-sm text-gray-500">{p.tenant_name} · {p.month}</div>
                    {p.note ? <div className="text-xs text-gray-400 mt-0.5">{p.note}</div> : null}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-700 text-lg">{CURRENCY}{fmt(p.amount)}</div>
                    <Badge status={p.status} />
                  </div>
                </div>
                <div className="flex gap-2">
                  {["paid","pending","late"].filter(s => s !== p.status).map(s => (
                    <Btn key={s} variant="ghost" onClick={() => updatePaymentStatus(p.id, s)} className="flex-1 py-2 text-xs">→ {s}</Btn>
                  ))}
                  <Btn variant="danger" onClick={() => delItem("payments", p.id)} className="py-2 px-3">🗑</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CONTRACTS */}
        {tab === "contracts" && (
          <div className="space-y-3">
            <Btn onClick={() => setModal("contract")} className="w-full py-4 text-base">+ Add Contract</Btn>
            {contracts.length === 0
              ? <div className="text-center text-gray-400 py-16">No contracts yet</div>
              : contracts.map(c => {
              const d = daysUntil(c.end_date);
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="font-bold text-gray-800">{propName(c.property_id)}</div>
                      <div className="text-sm text-gray-500">{c.tenant_name}</div>
                      <div className="text-xs text-gray-400 mt-1">{c.start_date} → {c.end_date}</div>
                      {c.notes ? <div className="text-xs text-gray-400 mt-0.5">{c.notes}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-700">{CURRENCY}{fmt(c.monthly_rent)}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                      {d !== null && (
                        <div className={`text-xs font-bold mt-1 ${d < 0 ? "text-gray-400" : d <= 30 ? "text-red-500" : d <= 60 ? "text-orange-500" : "text-green-500"}`}>
                          {d < 0 ? "Expired" : `${d}d left`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Btn variant="danger" onClick={() => delItem("contracts", c.id)} className="py-2 px-3">🗑</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* PROPERTIES */}
        {tab === "properties" && (
          <div className="space-y-3">
            <Btn onClick={() => setModal("property")} className="w-full py-4 text-base">+ Add Property</Btn>
            {properties.length === 0
              ? <div className="text-center text-gray-400 py-16">No properties yet — add one to get started!</div>
              : properties.map(p => {
              const contract = contracts.find(c => c.property_id === p.id);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-800">{p.name}</div>
                      <div className="text-sm text-gray-400">{p.address}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.type}</div>
                      {contract && <div className="text-xs text-indigo-500 mt-1 font-semibold">👤 {contract.tenant_name}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-700 text-lg">{CURRENCY}{fmt(p.rent)}</div>
                      <div className="text-xs text-gray-400">per month</div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Btn variant="danger" onClick={() => delItem("properties", p.id)} className="py-2 px-3">🗑</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${active ? "text-indigo-600" : "text-gray-400"}`}>
              {Icons[t.key](active ? "stroke-indigo-600" : "stroke-gray-400")}
              <span className={`text-xs font-semibold ${active ? "text-indigo-600" : "text-gray-400"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {modal === "property" && <PropertySheet onClose={() => setModal(null)} onSave={addProperty} />}
      {modal === "payment" && <PaymentSheet properties={properties} onClose={() => setModal(null)} onSave={addPayment} />}
      {modal === "contract" && <ContractSheet properties={properties} onClose={() => setModal(null)} onSave={addContract} />}
    </div>
  );
}

function PropertySheet({ onClose, onSave }) {
  const [f, setF] = useState({ name: "", address: "", type: "Apartment", rent: "" });
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Sheet title="Add Property" onClose={onClose}>
      <Field label="Property Name"><input className={inputCls} value={f.name} onChange={s("name")} placeholder="e.g. Apt 3B – Tel Aviv" /></Field>
      <Field label="Address"><input className={inputCls} value={f.address} onChange={s("address")} placeholder="Street, City" /></Field>
      <Field label="Type">
        <select className={inputCls} value={f.type} onChange={s("type")}>
          <option>Apartment</option><option>Commercial</option><option>Office</option><option>Other</option>
        </select>
      </Field>
      <Field label={`Monthly Rent (${CURRENCY})`}><input className={inputCls} type="number" value={f.rent} onChange={s("rent")} placeholder="0" /></Field>
      <Btn onClick={() => f.name && f.rent && onSave({ name: f.name, address: f.address, type: f.type, rent: Number(f.rent) })} className="w-full py-4 text-base mt-2">Save Property</Btn>
    </Sheet>
  );
}

function PaymentSheet({ properties, onClose, onSave }) {
  const now = new Date().toISOString().slice(0, 7);
  const [f, setF] = useState({ property_id: properties[0]?.id || "", tenant_name: "", amount: "", month: now, status: "paid", note: "" });
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Sheet title="Log Payment" onClose={onClose}>
      {properties.length === 0 ? <p className="text-gray-500 text-center py-8">Add a property first.</p> : <>
        <Field label="Property">
          <select className={inputCls} value={f.property_id} onChange={s("property_id")}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Tenant Name"><input className={inputCls} value={f.tenant_name} onChange={s("tenant_name")} placeholder="Tenant name" /></Field>
        <Field label={`Amount (${CURRENCY})`}><input className={inputCls} type="number" value={f.amount} onChange={s("amount")} placeholder="0" /></Field>
        <Field label="Month"><input className={inputCls} type="month" value={f.month} onChange={s("month")} /></Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={s("status")}>
            <option value="paid">Paid</option><option value="pending">Pending</option><option value="late">Late</option>
          </select>
        </Field>
        <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={s("note")} placeholder="e.g. Bank transfer" /></Field>
        <Btn onClick={() => f.property_id && f.amount && onSave({ ...f, amount: Number(f.amount) })} className="w-full py-4 text-base mt-2">Log Payment</Btn>
      </>}
    </Sheet>
  );
}

function ContractSheet({ properties, onClose, onSave }) {
  const [f, setF] = useState({ property_id: properties[0]?.id || "", tenant_name: "", monthly_rent: "", start_date: "", end_date: "", notes: "" });
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Sheet title="Add Contract" onClose={onClose}>
      {properties.length === 0 ? <p className="text-gray-500 text-center py-8">Add a property first.</p> : <>
        <Field label="Property">
          <select className={inputCls} value={f.property_id} onChange={s("property_id")}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Tenant Name"><input className={inputCls} value={f.tenant_name} onChange={s("tenant_name")} placeholder="Full name" /></Field>
        <Field label={`Monthly Rent (${CURRENCY})`}><input className={inputCls} type="number" value={f.monthly_rent} onChange={s("monthly_rent")} placeholder="0" /></Field>
        <Field label="Start Date"><input className={inputCls} type="date" value={f.start_date} onChange={s("start_date")} /></Field>
        <Field label="End Date"><input className={inputCls} type="date" value={f.end_date} onChange={s("end_date")} /></Field>
        <Field label="Notes (optional)"><input className={inputCls} value={f.notes} onChange={s("notes")} placeholder="Any additional info" /></Field>
        <Btn onClick={() => f.tenant_name && f.property_id && f.monthly_rent && onSave({ ...f, monthly_rent: Number(f.monthly_rent) })} className="w-full py-4 text-base mt-2">Save Contract</Btn>
      </>}
    </Sheet>
  );
}
