import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zppkkolnuobwvrunsdkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGtrb2xudW9id3ZydW5zZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTY5NTEsImV4cCI6MjA4NjkzMjk1MX0.hp9m4QudTMi-eKBjyEsRzEel4_QoPJCAvbur06INtnE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CURRENCY = "₪";
const CORRECT_PIN = "090353";import { useState, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://YOUR_ACTUAL_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...your actual key...";
const CORRECT_PIN = "090353";
const TENANT_PIN = "111111"; // Read-only tenant portal PIN — change as needed

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₪${Number(n || 0).toLocaleString()}`;
const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1).toLocaleString("default", { month: "long", year: "numeric" });
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null); // null | "admin" | "tenant"
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Data
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rentHistory, setRentHistory] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [propertyNotes, setPropertyNotes] = useState([]);

  useEffect(() => {
    if (auth === "admin") loadAll();
    if (auth === "tenant") loadTenantData();
  }, [auth]);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, pay, c, e, rh, ml, pn] = await Promise.all([
        supabase.from("properties").select("*").order("name"),
        supabase.from("payments").select("*").order("month", { ascending: false }),
        supabase.from("contracts").select("*").order("end_date"),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("rent_history").select("*").order("changed_at", { ascending: false }),
        supabase.from("maintenance_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("property_notes").select("*").order("created_at", { ascending: false }),
      ]);
      if (p.error) throw p.error;
      setProperties(p.data || []);
      setPayments(pay.data || []);
      setContracts(c.data || []);
      setExpenses(e.data || []);
      setRentHistory(rh.data || []);
      setMaintenanceLogs(ml.data || []);
      setPropertyNotes(pn.data || []);
    } catch (err) {
      console.error(err);
      setDbError(true);
    }
    setLoading(false);
  }

  async function loadTenantData() {
    setLoading(true);
    const [pay, c] = await Promise.all([
      supabase.from("payments").select("*").order("month", { ascending: false }),
      supabase.from("contracts").select("*"),
    ]);
    setPayments(pay.data || []);
    setContracts(c.data || []);
    setLoading(false);
  }

  function handlePin() {
    if (pin === CORRECT_PIN) { setAuth("admin"); setPinError(""); }
    else if (pin === TENANT_PIN) { setAuth("tenant"); setPinError(""); }
    else { setPinError("Wrong PIN. Try again."); setPin(""); }
  }

  // ── PIN SCREEN ──
  if (!auth) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0f1117",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏢</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.5px" }}>PropManager</h1>
          <p style={{ color: "#888", margin: "0 0 32px", fontSize: 14 }}>Enter your PIN to continue</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <input
              type="password" maxLength={6} value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePin()}
              placeholder="● ● ● ● ● ●"
              style={{
                background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 10,
                color: "#fff", fontSize: 20, padding: "12px 20px", width: 160,
                textAlign: "center", letterSpacing: 8, outline: "none"
              }}
            />
            <button onClick={handlePin} style={{
              background: "#4f7ef7", border: "none", borderRadius: 10, color: "#fff",
              fontSize: 16, fontWeight: 600, padding: "12px 20px", cursor: "pointer"
            }}>Go</button>
          </div>
          {pinError && <p style={{ color: "#f97070", fontSize: 13 }}>{pinError}</p>}
        </div>
      </div>
    );
  }

  // ── TENANT PORTAL ──
  if (auth === "tenant") {
    return <TenantPortal payments={payments} contracts={contracts} onLogout={() => { setAuth(null); setPin(""); }} />;
  }

  if (dbError) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2>Connection Error</h2>
          <p style={{ color: "#888" }}>Check your Supabase URL and key in App.jsx (lines 4–5)</p>
          <button onClick={() => { setDbError(false); loadAll(); }} style={{ marginTop: 16, background: "#4f7ef7", border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "properties", label: "Properties", icon: "🏢" },
    { id: "payments", label: "Payments", icon: "💳" },
    { id: "contracts", label: "Leases", icon: "📋" },
    { id: "expenses", label: "Expenses", icon: "💸" },
    { id: "maintenance", label: "Maintenance", icon: "🔧" },
    { id: "reports", label: "Reports", icon: "📈" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#e8eaf0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#161922", borderBottom: "1px solid #1e2130", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏢</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>PropManager</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={loadAll} style={{ background: "#1e2130", border: "none", borderRadius: 8, color: "#aaa", padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
          <button onClick={() => { setAuth(null); setPin(""); }} style={{ background: "#1e2130", border: "none", borderRadius: 8, color: "#aaa", padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Logout</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: "#161922", borderBottom: "1px solid #1e2130", display: "flex", overflowX: "auto", gap: 2, padding: "0 12px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#4f7ef7" : "transparent",
            border: "none", borderRadius: "0 0 6px 6px", color: tab === t.id ? "#fff" : "#888",
            padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
            fontFamily: "DM Sans, sans-serif"
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>}
        {!loading && (
          <>
            {tab === "dashboard" && <Dashboard properties={properties} payments={payments} contracts={contracts} expenses={expenses} maintenanceLogs={maintenanceLogs} />}
            {tab === "properties" && <PropertiesTab properties={properties} payments={payments} expenses={expenses} contracts={contracts} propertyNotes={propertyNotes} rentHistory={rentHistory} reload={loadAll} />}
            {tab === "payments" && <PaymentsTab payments={payments} properties={properties} reload={loadAll} />}
            {tab === "contracts" && <ContractsTab contracts={contracts} properties={properties} reload={loadAll} />}
            {tab === "expenses" && <ExpensesTab expenses={expenses} properties={properties} reload={loadAll} />}
            {tab === "maintenance" && <MaintenanceTab logs={maintenanceLogs} properties={properties} reload={loadAll} />}
            {tab === "reports" && <ReportsTab properties={properties} payments={payments} expenses={expenses} contracts={contracts} rentHistory={rentHistory} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ properties, payments, contracts, expenses, maintenanceLogs }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthPayments = payments.filter(p => p.month === thisMonth);
  const totalExpected = properties.reduce((s, p) => s + Number(p.rent || 0), 0);
  const totalCollected = monthPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const netIncome = totalCollected - totalExpenses;

  // Expiry alerts (90 days)
  const expiringLeases = contracts.filter(c => {
    const d = daysUntil(c.end_date);
    return d !== null && d <= 90 && d >= 0;
  });
  const expiredLeases = contracts.filter(c => daysUntil(c.end_date) < 0);

  // Maintenance open
  const openMaintenance = maintenanceLogs.filter(m => m.status !== "resolved");

  // Late payments
  const latePayments = monthPayments.filter(p => p.status === "late");

  const statCards = [
    { label: "Expected Rent", value: fmt(totalExpected), color: "#4f7ef7", icon: "🏠" },
    { label: "Collected", value: fmt(totalCollected), color: "#34d399", icon: "✅" },
    { label: "Expenses", value: fmt(totalExpenses), color: "#f97070", icon: "💸" },
    { label: "Net Income", value: fmt(netIncome), color: netIncome >= 0 ? "#34d399" : "#f97070", icon: "📊" },
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 22 }}>Dashboard — {monthLabel(thisMonth)}</h2>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "#161922", borderRadius: 12, padding: "18px 20px", border: "1px solid #1e2130" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Occupancy */}
      <div style={{ background: "#161922", borderRadius: 12, padding: "16px 20px", border: "1px solid #1e2130", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Occupancy Rate</div>
        {properties.length === 0 ? <p style={{ color: "#888", fontSize: 13 }}>No properties yet.</p> : (
          properties.map(prop => {
            const active = contracts.find(c => c.property_id === prop.id && daysUntil(c.end_date) >= 0);
            return (
              <div key={prop.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 13, color: "#ccc" }}>{prop.name}</div>
                <div style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: active ? "#1a3a2a" : "#2a1a1a", color: active ? "#34d399" : "#f97070" }}>
                  {active ? "Occupied" : "Vacant"}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alerts */}
      {(expiringLeases.length > 0 || expiredLeases.length > 0 || latePayments.length > 0 || openMaintenance.length > 0) && (
        <div style={{ background: "#161922", borderRadius: 12, padding: "16px 20px", border: "1px solid #2a1a1a" }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: "#f0b429" }}>⚠️ Alerts</div>
          {expiredLeases.map(c => (
            <Alert key={c.id} color="#f97070" text={`EXPIRED lease: ${c.tenant_name} — ${c.property_address || c.property_id} (ended ${c.end_date})${c.renewal_option ? ` | Renewal option: ${c.renewal_option}` : ""}`} />
          ))}
          {expiringLeases.map(c => {
            const d = daysUntil(c.end_date);
            return <Alert key={c.id} color="#f0b429" text={`Lease expiring in ${d} days: ${c.tenant_name} — ${c.property_address || c.property_id} (${c.end_date})${c.renewal_option ? ` | Renewal option: ${c.renewal_option}` : " | No renewal option"}`} />;
          })}
          {latePayments.map(p => (
            <Alert key={p.id} color="#f97070" text={`Late payment: ${p.tenant_name} — ${fmt(p.amount)} for ${monthLabel(p.month)}`} />
          ))}
          {openMaintenance.map(m => (
            <Alert key={m.id} color="#60a5fa" text={`Open maintenance: ${m.title} — ${m.property_name || m.property_id} (${m.priority || "normal"} priority)`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Alert({ color, text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "8px 12px", background: "#0f1117", borderRadius: 8, borderLeft: `3px solid ${color}` }}>
      <span style={{ color, fontSize: 13 }}>{text}</span>
    </div>
  );
}

// ─── PROPERTIES TAB ───────────────────────────────────────────────────────────
function PropertiesTab({ properties, payments, expenses, contracts, propertyNotes, rentHistory, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 });
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRentModal, setShowRentModal] = useState(null);
  const [newRent, setNewRent] = useState("");
  const [rentNote, setRentNote] = useState("");

  async function saveProperty() {
    setSaving(true);
    const data = { name: form.name, address: form.address, type: form.type, rent: Number(form.rent), due_day: Number(form.due_day) };
    if (form.id) {
      const oldRent = properties.find(p => p.id === form.id)?.rent;
      if (oldRent && Number(oldRent) !== Number(form.rent)) {
        await supabase.from("rent_history").insert({ property_id: form.id, old_rent: oldRent, new_rent: Number(form.rent), note: form.rent_note || "Updated", changed_at: new Date().toISOString() });
      }
      await supabase.from("properties").update(data).eq("id", form.id);
    } else {
      await supabase.from("properties").insert(data);
    }
    setSaving(false);
    setShowForm(false);
    setForm({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 });
    reload();
  }

  async function deleteProperty(id) {
    if (!confirm("Delete this property? All linked data remains but will be unlinked.")) return;
    await supabase.from("properties").delete().eq("id", id);
    setSelected(null);
    reload();
  }

  async function addNote() {
    if (!noteText.trim() || !selected) return;
    await supabase.from("property_notes").insert({ property_id: selected.id, note: noteText, created_at: new Date().toISOString() });
    setNoteText("");
    reload();
  }

  async function updateRent() {
    if (!newRent || !showRentModal) return;
    const prop = showRentModal;
    await supabase.from("rent_history").insert({ property_id: prop.id, old_rent: prop.rent, new_rent: Number(newRent), note: rentNote || "Rent updated", changed_at: new Date().toISOString() });
    await supabase.from("properties").update({ rent: Number(newRent), rent_note: rentNote, rent_updated_at: today() }).eq("id", prop.id);
    setShowRentModal(null); setNewRent(""); setRentNote("");
    reload();
  }

  const propNotes = selected ? propertyNotes.filter(n => n.property_id === selected.id) : [];
  const propRentHistory = selected ? rentHistory.filter(r => r.property_id === selected.id) : [];
  const contract = selected ? contracts.find(c => c.property_id === selected.id) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Properties</h2>
        <button onClick={() => { setShowForm(true); setForm({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 }); }} style={btnStyle("#4f7ef7")}>+ Add Property</button>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Property" : "New Property"} onClose={() => setShowForm(false)}>
          <FormField label="Property Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
          <FormField label="Type" type="select" value={form.type} onChange={v => setForm({ ...form, type: v })} options={["Apartment", "House", "Commercial", "Office", "Other"]} />
          <FormField label="Monthly Rent (₪)" type="number" value={form.rent} onChange={v => setForm({ ...form, rent: v })} />
          <FormField label="Rent Due Day" type="number" value={form.due_day} onChange={v => setForm({ ...form, due_day: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={saveProperty} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {showRentModal && (
        <Modal title={`Update Rent — ${showRentModal.name}`} onClose={() => setShowRentModal(null)}>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>Current rent: {fmt(showRentModal.rent)}</p>
          <FormField label="New Rent (₪)" type="number" value={newRent} onChange={setNewRent} />
          <FormField label="Reason / Note" value={rentNote} onChange={setRentNote} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={updateRent} style={btnStyle("#4f7ef7")}>Update Rent</button>
            <button onClick={() => setShowRentModal(null)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* List */}
        <div>
          {properties.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No properties yet.</p>}
          {properties.map(prop => {
            const activeContract = contracts.find(c => c.property_id === prop.id && daysUntil(c.end_date) >= 0);
            return (
              <div key={prop.id} onClick={() => setSelected(prop)} style={{
                background: selected?.id === prop.id ? "#1a2035" : "#161922",
                border: `1px solid ${selected?.id === prop.id ? "#4f7ef7" : "#1e2130"}`,
                borderRadius: 10, padding: "14px 16px", marginBottom: 8, cursor: "pointer"
              }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{prop.name}</div>
                <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{prop.address}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#4f7ef7", fontSize: 13, fontWeight: 600 }}>{fmt(prop.rent)}/mo</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: activeContract ? "#1a3a2a" : "#2a1a1a", color: activeContract ? "#34d399" : "#888" }}>
                    {activeContract ? activeContract.tenant_name : "Vacant"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontWeight: 700 }}>{selected.name}</h3>
                <div style={{ color: "#888", fontSize: 13 }}>{selected.address}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowForm(true); setForm({ ...selected }); }} style={btnStyle("#2a2d3a", 12)}>Edit</button>
                <button onClick={() => setShowRentModal(selected)} style={btnStyle("#2a3a2a", 12)}>Update Rent</button>
                <button onClick={() => deleteProperty(selected.id)} style={btnStyle("#3a1a1a", 12)}>Delete</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <InfoCard label="Type" value={selected.type} />
              <InfoCard label="Monthly Rent" value={fmt(selected.rent)} />
              <InfoCard label="Due Day" value={`Day ${selected.due_day} of month`} />
              <InfoCard label="Last Updated" value={selected.rent_updated_at || "—"} />
            </div>

            {/* Rent History */}
            {propRentHistory.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#aaa" }}>Rent History</div>
                {propRentHistory.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#888", marginBottom: 4, padding: "4px 0", borderBottom: "1px solid #1e2130" }}>
                    {fmt(r.old_rent)} → {fmt(r.new_rent)} on {r.changed_at?.slice(0, 10)}{r.note ? ` — ${r.note}` : ""}
                  </div>
                ))}
              </div>
            )}

            {/* Property Notes */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#aaa" }}>Notes / Log</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." style={inputStyle} onKeyDown={e => e.key === "Enter" && addNote()} />
                <button onClick={addNote} style={btnStyle("#4f7ef7", 12)}>Add</button>
              </div>
              {propNotes.map((n, i) => (
                <div key={i} style={{ fontSize: 12, color: "#bbb", padding: "6px 10px", background: "#0f1117", borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ color: "#555", marginRight: 8 }}>{n.created_at?.slice(0, 10)}</span>{n.note}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab({ payments, properties, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_name: "", amount: "", month: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("payments").update(form).eq("id", form.id);
    else await supabase.from("payments").insert(form);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", tenant_name: "", amount: "", month: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
    reload();
  }

  async function del(id) {
    if (!confirm("Delete this payment?")) return;
    await supabase.from("payments").delete().eq("id", id);
    reload();
  }

  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Payments</h2>
        <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Record Payment</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "paid", "pending", "late"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={btnStyle(filter === s ? "#4f7ef7" : "#1e2130", 12)}>{s}</button>
        ))}
      </div>

      {showForm && (
        <Modal title="Record Payment" onClose={() => setShowForm(false)}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} />
          <FormField label="Tenant Name" value={form.tenant_name} onChange={v => setForm({ ...form, tenant_name: v })} />
          <FormField label="Amount (₪)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          <FormField label="Month" type="month" value={form.month} onChange={v => setForm({ ...form, month: v })} />
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm({ ...form, status: v })} options={["paid", "pending", "late"]} />
          <FormField label="Note" value={form.note} onChange={v => setForm({ ...form, note: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
        {filtered.length === 0 && <div style={{ padding: 20, color: "#888", fontSize: 13 }}>No payments found.</div>}
        {filtered.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #1e2130", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{p.tenant_name} <span style={{ color: "#555", fontWeight: 400 }}>— {propMap[p.property_id] || p.property_id}</span></div>
              <div style={{ color: "#888", fontSize: 12 }}>{monthLabel(p.month)}{p.note ? ` · ${p.note}` : ""}</div>
            </div>
            <div style={{ fontWeight: 700, color: "#e8eaf0" }}>{fmt(p.amount)}</div>
            <StatusBadge status={p.status} />
            <button onClick={() => { setForm(p); setShowForm(true); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>Edit</button>
            <button onClick={() => del(p.id)} style={{ background: "none", border: "none", color: "#f97070", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONTRACTS / LEASES TAB ───────────────────────────────────────────────────
function ContractsTab({ contracts, properties, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const leaseFileRef = useRef();
  const collateralFileRef = useRef();

  async function save() {
    setSaving(true);
    const prop = properties.find(p => p.id === form.property_id);
    const payload = { ...form, property_address: prop?.address || "" };
    if (form.id) await supabase.from("contracts").update(payload).eq("id", form.id);
    else await supabase.from("contracts").insert(payload);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" });
    reload();
  }

  async function uploadFile(contractId, file, type) {
    setUploading(true);
    const path = `${contractId}/${type}_${file.name}`;
    await supabase.storage.from("lease-documents").upload(path, file, { upsert: true });
    const col = type === "lease" ? "lease_pdf_path" : "collateral_pdf_path";
    await supabase.from("contracts").update({ [col]: path }).eq("id", contractId);
    setUploading(false);
    reload();
  }

  async function getFileUrl(path) {
    const { data } = supabase.storage.from("lease-documents").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  }

  async function del(id) {
    if (!confirm("Delete this lease?")) return;
    await supabase.from("contracts").delete().eq("id", id);
    setSelected(null);
    reload();
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Leases</h2>
        <button onClick={() => { setShowForm(true); setForm({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" }); }} style={btnStyle("#4f7ef7")}>+ New Lease</button>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Lease" : "New Lease"} onClose={() => setShowForm(false)}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => {
            const prop = properties.find(p => p.id === v);
            setForm({ ...form, property_id: v, monthly_rent: prop?.rent || form.monthly_rent });
          }} options={properties.map(p => ({ value: p.id, label: `${p.name} — ${p.address}` }))} />
          {form.property_id && <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>📍 {propMap[form.property_id]?.address}</div>}
          <FormField label="Tenant Name" value={form.tenant_name} onChange={v => setForm({ ...form, tenant_name: v })} />
          <FormField label="Phone" value={form.tenant_phone} onChange={v => setForm({ ...form, tenant_phone: v })} />
          <FormField label="Email" value={form.tenant_email} onChange={v => setForm({ ...form, tenant_email: v })} />
          <FormField label="Monthly Rent (₪)" type="number" value={form.monthly_rent} onChange={v => setForm({ ...form, monthly_rent: v })} />
          <FormField label="Lease Start" type="date" value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} />
          <FormField label="Lease End" type="date" value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} />
          <FormField label="Renewal Option (e.g. 1 year at same rent, or tenant may extend)" value={form.renewal_option} onChange={v => setForm({ ...form, renewal_option: v })} />
          <FormField label="Notes / Special Terms" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {contracts.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No leases yet.</p>}
        {contracts.map(c => {
          const d = daysUntil(c.end_date);
          const expired = d !== null && d < 0;
          const expiring = d !== null && d >= 0 && d <= 90;
          const prop = propMap[c.property_id];
          return (
            <div key={c.id} style={{ background: "#161922", borderRadius: 12, border: `1px solid ${expired ? "#3a1a1a" : expiring ? "#2a2010" : "#1e2130"}`, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.tenant_name}</div>
                  <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                    📍 {c.property_address || prop?.address || "—"} {prop ? `(${prop.name})` : ""}
                  </div>
                  <div style={{ color: "#888", fontSize: 12 }}>
                    {c.start_date} → {c.end_date}
                    {expired && <span style={{ color: "#f97070", marginLeft: 8 }}>EXPIRED</span>}
                    {!expired && expiring && <span style={{ color: "#f0b429", marginLeft: 8 }}>⚠ {d} days left</span>}
                  </div>
                  {c.renewal_option && (
                    <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4 }}>🔄 Renewal: {c.renewal_option}</div>
                  )}
                  <div style={{ color: "#4f7ef7", fontWeight: 600, fontSize: 14, marginTop: 4 }}>{fmt(c.monthly_rent)}/mo</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setForm(c); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                    <button onClick={() => del(c.id)} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                  </div>
                  {/* Document uploads */}
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input type="file" accept=".pdf" ref={leaseFileRef} style={{ display: "none" }} onChange={e => e.target.files[0] && uploadFile(c.id, e.target.files[0], "lease")} />
                    <button onClick={() => { leaseFileRef.current.click(); }} style={btnStyle("#1a2a3a", 11)}>
                      {c.lease_pdf_path ? "📄 Lease ✓" : "📄 Upload Lease"}
                    </button>
                    {c.lease_pdf_path && <button onClick={() => getFileUrl(c.lease_pdf_path)} style={btnStyle("#1a2020", 11)}>View</button>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="file" accept=".pdf" ref={collateralFileRef} style={{ display: "none" }} onChange={e => e.target.files[0] && uploadFile(c.id, e.target.files[0], "collateral")} />
                    <button onClick={() => { collateralFileRef.current.click(); }} style={btnStyle("#1a2a3a", 11)}>
                      {c.collateral_pdf_path ? "🏦 Collateral ✓" : "🏦 Upload Collateral"}
                    </button>
                    {c.collateral_pdf_path && <button onClick={() => getFileUrl(c.collateral_pdf_path)} style={btnStyle("#1a2020", 11)}>View</button>}
                  </div>
                </div>
              </div>
              {c.notes && <div style={{ fontSize: 12, color: "#888", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e2130" }}>📝 {c.notes}</div>}
              {uploading && <div style={{ fontSize: 11, color: "#4f7ef7", marginTop: 6 }}>Uploading...</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EXPENSES TAB ─────────────────────────────────────────────────────────────
function ExpensesTab({ expenses, properties, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", description: "", amount: "", category: "Repair", date: today(), note: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const receiptRef = useRef();

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("expenses").update(form).eq("id", form.id);
    else await supabase.from("expenses").insert(form);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", description: "", amount: "", category: "Repair", date: today(), note: "" });
    reload();
  }

  async function del(id) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    reload();
  }

  async function uploadReceipt(expenseId, file) {
    const path = `receipts/${expenseId}_${file.name}`;
    await supabase.storage.from("lease-documents").upload(path, file, { upsert: true });
    await supabase.from("expenses").update({ receipt_path: path }).eq("id", expenseId);
    reload();
  }

  async function viewReceipt(path) {
    const { data } = supabase.storage.from("lease-documents").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
  const cats = ["all", "Repair", "Tax", "Utilities", "Insurance", "Management", "Legal", "Other"];
  const filtered = filter === "all" ? expenses : expenses.filter(e => e.category === filter);
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Expenses</h2>
        <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Add Expense</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={btnStyle(filter === c ? "#4f7ef7" : "#1e2130", 12)}>{c}</button>)}
      </div>

      <div style={{ background: "#161922", borderRadius: 10, padding: "10px 16px", marginBottom: 16, border: "1px solid #1e2130", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Total ({filter})</span>
        <span style={{ color: "#f97070", fontWeight: 700 }}>{fmt(total)}</span>
      </div>

      {showForm && (
        <Modal title="Add Expense" onClose={() => setShowForm(false)}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} />
          <FormField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          <FormField label="Amount (₪)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          <FormField label="Category" type="select" value={form.category} onChange={v => setForm({ ...form, category: v })} options={["Repair", "Tax", "Utilities", "Insurance", "Management", "Legal", "Other"]} />
          <FormField label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
          <FormField label="Note" value={form.note} onChange={v => setForm({ ...form, note: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
        {filtered.length === 0 && <div style={{ padding: 20, color: "#888", fontSize: 13 }}>No expenses found.</div>}
        {filtered.map(e => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1e2130", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{e.description}</div>
              <div style={{ color: "#888", fontSize: 12 }}>{e.date} · {propMap[e.property_id] || "—"} · {e.category}</div>
            </div>
            <div style={{ fontWeight: 700, color: "#f97070" }}>{fmt(e.amount)}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} id={`receipt-${e.id}`} onChange={ev => ev.target.files[0] && uploadReceipt(e.id, ev.target.files[0])} />
              <label htmlFor={`receipt-${e.id}`} style={{ ...btnStyle("#1a2a3a", 11), cursor: "pointer", padding: "4px 8px" }}>
                {e.receipt_path ? "🧾 ✓" : "🧾"}
              </label>
              {e.receipt_path && <button onClick={() => viewReceipt(e.receipt_path)} style={btnStyle("#1a2020", 11)}>View</button>}
              <button onClick={() => { setForm(e); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
              <button onClick={() => del(e.id)} style={{ background: "none", border: "none", color: "#f97070", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAINTENANCE TAB ──────────────────────────────────────────────────────────
function MaintenanceTab({ logs, properties, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", title: "", description: "", priority: "normal", status: "open", cost: "", vendor: "", created_at: new Date().toISOString() });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("maintenance_logs").update(form).eq("id", form.id);
    else await supabase.from("maintenance_logs").insert({ ...form, property_name: properties.find(p => p.id === form.property_id)?.name });
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", title: "", description: "", priority: "normal", status: "open", cost: "", vendor: "", created_at: new Date().toISOString() });
    reload();
  }

  async function del(id) {
    if (!confirm("Delete this log?")) return;
    await supabase.from("maintenance_logs").delete().eq("id", id);
    reload();
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
  const priorityColor = { high: "#f97070", normal: "#f0b429", low: "#34d399" };
  const statusColor = { open: "#f0b429", "in-progress": "#60a5fa", resolved: "#34d399" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Maintenance</h2>
        <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Log Issue</button>
      </div>

      {showForm && (
        <Modal title="Log Maintenance Issue" onClose={() => setShowForm(false)}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} />
          <FormField label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <FormField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          <FormField label="Priority" type="select" value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={["low", "normal", "high"]} />
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm({ ...form, status: v })} options={["open", "in-progress", "resolved"]} />
          <FormField label="Vendor / Contractor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} />
          <FormField label="Cost (₪)" type="number" value={form.cost} onChange={v => setForm({ ...form, cost: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {logs.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No maintenance logs yet.</p>}
        {logs.map(m => (
          <div key={m.id} style={{ background: "#161922", borderRadius: 10, border: "1px solid #1e2130", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{propMap[m.property_id] || m.property_name || "—"} · {m.created_at?.slice(0, 10)}</div>
                {m.description && <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>{m.description}</div>}
                {m.vendor && <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>🔨 {m.vendor}{m.cost ? ` · ${fmt(m.cost)}` : ""}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#0f1117", color: priorityColor[m.priority] || "#888" }}>{m.priority}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#0f1117", color: statusColor[m.status] || "#888" }}>{m.status}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setForm(m); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                  <button onClick={() => del(m.id)} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab({ properties, payments, expenses, contracts, rentHistory }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportProp, setReportProp] = useState("all");

  const years = Array.from(new Set([...payments, ...expenses].map(x => (x.month || x.date || "").slice(0, 4)).filter(Boolean))).sort().reverse();
  if (!years.includes(String(year))) years.unshift(String(year));

  const filteredPayments = payments.filter(p => p.month?.startsWith(year) && (reportProp === "all" || p.property_id === reportProp));
  const filteredExpenses = expenses.filter(e => e.date?.startsWith(year) && (reportProp === "all" || e.property_id === reportProp));

  const totalIncome = filteredPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  // Monthly breakdown
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const monthly = months.map(m => {
    const key = `${year}-${m}`;
    const inc = filteredPayments.filter(p => p.month === key && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const exp = filteredExpenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { month: key, inc, exp, net: inc - exp };
  });

  // Expense breakdown by category
  const byCat = {};
  filteredExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });

  // Per-property
  const perProp = properties.map(prop => {
    const inc = payments.filter(p => p.property_id === prop.id && p.month?.startsWith(year) && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const exp = expenses.filter(e => e.property_id === prop.id && e.date?.startsWith(year)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { ...prop, inc, exp, net: inc - exp };
  });

  function printReport() { window.print(); }

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Reports & Tax Summary</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inputStyle, width: "auto", padding: "6px 12px" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={reportProp} onChange={e => setReportProp(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 12px" }}>
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={printReport} style={btnStyle("#2a2d3a")}>🖨 Print</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#161922", borderRadius: 12, padding: "18px 20px", border: "1px solid #1e2130" }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total Income {year}</div>
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 24 }}>{fmt(totalIncome)}</div>
        </div>
        <div style={{ background: "#161922", borderRadius: 12, padding: "18px 20px", border: "1px solid #1e2130" }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total Expenses {year}</div>
          <div style={{ color: "#f97070", fontWeight: 700, fontSize: 24 }}>{fmt(totalExpenses)}</div>
        </div>
        <div style={{ background: "#161922", borderRadius: 12, padding: "18px 20px", border: "1px solid #1e2130" }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Net Income {year}</div>
          <div style={{ color: netIncome >= 0 ? "#34d399" : "#f97070", fontWeight: 700, fontSize: 24 }}>{fmt(netIncome)}</div>
        </div>
      </div>

      {/* Monthly bar chart (visual) */}
      <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Monthly Income vs Expenses</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
          {monthly.map((m, i) => {
            const max = Math.max(...monthly.map(x => Math.max(x.inc, x.exp)), 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 100 }}>
                  <div style={{ flex: 1, background: "#34d399", borderRadius: "2px 2px 0 0", height: `${(m.inc / max) * 100}%`, minHeight: m.inc > 0 ? 2 : 0 }} title={`Income: ${fmt(m.inc)}`} />
                  <div style={{ flex: 1, background: "#f97070", borderRadius: "2px 2px 0 0", height: `${(m.exp / max) * 100}%`, minHeight: m.exp > 0 ? 2 : 0 }} title={`Expenses: ${fmt(m.exp)}`} />
                </div>
                <div style={{ fontSize: 9, color: "#555" }}>{shortMonths[i]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888" }}><div style={{ width: 10, height: 10, background: "#34d399", borderRadius: 2 }} />Income</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888" }}><div style={{ width: 10, height: 10, background: "#f97070", borderRadius: 2 }} />Expenses</div>
        </div>
      </div>

      {/* Per property */}
      <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Per Property — {year}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#888", borderBottom: "1px solid #1e2130" }}>
              <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 500 }}>Property</th>
              <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 500 }}>Income</th>
              <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 500 }}>Expenses</th>
              <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 500 }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {perProp.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #1e2130" }}>
                <td style={{ padding: "8px 0", color: "#ccc" }}>{p.name}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "#34d399" }}>{fmt(p.inc)}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "#f97070" }}>{fmt(p.exp)}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: p.net >= 0 ? "#34d399" : "#f97070", fontWeight: 600 }}>{fmt(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expenses by category */}
      <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: "16px 20px" }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Expenses by Category — {year} (Tax Use)</div>
        {Object.keys(byCat).length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No expenses.</p>}
        {Object.entries(byCat).map(([cat, amt]) => (
          <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2130", fontSize: 13 }}>
            <span style={{ color: "#ccc" }}>{cat}</span>
            <span style={{ color: "#f97070", fontWeight: 600 }}>{fmt(amt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TENANT PORTAL ────────────────────────────────────────────────────────────
function TenantPortal({ payments, contracts, onLogout }) {
  const [name, setName] = useState("");
  const [selectedTenant, setSelectedTenant] = useState(null);

  const uniqueTenants = [...new Set(contracts.map(c => c.tenant_name))];

  if (!selectedTenant) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", color: "#e8eaf0" }}>
        <div style={{ background: "#161922", borderRadius: 16, padding: 32, width: 320, border: "1px solid #1e2130" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36 }}>🏠</div>
            <h2 style={{ margin: "8px 0 4px", fontWeight: 700 }}>Tenant Portal</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>View-only access</p>
          </div>
          <FormField label="Select your name" type="select" value={selectedTenant || ""} onChange={setSelectedTenant} options={uniqueTenants} />
          {selectedTenant && <button onClick={() => {}} style={btnStyle("#4f7ef7")}>Enter</button>}
          <button onClick={onLogout} style={{ ...btnStyle("#2a2d3a"), marginTop: 8, width: "100%" }}>Back</button>
        </div>
      </div>
    );
  }

  const myContracts = contracts.filter(c => c.tenant_name === selectedTenant);
  const myPayments = payments.filter(p => p.tenant_name === selectedTenant).slice(0, 12);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "DM Sans, sans-serif", color: "#e8eaf0" }}>
      <div style={{ background: "#161922", borderBottom: "1px solid #1e2130", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>🏠 Tenant Portal — {selectedTenant}</span>
        <button onClick={onLogout} style={btnStyle("#2a2d3a", 12)}>Logout</button>
      </div>
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <h3 style={{ margin: "0 0 16px" }}>My Lease{myContracts.length > 1 ? "s" : ""}</h3>
        {myContracts.map(c => (
          <div key={c.id} style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{c.property_address || "—"}</div>
            <div style={{ color: "#888", fontSize: 13, margin: "4px 0" }}>{c.start_date} → {c.end_date}</div>
            <div style={{ color: "#4f7ef7", fontWeight: 700 }}>{fmt(c.monthly_rent)}/mo</div>
            {c.renewal_option && <div style={{ color: "#60a5fa", fontSize: 12, marginTop: 4 }}>🔄 Renewal: {c.renewal_option}</div>}
          </div>
        ))}

        <h3 style={{ margin: "20px 0 16px" }}>Payment History</h3>
        <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
          {myPayments.length === 0 && <div style={{ padding: 16, color: "#888", fontSize: 13 }}>No payment records.</div>}
          {myPayments.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1e2130" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{monthLabel(p.month)}</div>
                {p.note && <div style={{ fontSize: 12, color: "#888" }}>{p.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{fmt(p.amount)}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#161922", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid #2a2d3a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange, options }) {
  const style = { ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 12 };
  return (
    <div>
      <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 4 }}>{label}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          <option value="">— Select —</option>
          {options?.map(o => typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={style} />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { paid: "#34d399", pending: "#f0b429", late: "#f97070" };
  return (
    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "#0f1117", color: colors[status] || "#888", border: `1px solid ${colors[status] || "#888"}` }}>
      {status}
    </span>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ background: "#0f1117", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#ccc", fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: 8,
  color: "#e8eaf0", fontSize: 14, padding: "10px 12px", fontFamily: "DM Sans, sans-serif", outline: "none"
};

function btnStyle(bg, fontSize = 14) {
  return {
    background: bg, border: "none", borderRadius: 8, color: "#e8eaf0",
    fontSize, fontWeight: 500, padding: fontSize <= 12 ? "5px 10px" : "9px 16px",
    cursor: "pointer", fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap"
  };
}

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
