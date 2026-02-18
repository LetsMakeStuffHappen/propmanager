import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CURRENCY = "₪";
const CORRECT_PIN = "090353";

const STATUS_STYLE = {
  paid: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  late: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
};
const EXPENSE_CATEGORIES = ["Repair","Maintenance","Utilities","Insurance","Tax","Management","Renovation","Other"];
const PROPERTY_TYPES = ["Apartment","House","Commercial","Office","Studio","Other"];

function fmt(n) { return Number(n||0).toLocaleString(); }
function fmtDate(d) { if(!d) return ""; const dt = new Date(d); return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function daysUntil(d) { return d ? Math.ceil((new Date(d)-new Date())/86400000) : null; }
function ordinal(n) { const s=["th","st","nd","rd"]; const v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
function thisMonth() { return new Date().toISOString().slice(0,7); }

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

// ── UI PRIMITIVES ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg:"bg-gray-100", text:"text-gray-500", dot:"bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      {status}
    </span>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{background:"rgba(0,0,0,0.6)"}}>
      <div className="rounded-t-3xl overflow-y-auto pb-10" style={{background:"#f8f7ff", maxHeight:"94vh"}}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white rounded-t-3xl sticky top-0 z-10">
          <h2 className="font-bold text-lg text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl">&times;</button>
        </div>
        <div className="px-5 pt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, half }) {
  return (
    <div className={`mb-4 ${half?"flex-1":""}`}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div className="flex gap-3">{children}</div>;
}

function Card({ children, className="", onClick }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${onClick?"cursor-pointer active:scale-98":""} ${className}`}>
      {children}
    </div>
  );
}

function Btn({ onClick, children, variant="primary", className="", disabled }) {
  const cls = variant==="primary" ? "bg-violet-600 text-white active:bg-violet-700 shadow-sm shadow-violet-200"
    : variant==="ghost" ? "bg-gray-100 text-gray-700 active:bg-gray-200"
    : variant==="danger" ? "bg-red-50 text-red-500 active:bg-red-100"
    : variant==="success" ? "bg-emerald-500 text-white active:bg-emerald-600"
    : "bg-gray-800 text-white";
  return (
    <button disabled={disabled} onClick={onClick}
      className={`${cls} font-semibold rounded-xl px-4 py-3 text-sm transition-all ${disabled?"opacity-40":""} ${className}`}>
      {children}
    </button>
  );
}

function Stat({ label, value, sub, color="text-gray-800", small }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-semibold mb-0.5">{label}</div>
      <div className={`font-bold ${small?"text-lg":"text-2xl"} ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  payment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  expense: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  contract: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
};

const TABS = [
  { key:"dashboard", label:"Overview", icon: Icon.home },
  { key:"payments", label:"Payments", icon: Icon.payment },
  { key:"expenses", label:"Expenses", icon: Icon.expense },
  { key:"contracts", label:"Leases", icon: Icon.contract },
];

// ── PIN SCREEN ─────────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const press = useCallback((val) => {
    setPin(prev => {
      if (prev.length >= 6) return prev;
      const next = prev + val;
      if (next.length === 6) {
        if (next === CORRECT_PIN) { setTimeout(() => onUnlock(), 150); return next; }
        else { setShake(true); setAttempts(a=>a+1); setTimeout(()=>{ setPin(""); setShake(false); },600); }
      }
      return next;
    });
  }, [onUnlock]);

  const del = useCallback(() => setPin(p => p.slice(0,-1)), []);

  useEffect(() => {
    const h = e => { if(e.key>="0"&&e.key<="9") press(e.key); else if(e.key==="Backspace") del(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [press, del]);

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{background:"linear-gradient(135deg,#4f1b99 0%,#7c3aed 50%,#a855f7 100%)", fontFamily:"system-ui,sans-serif"}}>
      <div className="mb-2 text-5xl">🏠</div>
      <div className="text-white text-3xl font-black mb-1 tracking-tight">PropManager</div>
      <div className="text-purple-200 text-sm mb-10">Your properties, under control</div>
      <div className={`flex gap-3 mb-8 ${shake?"animate-bounce":""}`}>
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${i<pin.length?"bg-white border-white scale-110":"border-purple-300"}`}/>
        ))}
      </div>
      {attempts>0 && <div className="text-red-300 text-sm mb-4 font-semibold">Incorrect PIN — try again</div>}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k,i)=> k===""?<div key={i}/>:(
          <button key={i} onClick={()=>k==="⌫"?del():press(k)}
            className="w-20 h-20 rounded-2xl text-white text-2xl font-bold flex items-center justify-center transition-all active:scale-95"
            style={{background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)"}}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PROPERTY DETAIL MODAL ──────────────────────────────────────────────────────
function PropertyDetail({ prop, payments, expenses, contracts, onClose, onUpdateRent }) {
  const [showRentUpdate, setShowRentUpdate] = useState(false);
  const [newRent, setNewRent] = useState(prop.rent);
  const [note, setNote] = useState("");

  const contract = contracts.find(c=>c.property_id===prop.id);
  const propPayments = payments.filter(p=>p.property_id===prop.id);
  const propExpenses = expenses.filter(e=>e.property_id===prop.id);
  const totalIncome = propPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+(+p.amount||0),0);
  const totalExpenses = propExpenses.reduce((s,e)=>s+(+e.amount||0),0);
  const netIncome = totalIncome - totalExpenses;
  const month = thisMonth();
  const monthlyPaid = propPayments.filter(p=>p.month===month&&p.status==="paid").reduce((s,p)=>s+(+p.amount||0),0);
  const monthlyExp = propExpenses.filter(e=>e.date?.slice(0,7)===month).reduce((s,e)=>s+(+e.amount||0),0);

  return (
    <Sheet title={prop.name} onClose={onClose}>
      {/* Header card */}
      <div className="rounded-2xl p-4 mb-4 text-white" style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)"}}>
        <div className="text-purple-200 text-xs mb-1">{prop.address}</div>
        <div className="text-3xl font-black">{CURRENCY}{fmt(prop.rent)}<span className="text-lg font-normal text-purple-200">/mo</span></div>
        <div className="text-purple-200 text-sm mt-1">Due on the {ordinal(prop.due_day||1)} of each month</div>
        {prop.rent_updated_at && <div className="text-purple-300 text-xs mt-2">Last rent update: {fmtDate(prop.rent_updated_at)}</div>}
      </div>

      {/* This month */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-3"><Stat label="This Month Income" value={`${CURRENCY}${fmt(monthlyPaid)}`} color="text-emerald-600" small/></Card>
        <Card className="p-3"><Stat label="This Month Costs" value={`${CURRENCY}${fmt(monthlyExp)}`} color="text-red-500" small/></Card>
        <Card className="p-3"><Stat label="Total Collected" value={`${CURRENCY}${fmt(totalIncome)}`} small/></Card>
        <Card className="p-3"><Stat label="Net (all time)" value={`${CURRENCY}${fmt(netIncome)}`} color={netIncome>=0?"text-emerald-600":"text-red-500"} small/></Card>
      </div>

      {/* Tenant info */}
      {contract && (
        <Card className="p-4 mb-4">
          <div className="font-bold text-gray-700 mb-2">👤 Current Tenant</div>
          <div className="text-sm font-semibold text-gray-800">{contract.tenant_name}</div>
          {contract.tenant_phone && <div className="text-sm text-gray-500 mt-0.5">📞 {contract.tenant_phone}</div>}
          {contract.tenant_email && <div className="text-sm text-gray-500 mt-0.5">✉️ {contract.tenant_email}</div>}
          <div className="text-xs text-gray-400 mt-2">{fmtDate(contract.start_date)} → {fmtDate(contract.end_date)}</div>
          {contract.notes && <div className="text-xs text-gray-400 mt-1 italic">"{contract.notes}"</div>}
        </Card>
      )}

      {/* Recent payments */}
      {propPayments.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="px-4 pt-3 pb-2 font-bold text-gray-700 text-sm border-b">Recent Payments</div>
          {propPayments.slice(0,5).map(p=>(
            <div key={p.id} className="flex justify-between items-center px-4 py-3 border-b last:border-0">
              <div><div className="text-sm font-semibold text-gray-700">{p.month}</div><Badge status={p.status}/></div>
              <div className="font-bold text-gray-800">{CURRENCY}{fmt(p.amount)}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Recent expenses */}
      {propExpenses.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="px-4 pt-3 pb-2 font-bold text-gray-700 text-sm border-b">Recent Expenses</div>
          {propExpenses.slice(0,5).map(e=>(
            <div key={e.id} className="flex justify-between items-center px-4 py-3 border-b last:border-0">
              <div><div className="text-sm font-semibold text-gray-700">{e.description}</div><div className="text-xs text-gray-400">{e.category} · {fmtDate(e.date)}</div></div>
              <div className="font-bold text-red-500">-{CURRENCY}{fmt(e.amount)}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Update rent */}
      {!showRentUpdate ? (
        <Btn onClick={()=>setShowRentUpdate(true)} variant="ghost" className="w-full py-3">📈 Update Rent Amount</Btn>
      ) : (
        <Card className="p-4">
          <div className="font-bold text-gray-700 mb-3">Update Monthly Rent</div>
          <Field label="New Rent Amount">
            <input className={inputCls} type="number" value={newRent} onChange={e=>setNewRent(e.target.value)} />
          </Field>
          <Field label="Reason / Note">
            <input className={inputCls} value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Annual increase, new agreement..." />
          </Field>
          <div className="flex gap-2">
            <Btn onClick={()=>onUpdateRent(prop.id, newRent, note)} variant="success" className="flex-1 py-3">Save</Btn>
            <Btn onClick={()=>setShowRentUpdate(false)} variant="ghost" className="py-3 px-4">Cancel</Btn>
          </div>
        </Card>
      )}
    </Sheet>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [selectedProp, setSelectedProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p,pay,exp,con] = await Promise.all([
        supabase.from("properties").select("*").order("created_at"),
        supabase.from("payments").select("*").order("month",{ascending:false}),
        supabase.from("expenses").select("*").order("date",{ascending:false}),
        supabase.from("contracts").select("*").order("created_at"),
      ]);
      if(p.error||pay.error||exp.error||con.error) throw new Error("DB error");
      setProperties(p.data||[]); setPayments(pay.data||[]);
      setExpenses(exp.data||[]); setContracts(con.data||[]);
    } catch(e) { setError("Could not connect to database. Check your Supabase config."); }
    setLoading(false);
  }, []);

  useEffect(() => { if(unlocked) load(); }, [unlocked, load]);

  async function addProperty(f) { const {error}=await supabase.from("properties").insert([f]); if(!error){load();setModal(null);} }
  async function addPayment(f) { const {error}=await supabase.from("payments").insert([f]); if(!error){load();setModal(null);} }
  async function addExpense(f) { const {error}=await supabase.from("expenses").insert([f]); if(!error){load();setModal(null);} }
  async function addContract(f) { const {error}=await supabase.from("contracts").insert([f]); if(!error){load();setModal(null);} }
  async function updatePaymentStatus(id,status) {
    await supabase.from("payments").update({status}).eq("id",id);
    setPayments(prev=>prev.map(p=>p.id===id?{...p,status}:p));
  }
  async function updateRent(id, rent, note) {
    await supabase.from("properties").update({rent:Number(rent), rent_note:note, rent_updated_at:new Date().toISOString()}).eq("id",id);
    load(); setSelectedProp(null);
  }
  async function del(table,id) {
    await supabase.from(table).delete().eq("id",id);
    load();
  }

  const propName = id => properties.find(p=>p.id===id)?.name||"—";

  if(!unlocked) return <PinScreen onUnlock={()=>setUnlocked(true)}/>;
  if(loading) return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-violet-400 text-lg font-bold animate-pulse">Loading your properties...</div></div>;
  if(error) return <div className="flex items-center justify-center h-screen bg-gray-50 px-8"><div className="text-center"><div className="text-5xl mb-4">⚠️</div><div className="text-red-500 font-bold mb-2">Connection Error</div><div className="text-gray-500 text-sm mb-6">{error}</div><Btn onClick={load}>Try Again</Btn></div></div>;

  // Dashboard calculations
  const month = thisMonth();
  const monthName = new Date().toLocaleString("default",{month:"long",year:"numeric"});
  const mp = payments.filter(p=>p.month===month);
  const me = expenses.filter(e=>e.date?.slice(0,7)===month);
  const totalRent = properties.reduce((s,p)=>s+(+p.rent||0),0);
  const collected = mp.filter(p=>p.status==="paid").reduce((s,p)=>s+(+p.amount||0),0);
  const pending = mp.filter(p=>p.status==="pending").reduce((s,p)=>s+(+p.amount||0),0);
  const late = mp.filter(p=>p.status==="late").reduce((s,p)=>s+(+p.amount||0),0);
  const monthExpenses = me.reduce((s,e)=>s+(+e.amount||0),0);
  const netMonth = collected - monthExpenses;
  const pct = totalRent>0?Math.min(100,Math.round((collected/totalRent)*100)):0;
  const expiring = contracts.filter(c=>{const d=daysUntil(c.end_date);return d!==null&&d<=60&&d>=0;});
  const overdue = properties.filter(p=>{
    const paid = mp.find(pay=>pay.property_id===p.id&&pay.status==="paid");
    const today = new Date().getDate();
    return !paid && today>(p.due_day||1)+3;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{fontFamily:"system-ui,sans-serif",background:"#f8f7ff"}}>
      <div style={{background:"linear-gradient(135deg,#4f1b99,#7c3aed)",height:"env(safe-area-inset-top,0px)"}}/>

      {/* Header */}
      <div className="flex-shrink-0 text-white px-5 pt-4 pb-5" style={{background:"linear-gradient(135deg,#4f1b99,#7c3aed)"}}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">PropManager</div>
            <div className="text-2xl font-black">{TABS.find(t=>t.key===tab)?.label}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setModal(tab==="expenses"?"expense":"payment")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold"
              style={{background:"rgba(255,255,255,0.2)"}}>+</button>
            <button onClick={()=>setUnlocked(false)} className="text-purple-300 text-xs font-bold">🔒</button>
          </div>
        </div>
        {/* Month summary strip */}
        {tab==="dashboard" && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-purple-600">
            <div><div className="text-purple-300 text-xs">Collected</div><div className="text-white font-black text-lg">{CURRENCY}{fmt(collected)}</div></div>
            <div><div className="text-purple-300 text-xs">Expenses</div><div className="text-white font-black text-lg">{CURRENCY}{fmt(monthExpenses)}</div></div>
            <div><div className="text-purple-300 text-xs">Net</div><div className={`font-black text-lg ${netMonth>=0?"text-emerald-300":"text-red-300"}`}>{CURRENCY}{fmt(netMonth)}</div></div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (
          <div className="space-y-4">
            {/* Alerts */}
            {(overdue.length>0||expiring.length>0) && (
              <div className="space-y-2">
                {overdue.map(p=>(
                  <div key={p.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <span className="text-red-500">{Icon.alert}</span>
                    <div><div className="text-sm font-bold text-red-700">{p.name} — rent overdue</div><div className="text-xs text-red-500">Due on the {ordinal(p.due_day||1)}, not yet received</div></div>
                  </div>
                ))}
                {expiring.map(c=>{
                  const p=properties.find(pr=>pr.id===c.property_id);
                  return (
                    <div key={c.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                      <span className="text-amber-500">{Icon.alert}</span>
                      <div><div className="text-sm font-bold text-amber-700">{p?.name} — lease expiring</div><div className="text-xs text-amber-600">{c.tenant_name} · {daysUntil(c.end_date)} days left</div></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collection bar */}
            <Card className="p-4">
              <div className="flex justify-between text-sm mb-3">
                <span className="font-bold text-gray-700">{monthName} Collection</span>
                <span className="font-black text-violet-600">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-4 rounded-full transition-all duration-700" style={{width:`${pct}%`, background:"linear-gradient(90deg,#7c3aed,#a855f7,#34d399)"}}/>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span className="text-emerald-600 font-semibold">{CURRENCY}{fmt(collected)} paid</span>
                {pending>0 && <span className="text-amber-500 font-semibold">{CURRENCY}{fmt(pending)} pending</span>}
                {late>0 && <span className="text-red-500 font-semibold">{CURRENCY}{fmt(late)} late</span>}
              </div>
            </Card>

            {/* Properties list */}
            <div className="font-bold text-gray-500 text-xs uppercase tracking-wider px-1">Your Properties</div>
            {properties.length===0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-3">🏠</div>
                <div className="text-gray-400 font-semibold mb-3">No properties yet</div>
                <Btn onClick={()=>setModal("property")} className="mx-auto">Add First Property</Btn>
              </Card>
            ) : properties.map(p=>{
              const contract = contracts.find(c=>c.property_id===p.id);
              const paid = mp.find(pay=>pay.property_id===p.id&&pay.status==="paid");
              const propMonthExp = expenses.filter(e=>e.property_id===p.id&&e.date?.slice(0,7)===month).reduce((s,e)=>s+(+e.amount||0),0);
              const net = (paid?+paid.amount:0) - propMonthExp;
              return (
                <Card key={p.id} className="p-4" onClick={()=>setSelectedProp(p)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-gray-800">{p.name}</div>
                        {paid ? <Badge status="paid"/> : <Badge status={new Date().getDate()>(p.due_day||1)+3?"late":"pending"}/>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.address}</div>
                      {contract && <div className="text-xs text-violet-500 font-semibold mt-1">👤 {contract.tenant_name}</div>}
                      <div className="text-xs text-gray-400 mt-0.5">Due: {ordinal(p.due_day||1)} · {p.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-violet-700 text-lg">{CURRENCY}{fmt(p.rent)}</div>
                      <div className="text-xs text-gray-400">per month</div>
                      {propMonthExp>0 && <div className="text-xs text-red-400 mt-0.5">-{CURRENCY}{fmt(propMonthExp)} costs</div>}
                      <div className={`text-xs font-bold mt-0.5 ${net>=0?"text-emerald-500":"text-red-500"}`}>Net: {CURRENCY}{fmt(net)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 mt-2 text-right">tap to view details →</div>
                </Card>
              );
            })}
            <Btn onClick={()=>setModal("property")} variant="ghost" className="w-full py-3">+ Add Property</Btn>

            {/* Recent expenses summary */}
            {expenses.filter(e=>e.date?.slice(0,7)===month).length>0 && (
              <div>
                <div className="font-bold text-gray-500 text-xs uppercase tracking-wider px-1 mb-2">This Month's Expenses</div>
                <Card className="overflow-hidden">
                  {expenses.filter(e=>e.date?.slice(0,7)===month).slice(0,4).map(e=>(
                    <div key={e.id} className="flex justify-between items-center px-4 py-3 border-b last:border-0">
                      <div><div className="text-sm font-semibold text-gray-700">{e.description}</div><div className="text-xs text-gray-400">{propName(e.property_id)} · {e.category}</div></div>
                      <div className="font-bold text-red-500">-{CURRENCY}{fmt(e.amount)}</div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab==="payments" && (
          <div className="space-y-3">
            <Btn onClick={()=>setModal("payment")} className="w-full py-4 text-base">+ Log Payment</Btn>
            {payments.length===0 ? <div className="text-center text-gray-400 py-16">No payments yet</div>
            : payments.map(p=>(
              <Card key={p.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-black text-gray-800">{propName(p.property_id)}</div>
                    <div className="text-sm text-gray-500">{p.tenant_name} · {p.month}</div>
                    {p.note&&<div className="text-xs text-gray-400 mt-0.5 italic">"{p.note}"</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-violet-700 text-xl">{CURRENCY}{fmt(p.amount)}</div>
                    <Badge status={p.status}/>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["paid","pending","late"].filter(s=>s!==p.status).map(s=>(
                    <Btn key={s} variant="ghost" onClick={()=>updatePaymentStatus(p.id,s)} className="flex-1 py-2 text-xs">→ {s}</Btn>
                  ))}
                  <Btn variant="danger" onClick={()=>del("payments",p.id)} className="py-2 px-3">🗑</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── EXPENSES ── */}
        {tab==="expenses" && (
          <div className="space-y-3">
            <Btn onClick={()=>setModal("expense")} className="w-full py-4 text-base">+ Log Expense</Btn>
            {/* Monthly total */}
            {expenses.length>0 && (
              <Card className="p-4 flex justify-between items-center">
                <div><div className="text-xs text-gray-400 font-semibold">This Month Total</div><div className="text-xl font-black text-red-500">-{CURRENCY}{fmt(monthExpenses)}</div></div>
                <div><div className="text-xs text-gray-400 font-semibold text-right">All Time</div><div className="text-xl font-black text-gray-700">-{CURRENCY}{fmt(expenses.reduce((s,e)=>s+(+e.amount||0),0))}</div></div>
              </Card>
            )}
            {expenses.length===0 ? <div className="text-center text-gray-400 py-16">No expenses logged yet</div>
            : expenses.map(e=>(
              <Card key={e.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-gray-800">{e.description}</div>
                    <div className="text-sm text-gray-500">{propName(e.property_id)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{e.category}</span>
                      <span className="text-xs text-gray-400">{fmtDate(e.date)}</span>
                    </div>
                    {e.note&&<div className="text-xs text-gray-400 mt-1 italic">"{e.note}"</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-red-500 text-xl">-{CURRENCY}{fmt(e.amount)}</div>
                    <Btn variant="danger" onClick={()=>del("expenses",e.id)} className="py-1 px-2 mt-2 text-xs">🗑</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── CONTRACTS ── */}
        {tab==="contracts" && (
          <div className="space-y-3">
            <Btn onClick={()=>setModal("contract")} className="w-full py-4 text-base">+ Add Lease</Btn>
            {contracts.length===0 ? <div className="text-center text-gray-400 py-16">No leases yet</div>
            : contracts.map(c=>{
              const d=daysUntil(c.end_date);
              const prop=properties.find(p=>p.id===c.property_id);
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-black text-gray-800">{propName(c.property_id)}</div>
                      <div className="text-sm font-semibold text-violet-600">{c.tenant_name}</div>
                      {c.tenant_phone&&<div className="text-xs text-gray-400 mt-0.5">📞 {c.tenant_phone}</div>}
                      {c.tenant_email&&<div className="text-xs text-gray-400">✉️ {c.tenant_email}</div>}
                      <div className="text-xs text-gray-400 mt-1">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</div>
                      {c.notes&&<div className="text-xs text-gray-400 mt-0.5 italic">"{c.notes}"</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-violet-700">{CURRENCY}{fmt(c.monthly_rent)}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                      {d!==null&&<div className={`text-xs font-black mt-1 ${d<0?"text-gray-400":d<=30?"text-red-500":d<=60?"text-amber-500":"text-emerald-500"}`}>{d<0?"Expired":`${d}d left`}</div>}
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <Btn variant="danger" onClick={()=>del("contracts",c.id)} className="py-1 px-3 text-xs">🗑</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 flex" style={{paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {TABS.map(t=>{
          const active=tab===t.key;
          return (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${active?"text-violet-600":"text-gray-400"}`}>
              <span className={active?"text-violet-600":"text-gray-400"}>{t.icon}</span>
              <span className={`text-xs font-bold ${active?"text-violet-600":"text-gray-400"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      {modal==="property" && <PropertySheet onClose={()=>setModal(null)} onSave={addProperty}/>}
      {modal==="payment" && <PaymentSheet properties={properties} onClose={()=>setModal(null)} onSave={addPayment}/>}
      {modal==="expense" && <ExpenseSheet properties={properties} onClose={()=>setModal(null)} onSave={addExpense}/>}
      {modal==="contract" && <ContractSheet properties={properties} onClose={()=>setModal(null)} onSave={addContract}/>}
      {selectedProp && <PropertyDetail prop={selectedProp} payments={payments} expenses={expenses} contracts={contracts} onClose={()=>setSelectedProp(null)} onUpdateRent={updateRent}/>}
    </div>
  );
}

// ── FORMS ─────────────────────────────────────────────────────────────────────
function PropertySheet({ onClose, onSave }) {
  const [f,setF] = useState({name:"",address:"",type:"Apartment",rent:"",due_day:"1"});
  const s = k=>e=>setF(p=>({...p,[k]:e.target.value}));
  return (
    <Sheet title="Add Property" onClose={onClose}>
      <Field label="Property Name"><input className={inputCls} value={f.name} onChange={s("name")} placeholder="e.g. Dizengoff 42, Apt 5"/></Field>
      <Field label="Address"><input className={inputCls} value={f.address} onChange={s("address")} placeholder="Full address"/></Field>
      <Row>
        <Field label="Type" half>
          <select className={inputCls} value={f.type} onChange={s("type")}>{PROPERTY_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Rent Due Day" half>
          <select className={inputCls} value={f.due_day} onChange={s("due_day")}>
            {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{ordinal(i+1)}</option>)}
          </select>
        </Field>
      </Row>
      <Field label={`Monthly Rent (${CURRENCY})`}><input className={inputCls} type="number" value={f.rent} onChange={s("rent")} placeholder="0"/></Field>
      <Btn onClick={()=>f.name&&f.rent&&onSave({name:f.name,address:f.address,type:f.type,rent:Number(f.rent),due_day:Number(f.due_day)})} className="w-full py-4 text-base mt-2">Save Property</Btn>
    </Sheet>
  );
}

function PaymentSheet({ properties, onClose, onSave }) {
  const now = thisMonth();
  const [f,setF] = useState({property_id:properties[0]?.id||"",tenant_name:"",amount:"",month:now,status:"paid",note:""});
  const s = k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const selectedProp = properties.find(p=>p.id===f.property_id);
  useEffect(()=>{ if(selectedProp&&!f.amount) setF(p=>({...p,amount:selectedProp.rent})); },[f.property_id]);
  return (
    <Sheet title="Log Payment" onClose={onClose}>
      {properties.length===0?<p className="text-gray-500 text-center py-8">Add a property first.</p>:<>
        <Field label="Property">
          <select className={inputCls} value={f.property_id} onChange={s("property_id")}>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field label="Tenant Name"><input className={inputCls} value={f.tenant_name} onChange={s("tenant_name")} placeholder="Tenant name"/></Field>
        <Row>
          <Field label={`Amount (${CURRENCY})`} half><input className={inputCls} type="number" value={f.amount} onChange={s("amount")} placeholder="0"/></Field>
          <Field label="Month" half><input className={inputCls} type="month" value={f.month} onChange={s("month")}/></Field>
        </Row>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={s("status")}><option value="paid">Paid ✅</option><option value="pending">Pending ⏳</option><option value="late">Late ⚠️</option></select>
        </Field>
        <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={s("note")} placeholder="e.g. Bank transfer, cash..."/></Field>
        <Btn onClick={()=>f.property_id&&f.amount&&onSave({...f,amount:Number(f.amount)})} className="w-full py-4 text-base mt-2">Log Payment</Btn>
      </>}
    </Sheet>
  );
}

function ExpenseSheet({ properties, onClose, onSave }) {
  const [f,setF] = useState({property_id:properties[0]?.id||"",description:"",amount:"",category:"Repair",date:new Date().toISOString().slice(0,10),note:""});
  const s = k=>e=>setF(p=>({...p,[k]:e.target.value}));
  return (
    <Sheet title="Log Expense" onClose={onClose}>
      {properties.length===0?<p className="text-gray-500 text-center py-8">Add a property first.</p>:<>
        <Field label="Property">
          <select className={inputCls} value={f.property_id} onChange={s("property_id")}>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={s("description")} placeholder="e.g. Plumber call out, broken boiler..."/></Field>
        <Row>
          <Field label={`Amount (${CURRENCY})`} half><input className={inputCls} type="number" value={f.amount} onChange={s("amount")} placeholder="0"/></Field>
          <Field label="Date" half><input className={inputCls} type="date" value={f.date} onChange={s("date")}/></Field>
        </Row>
        <Field label="Category">
          <select className={inputCls} value={f.category} onChange={s("category")}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={s("note")} placeholder="Any extra details..."/></Field>
        <Btn onClick={()=>f.property_id&&f.amount&&f.description&&onSave({...f,amount:Number(f.amount)})} className="w-full py-4 text-base mt-2">Log Expense</Btn>
      </>}
    </Sheet>
  );
}

function ContractSheet({ properties, onClose, onSave }) {
  const [f,setF] = useState({property_id:properties[0]?.id||"",tenant_name:"",tenant_phone:"",tenant_email:"",monthly_rent:"",start_date:"",end_date:"",notes:""});
  const s = k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const selectedProp = properties.find(p=>p.id===f.property_id);
  useEffect(()=>{ if(selectedProp&&!f.monthly_rent) setF(p=>({...p,monthly_rent:selectedProp.rent})); },[f.property_id]);
  return (
    <Sheet title="Add Lease / Contract" onClose={onClose}>
      {properties.length===0?<p className="text-gray-500 text-center py-8">Add a property first.</p>:<>
        <Field label="Property">
          <select className={inputCls} value={f.property_id} onChange={s("property_id")}>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field label="Tenant Full Name"><input className={inputCls} value={f.tenant_name} onChange={s("tenant_name")} placeholder="Full name"/></Field>
        <Row>
          <Field label="Phone" half><input className={inputCls} type="tel" value={f.tenant_phone} onChange={s("tenant_phone")} placeholder="05x-xxxxxxx"/></Field>
          <Field label="Email" half><input className={inputCls} type="email" value={f.tenant_email} onChange={s("tenant_email")} placeholder="email@..."/></Field>
        </Row>
        <Field label={`Monthly Rent (${CURRENCY})`}><input className={inputCls} type="number" value={f.monthly_rent} onChange={s("monthly_rent")} placeholder="0"/></Field>
        <Row>
          <Field label="Start Date" half><input className={inputCls} type="date" value={f.start_date} onChange={s("start_date")}/></Field>
          <Field label="End Date" half><input className={inputCls} type="date" value={f.end_date} onChange={s("end_date")}/></Field>
        </Row>
        <Field label="Notes (optional)"><input className={inputCls} value={f.notes} onChange={s("notes")} placeholder="Special terms, conditions..."/></Field>
        <Btn onClick={()=>f.tenant_name&&f.property_id&&f.monthly_rent&&onSave({...f,monthly_rent:Number(f.monthly_rent)})} className="w-full py-4 text-base mt-2">Save Lease</Btn>
      </>}
    </Sheet>
  );
}
