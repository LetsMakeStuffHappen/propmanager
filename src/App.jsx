import { useState, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://zppkkolnuobwvrunsdkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGtrb2xudW9id3ZydW5zZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTY5NTEsImV4cCI6MjA4NjkzMjk1MX0.hp9m4QudTMi-eKBjyEsRzEel4_QoPJCAvbur06INtnE";
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
