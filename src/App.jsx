import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://zppkkolnuobwvrunsdkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcGtrb2xudW9id3ZydW5zZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTY5NTEsImV4cCI6MjA4NjkzMjk1MX0.hp9m4QudTMi-eKBjyEsRzEel4_QoPJCAvbur06INtnE";
const CORRECT_PIN = "090353";
const TENANT_PIN = "111111";
const TAX_RATE = 10; // % — change to your actual tax rate

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
const displayDate = (v) => {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function exportToCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("dark");

  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rentHistory, setRentHistory] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [propertyNotes, setPropertyNotes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [mortgages, setMortgages] = useState([]);

  const colors = theme === "dark" ? {
    bg: "#0f1117", card: "#161922", border: "#1e2130",
    text: "#e8eaf0", sub: "#888", input: "#0f1117",
    inputBorder: "#2a2d3a", accent: "#4f7ef7"
  } : {
    bg: "#f4f6fb", card: "#ffffff", border: "#e2e6f0",
    text: "#1a1d2e", sub: "#666", input: "#f8f9fc",
    inputBorder: "#d0d5e8", accent: "#4f7ef7"
  };

  useEffect(() => {
    if (auth === "admin") loadAll();
    if (auth === "tenant") loadTenantData();
  }, [auth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Escape") setSearch("");
      if (e.key === "r" || e.key === "R") loadAll();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, pay, c, e, rh, ml, pn, v, dep, ins, mort] = await Promise.all([
        supabase.from("properties").select("*").order("name"),
        supabase.from("payments").select("*").order("month", { ascending: false }),
        supabase.from("contracts").select("*").order("end_date"),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("rent_history").select("*").order("changed_at", { ascending: false }),
        supabase.from("maintenance_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("property_notes").select("*").order("created_at", { ascending: false }),
        supabase.from("vendors").select("*").order("name"),
        supabase.from("deposits").select("*"),
        supabase.from("insurance").select("*"),
        supabase.from("mortgages").select("*"),
      ]);
      if (p.error) throw p.error;
      setProperties(p.data || []);
      setPayments(pay.data || []);
      setContracts(c.data || []);
      setExpenses(e.data || []);
      setRentHistory(rh.data || []);
      setMaintenanceLogs(ml.data || []);
      setPropertyNotes(pn.data || []);
      setVendors(v.data || []);
      setDeposits(dep.data || []);
      setInsurance(ins.data || []);
      setMortgages(mort.data || []);
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

  // Notification count
  const thisMonth = new Date().toISOString().slice(0, 7);
  const alertCount = [
    ...contracts.filter(c => { const d = daysUntil(c.end_date); return d !== null && d < 0; }),
    ...contracts.filter(c => { const d = daysUntil(c.end_date); return d !== null && d >= 0 && d <= 90; }),
    ...payments.filter(p => p.month === thisMonth && p.status === "late"),
    ...maintenanceLogs.filter(m => m.status !== "resolved"),
    ...insurance.filter(i => { const d = daysUntil(i.expiry_date); return d !== null && d >= 0 && d <= 60; }),
  ].length;

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏢</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.5px" }}>PropManager</h1>
          <p style={{ color: "#888", margin: "0 0 32px", fontSize: 14 }}>Enter your PIN to continue</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <input type="password" maxLength={6} value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePin()}
              placeholder="● ● ● ● ● ●"
              style={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 10, color: "#fff", fontSize: 20, padding: "12px 20px", width: 160, textAlign: "center", letterSpacing: 8, outline: "none" }}
            />
            <button onClick={handlePin} style={{ background: "#4f7ef7", border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 600, padding: "12px 20px", cursor: "pointer" }}>Go</button>
          </div>
          {pinError && <p style={{ color: "#f97070", fontSize: 13 }}>{pinError}</p>}
        </div>
      </div>
    );
  }

  if (auth === "tenant") return <TenantPortal payments={payments} contracts={contracts} onLogout={() => { setAuth(null); setPin(""); }} colors={colors} />;

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2>Connection Error</h2>
        <p style={{ color: "#888" }}>Check your Supabase URL and key in App.jsx (lines 4–5)</p>
        <button onClick={() => { setDbError(false); loadAll(); }} style={{ marginTop: 16, background: "#4f7ef7", border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "properties", label: "Properties", icon: "🏢" },
    { id: "payments", label: "Payments", icon: "💳" },
    { id: "contracts", label: "Leases", icon: "📋" },
    { id: "expenses", label: "Expenses", icon: "💸" },
    { id: "maintenance", label: "Maintenance", icon: "🔧" },
    { id: "vendors", label: "Vendors", icon: "👷" },
    { id: "financial", label: "Financial", icon: "💰" },
    { id: "reports", label: "Reports", icon: "📈" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "'DM Sans', sans-serif", color: colors.text, transition: "background 0.2s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏢</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>PropManager</span>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search tenant, property..."
          style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, borderRadius: 8, color: colors.text, fontSize: 13, padding: "7px 14px", outline: "none", width: 220 }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Notification bell */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setTab("dashboard")} style={{ background: colors.input, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.sub, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>🔔</button>
            {alertCount > 0 && (
              <div style={{ position: "absolute", top: -4, right: -4, background: "#f97070", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{alertCount}</div>
            )}
          </div>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ background: colors.input, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.sub, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button onClick={loadAll} style={{ background: colors.input, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.sub, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>↻</button>
          <button onClick={() => { setAuth(null); setPin(""); }} style={{ background: colors.input, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.sub, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Logout</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: colors.card, borderBottom: `1px solid ${colors.border}`, display: "flex", overflowX: "auto", gap: 2, padding: "0 12px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#4f7ef7" : "transparent",
            border: "none", borderRadius: "0 0 6px 6px", color: tab === t.id ? "#fff" : colors.sub,
            padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif"
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Global search results */}
      {search.trim() && (
        <SearchResults search={search} properties={properties} payments={payments} contracts={contracts} expenses={expenses} colors={colors} />
      )}

      {/* Content */}
      {!search.trim() && (
        <div style={{ padding: "20px", maxWidth: 960, margin: "0 auto" }}>
          {loading && <div style={{ textAlign: "center", padding: 40, color: colors.sub }}>Loading...</div>}
          {!loading && (
            <>
              {tab === "dashboard" && <Dashboard properties={properties} payments={payments} contracts={contracts} expenses={expenses} maintenanceLogs={maintenanceLogs} insurance={insurance} mortgages={mortgages} deposits={deposits} colors={colors} setTab={setTab} reload={loadAll} />}
              {tab === "properties" && <PropertiesTab properties={properties} payments={payments} expenses={expenses} contracts={contracts} propertyNotes={propertyNotes} rentHistory={rentHistory} reload={loadAll} colors={colors} />}
              {tab === "payments" && <PaymentsTab payments={payments} properties={properties} contracts={contracts} reload={loadAll} colors={colors} />}
              {tab === "contracts" && <ContractsTab contracts={contracts} properties={properties} deposits={deposits} reload={loadAll} colors={colors} />}
              {tab === "expenses" && <ExpensesTab expenses={expenses} properties={properties} vendors={vendors} reload={loadAll} colors={colors} />}
              {tab === "maintenance" && <MaintenanceTab logs={maintenanceLogs} properties={properties} vendors={vendors} reload={loadAll} colors={colors} />}
              {tab === "vendors" && <VendorsTab vendors={vendors} reload={loadAll} colors={colors} />}
              {tab === "financial" && <FinancialTab properties={properties} payments={payments} expenses={expenses} contracts={contracts} insurance={insurance} mortgages={mortgages} deposits={deposits} reload={loadAll} colors={colors} />}
              {tab === "reports" && <ReportsTab properties={properties} payments={payments} expenses={expenses} contracts={contracts} rentHistory={rentHistory} mortgages={mortgages} colors={colors} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────
function SearchResults({ search, properties, payments, contracts, expenses, colors }) {
  const q = search.toLowerCase();
  const results = [
    ...properties.filter(p => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)).map(p => ({ type: "Property", label: p.name, sub: p.address, color: "#4f7ef7" })),
    ...contracts.filter(c => c.tenant_name?.toLowerCase().includes(q) || c.property_address?.toLowerCase().includes(q)).map(c => ({ type: "Lease", label: c.tenant_name, sub: c.property_address, color: "#34d399" })),
    ...payments.filter(p => p.tenant_name?.toLowerCase().includes(q)).map(p => ({ type: "Payment", label: p.tenant_name, sub: `${fmt(p.amount)} — ${monthLabel(p.month)}`, color: "#60a5fa" })),
    ...expenses.filter(e => e.description?.toLowerCase().includes(q)).map(e => ({ type: "Expense", label: e.description, sub: `${fmt(e.amount)} — ${e.date}`, color: "#f97070" })),
  ];
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, color: colors.sub, fontSize: 13 }}>{results.length} result{results.length !== 1 ? "s" : ""} for "{search}"</div>
        {results.length === 0 && <div style={{ padding: 20, color: colors.sub, fontSize: 13 }}>No results found.</div>}
        {results.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: colors.bg, color: r.color, border: `1px solid ${r.color}` }}>{r.type}</span>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{r.label}</div>
              <div style={{ color: colors.sub, fontSize: 12 }}>{r.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ properties, payments, contracts, expenses, maintenanceLogs, insurance, mortgages, deposits, colors, setTab, reload }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthPayments = payments.filter(p => p.month === thisMonth);
  const totalExpected = properties.reduce((s, p) => s + Number(p.rent || 0), 0);
  const totalCollected = monthPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalMortgages = mortgages.reduce((s, m) => s + Number(m.monthly_payment || 0), 0);
  const netIncome = totalCollected - totalExpenses - totalMortgages;

  const expiringLeases = contracts.filter(c => { const d = daysUntil(c.end_date); return d !== null && d <= 90 && d >= 0; });
  const expiredLeases = contracts.filter(c => daysUntil(c.end_date) < 0);
  const openMaintenance = maintenanceLogs.filter(m => m.status !== "resolved");
  const latePayments = monthPayments.filter(p => p.status === "late");
  const expiringInsurance = insurance.filter(i => { const d = daysUntil(i.expiry_date); return d !== null && d >= 0 && d <= 60; });
  const occupiedCount = properties.filter(p => contracts.find(c => c.property_id === p.id && daysUntil(c.end_date) >= 0)).length;

  // Upcoming forecast (next 3 months)
  const forecastMonths = [0, 1, 2].map(offset => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 7);
  });

  // 12-month trend
  const trend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11 + i);
    const key = d.toISOString().slice(0, 7);
    const inc = payments.filter(p => p.month === key && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const exp = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { key, inc, exp, net: inc - exp };
  });
  const maxTrend = Math.max(...trend.map(t => Math.max(t.inc, t.exp)), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Dashboard — {monthLabel(thisMonth)}</h2>
        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("payments")} style={btnStyle("#4f7ef7", 12)}>+ Payment</button>
          <button onClick={() => setTab("expenses")} style={btnStyle("#2a2d3a", 12)}>+ Expense</button>
          <button onClick={() => setTab("maintenance")} style={btnStyle("#2a2d3a", 12)}>+ Issue</button>
        </div>
      </div>

      {/* Portfolio hero */}
      <div style={{ background: "linear-gradient(135deg, #1a2240 0%, #0f1830 100%)", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #2a3560" }}>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>PORTFOLIO OVERVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
          <div><div style={{ color: "#aaa", fontSize: 11 }}>Total Properties</div><div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{properties.length}</div></div>
          <div><div style={{ color: "#aaa", fontSize: 11 }}>Occupied</div><div style={{ color: "#34d399", fontSize: 24, fontWeight: 700 }}>{occupiedCount}</div></div>
          <div><div style={{ color: "#aaa", fontSize: 11 }}>Vacant</div><div style={{ color: "#f97070", fontSize: 24, fontWeight: 700 }}>{properties.length - occupiedCount}</div></div>
          <div><div style={{ color: "#aaa", fontSize: 11 }}>Monthly Potential</div><div style={{ color: "#60a5fa", fontSize: 24, fontWeight: 700 }}>{fmt(totalExpected)}</div></div>
          <div><div style={{ color: "#aaa", fontSize: 11 }}>Deposits Held</div><div style={{ color: "#f0b429", fontSize: 24, fontWeight: 700 }}>{fmt(deposits.reduce((s, d) => s + Number(d.amount || 0), 0))}</div></div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Collected", value: fmt(totalCollected), color: "#34d399", icon: "✅" },
          { label: "Expenses", value: fmt(totalExpenses), color: "#f97070", icon: "💸" },
          { label: "Mortgages", value: fmt(totalMortgages), color: "#f0b429", icon: "🏦" },
          { label: "Net Income", value: fmt(netIncome), color: netIncome >= 0 ? "#34d399" : "#f97070", icon: "📊" },
        ].map(s => (
          <div key={s.label} style={{ background: colors.card, borderRadius: 12, padding: "16px 18px", border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ color: colors.sub, fontSize: 12, marginBottom: 2 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 12-month trend */}
      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>12-Month Cash Flow Trend</div>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}>
          {trend.map((t, i) => {
            const isThis = t.key === thisMonth;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }} title={`${monthLabel(t.key)}\nIncome: ${fmt(t.inc)}\nExpenses: ${fmt(t.exp)}\nNet: ${fmt(t.net)}`}>
                <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 70 }}>
                  <div style={{ flex: 1, background: isThis ? "#34d399" : "#1a3a2a", borderRadius: "2px 2px 0 0", height: `${(t.inc / maxTrend) * 100}%`, minHeight: t.inc > 0 ? 2 : 0, transition: "height 0.3s" }} />
                  <div style={{ flex: 1, background: isThis ? "#f97070" : "#2a1a1a", borderRadius: "2px 2px 0 0", height: `${(t.exp / maxTrend) * 100}%`, minHeight: t.exp > 0 ? 2 : 0, transition: "height 0.3s" }} />
                </div>
                <div style={{ fontSize: 8, color: isThis ? colors.text : colors.sub, fontWeight: isThis ? 700 : 400 }}>{t.key.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.sub }}><div style={{ width: 8, height: 8, background: "#34d399", borderRadius: 2 }} />Income</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.sub }}><div style={{ width: 8, height: 8, background: "#f97070", borderRadius: 2 }} />Expenses</div>
        </div>
      </div>

      {/* Forecast */}
      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>📅 3-Month Income Forecast</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {forecastMonths.map(m => {
            const activeContracts = contracts.filter(c => daysUntil(c.end_date) >= 0 || c.end_date?.startsWith(m));
            const expected = activeContracts.reduce((s, c) => s + Number(c.monthly_rent || 0), 0);
            return (
              <div key={m} style={{ background: colors.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ color: colors.sub, fontSize: 11, marginBottom: 4 }}>{monthLabel(m)}</div>
                <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 16 }}>{fmt(expected)}</div>
                <div style={{ color: colors.sub, fontSize: 11 }}>{activeContracts.length} tenants</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {(expiringLeases.length + expiredLeases.length + latePayments.length + openMaintenance.length + expiringInsurance.length) > 0 && (
        <div style={{ background: colors.card, borderRadius: 12, padding: "16px 20px", border: `1px solid #2a1a1a` }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: "#f0b429", fontSize: 14 }}>⚠️ Alerts Requiring Attention</div>
          {expiredLeases.map(c => <Alert key={c.id} color="#f97070" text={`EXPIRED lease: ${c.tenant_name} — ${c.property_address || ""} (ended ${displayDate(c.end_date)})${c.renewal_option ? ` | Renewal: ${c.renewal_option}` : ""}`} />)}
          {expiringLeases.map(c => { const d = daysUntil(c.end_date); return <Alert key={c.id} color="#f0b429" text={`Lease expiring in ${d} days: ${c.tenant_name} — ${c.property_address || ""} (${displayDate(c.end_date)})${c.renewal_option ? ` | Renewal: ${c.renewal_option}` : " | No renewal option"}`} />; })}
          {latePayments.map(p => <Alert key={p.id} color="#f97070" text={`Late payment: ${p.tenant_name} — ${fmt(p.amount)} for ${monthLabel(p.month)}`} />)}
          {openMaintenance.map(m => <Alert key={m.id} color="#60a5fa" text={`Open issue: ${m.title} (${m.priority} priority)`} />)}
          {expiringInsurance.map(i => <Alert key={i.id} color="#f0b429" text={`Insurance expiring in ${daysUntil(i.expiry_date)} days: ${i.property_name} — ${i.provider}`} />)}
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
function PropertiesTab({ properties, payments, expenses, contracts, propertyNotes, rentHistory, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 });
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRentModal, setShowRentModal] = useState(null);
  const [newRent, setNewRent] = useState("");
  const [rentNote, setRentNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function saveProperty() {
    setSaving(true);
    const data = { name: form.name, address: form.address, type: form.type, rent: Number(form.rent), due_day: Number(form.due_day) };
    if (form.id) {
      const oldRent = properties.find(p => p.id === form.id)?.rent;
      if (oldRent && Number(oldRent) !== Number(form.rent)) {
        await supabase.from("rent_history").insert({ property_id: form.id, old_rent: oldRent, new_rent: Number(form.rent), note: "Updated via edit", changed_at: new Date().toISOString() });
      }
      await supabase.from("properties").update(data).eq("id", form.id);
    } else {
      await supabase.from("properties").insert(data);
    }
    setSaving(false); setShowForm(false);
    setForm({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 });
    reload();
  }

  async function updateRent() {
    if (!newRent || !showRentModal) return;
    await supabase.from("rent_history").insert({ property_id: showRentModal.id, old_rent: showRentModal.rent, new_rent: Number(newRent), note: rentNote || "Rent updated", changed_at: new Date().toISOString() });
    await supabase.from("properties").update({ rent: Number(newRent), rent_note: rentNote, rent_updated_at: today() }).eq("id", showRentModal.id);
    setShowRentModal(null); setNewRent(""); setRentNote(""); reload();
  }

  async function addNote() {
    if (!noteText.trim() || !selected) return;
    await supabase.from("property_notes").insert({ property_id: selected.id, note: noteText, created_at: new Date().toISOString() });
    setNoteText(""); reload();
  }

  const propNotes = selected ? propertyNotes.filter(n => n.property_id === selected.id) : [];
  const propRentHistory = selected ? rentHistory.filter(r => r.property_id === selected.id) : [];

  // Per-property stats
  const thisYear = new Date().getFullYear().toString();
  const propStats = selected ? {
    ytdIncome: payments.filter(p => p.property_id === selected.id && p.month?.startsWith(thisYear) && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0),
    ytdExpenses: expenses.filter(e => e.property_id === selected.id && e.date?.startsWith(thisYear)).reduce((s, e) => s + Number(e.amount || 0), 0),
  } : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Properties</h2>
        <button onClick={() => { setShowForm(true); setForm({ name: "", address: "", type: "Apartment", rent: "", due_day: 1 }); }} style={btnStyle("#4f7ef7")}>+ Add Property</button>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Property" : "New Property"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Property Name" value={form.name} onChange={v => setForm({ ...form, name: v })} colors={colors} />
          <FormField label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} colors={colors} />
          <FormField label="Type" type="select" value={form.type} onChange={v => setForm({ ...form, type: v })} options={["Apartment", "House", "Commercial", "Office", "Other"]} colors={colors} />
          <FormField label="Monthly Rent (₪)" type="number" value={form.rent} onChange={v => setForm({ ...form, rent: v })} colors={colors} />
          <FormField label="Rent Due Day" type="number" value={form.due_day} onChange={v => setForm({ ...form, due_day: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={saveProperty} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {showRentModal && (
        <Modal title={`Update Rent — ${showRentModal.name}`} onClose={() => setShowRentModal(null)} colors={colors}>
          <p style={{ color: colors.sub, fontSize: 13, margin: "0 0 12px" }}>Current: {fmt(showRentModal.rent)}</p>
          <FormField label="New Rent (₪)" type="number" value={newRent} onChange={setNewRent} colors={colors} />
          <FormField label="Reason" value={rentNote} onChange={setRentNote} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={updateRent} style={btnStyle("#4f7ef7")}>Update</button>
            <button onClick={() => setShowRentModal(null)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete Property?" message="This will not delete linked data but will unlink everything. Are you sure?" onConfirm={async () => { await supabase.from("properties").delete().eq("id", confirmDelete); setConfirmDelete(null); setSelected(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <div>
          {properties.length === 0 && <EmptyState icon="🏢" message="No properties yet. Add your first one!" />}
          {properties.map(prop => {
            const activeContract = contracts.find(c => c.property_id === prop.id && daysUntil(c.end_date) >= 0);
            return (
              <div key={prop.id} onClick={() => setSelected(prop)} style={{ background: selected?.id === prop.id ? (colors.card === "#ffffff" ? "#eef2ff" : "#1a2035") : colors.card, border: `1px solid ${selected?.id === prop.id ? "#4f7ef7" : colors.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{prop.name}</div>
                <div style={{ color: colors.sub, fontSize: 12, marginBottom: 6 }}>{prop.address}</div>
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

        {selected && (
          <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontWeight: 700, color: colors.text }}>{selected.name}</h3>
                <div style={{ color: colors.sub, fontSize: 13 }}>{selected.address}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setShowForm(true); setForm({ ...selected }); }} style={btnStyle("#2a2d3a", 12)}>Edit</button>
                <button onClick={() => setShowRentModal(selected)} style={btnStyle("#1a3a2a", 12)}>Update Rent</button>
                <button onClick={() => setConfirmDelete(selected.id)} style={btnStyle("#3a1a1a", 12)}>Delete</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <InfoCard label="Type" value={selected.type} colors={colors} />
              <InfoCard label="Monthly Rent" value={fmt(selected.rent)} colors={colors} />
              <InfoCard label="YTD Income" value={fmt(propStats?.ytdIncome)} colors={colors} />
              <InfoCard label="YTD Expenses" value={fmt(propStats?.ytdExpenses)} colors={colors} />
            </div>

            {propRentHistory.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: colors.sub }}>Rent History</div>
                {propRentHistory.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: colors.sub, marginBottom: 4, padding: "4px 0", borderBottom: `1px solid ${colors.border}` }}>
                    {fmt(r.old_rent)} → {fmt(r.new_rent)} on {r.changed_at?.slice(0, 10)}{r.note ? ` — ${r.note}` : ""}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: colors.sub }}>Notes / Log</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={e => e.key === "Enter" && addNote()} style={{ ...getInputStyle(colors), flex: 1 }} />
                <button onClick={addNote} style={btnStyle("#4f7ef7", 12)}>Add</button>
              </div>
              {propNotes.length === 0 && <div style={{ color: colors.sub, fontSize: 12 }}>No notes yet.</div>}
              {propNotes.map((n, i) => (
                <div key={i} style={{ fontSize: 12, color: colors.text, padding: "6px 10px", background: colors.bg, borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ color: colors.sub, marginRight: 8 }}>{n.created_at?.slice(0, 10)}</span>{n.note}
                </div>
              ))}
            </div>
          </div>
        )}

        {!selected && properties.length > 0 && (
          <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 40, display: "flex", alignItems: "center", justifyContent: "center", color: colors.sub, fontSize: 14 }}>
            ← Select a property to view details
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab({ payments, properties, contracts, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_name: "", amount: "", month: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("month");
  const [saving, setSaving] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkStatuses, setBulkStatuses] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("payments").update(form).eq("id", form.id);
    else await supabase.from("payments").insert(form);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", tenant_name: "", amount: "", month: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
    reload();
  }

  async function saveBulk() {
    setSaving(true);
    const activeContracts = contracts.filter(c => daysUntil(c.end_date) >= 0);
    const inserts = activeContracts.map(c => ({
      property_id: c.property_id, tenant_name: c.tenant_name,
      amount: c.monthly_rent, month: bulkMonth,
      status: bulkStatuses[c.id] || "pending", note: ""
    }));
    for (const ins of inserts) {
      await supabase.from("payments").upsert(ins, { onConflict: "property_id,month" });
    }
    setSaving(false); setShowBulk(false); reload();
  }

  const filtered = payments
    .filter(p => filter === "all" || p.status === filter)
    .sort((a, b) => sortBy === "month" ? b.month?.localeCompare(a.month) : Number(b.amount) - Number(a.amount));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Payments</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowBulk(true)} style={btnStyle("#1a3a2a")}>⚡ Bulk Entry</button>
          <button onClick={() => exportToCSV(filtered.map(p => ({ Tenant: p.tenant_name, Property: propMap[p.property_id] || "", Amount: p.amount, Month: p.month, Status: p.status, Note: p.note || "" })), "payments.csv")} style={btnStyle("#2a2d3a")}>📥 Export</button>
          <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Record</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {["all", "paid", "pending", "late"].map(s => <button key={s} onClick={() => setFilter(s)} style={btnStyle(filter === s ? "#4f7ef7" : colors.border, 12)}>{s}</button>)}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...getInputStyle(colors), padding: "5px 10px", fontSize: 12 }}>
          <option value="month">Sort: Month</option>
          <option value="amount">Sort: Amount</option>
        </select>
      </div>

      {/* Bulk entry modal */}
      {showBulk && (
        <Modal title={`Bulk Payment Entry — ${monthLabel(bulkMonth)}`} onClose={() => setShowBulk(false)} colors={colors}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: colors.sub, fontSize: 12, display: "block", marginBottom: 4 }}>Month</label>
            <input type="month" value={bulkMonth} onChange={e => setBulkMonth(e.target.value)} style={{ ...getInputStyle(colors), width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ color: colors.sub, fontSize: 12, marginBottom: 8 }}>Mark status for each active tenant:</div>
          {contracts.filter(c => daysUntil(c.end_date) >= 0).map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{c.tenant_name}</div>
                <div style={{ fontSize: 11, color: colors.sub }}>{fmt(c.monthly_rent)}</div>
              </div>
              <select value={bulkStatuses[c.id] || "pending"} onChange={e => setBulkStatuses({ ...bulkStatuses, [c.id]: e.target.value })} style={{ ...getInputStyle(colors), padding: "4px 8px", fontSize: 12 }}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="late">Late</option>
              </select>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={saveBulk} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save All"}</button>
            <button onClick={() => setShowBulk(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={form.id ? "Edit Payment" : "Record Payment"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
          <FormField label="Tenant Name" value={form.tenant_name} onChange={v => setForm({ ...form, tenant_name: v })} colors={colors} />
          <FormField label="Amount (₪)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} colors={colors} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: colors.sub, fontSize: 12, display: "block", marginBottom: 4 }}>Month</label>
            <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} style={{ ...getInputStyle(colors), width: "100%", boxSizing: "border-box" }} />
          </div>
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm({ ...form, status: v })} options={["paid", "pending", "late"]} colors={colors} />
          <FormField label="Note" value={form.note} onChange={v => setForm({ ...form, note: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmModal title="Delete Payment?" message="This cannot be undone." onConfirm={async () => { await supabase.from("payments").delete().eq("id", confirmDelete); setConfirmDelete(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        {filtered.length === 0 && <EmptyState icon="💳" message="No payments found." />}
        {filtered.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14, color: colors.text }}>{p.tenant_name} <span style={{ color: colors.sub, fontWeight: 400 }}>— {propMap[p.property_id] || ""}</span></div>
              <div style={{ color: colors.sub, fontSize: 12 }}>{monthLabel(p.month)}{p.note ? ` · ${p.note}` : ""}</div>
            </div>
            <div style={{ fontWeight: 700, color: colors.text }}>{fmt(p.amount)}</div>
            <StatusBadge status={p.status} />
            {/* WhatsApp reminder for late/pending */}
            {(p.status === "late" || p.status === "pending") && (
              <button onClick={() => {
                const msg = encodeURIComponent(`שלום ${p.tenant_name}, תזכורת ידידותית — שכר הדירה לחודש ${monthLabel(p.month)} בסך ${fmt(p.amount)} טרם התקבל. אנא צור קשר. תודה!`);
                window.open(`https://wa.me/?text=${msg}`, "_blank");
              }} title="Send WhatsApp reminder" style={{ background: "#1a3a1a", border: "none", borderRadius: 6, color: "#25d366", padding: "4px 8px", cursor: "pointer", fontSize: 14 }}>📱</button>
            )}
            <button onClick={() => { setForm(p); setShowForm(true); }} style={{ background: "none", border: "none", color: colors.sub, cursor: "pointer", fontSize: 13 }}>Edit</button>
            <button onClick={() => setConfirmDelete(p.id)} style={{ background: "none", border: "none", color: "#f97070", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONTRACTS / LEASES TAB ───────────────────────────────────────────────────
function UploadButton({ contractId, type, currentPath, onDone, colors }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    const path = `${contractId}/${type}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("lease-documents").upload(path, file, { upsert: true });
    if (!error) {
      const col = type === "lease" ? "lease_pdf_path" : "collateral_pdf_path";
      await supabase.from("contracts").update({ [col]: path }).eq("id", contractId);
    }
    setUploading(false); onDone();
  }
  async function viewFile() {
    const { data } = supabase.storage.from("lease-documents").getPublicUrl(currentPath);
    window.open(data.publicUrl, "_blank");
  }
  const icon = type === "lease" ? "📄" : "🏦";
  const label = type === "lease" ? "Lease" : "Collateral";
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      <button onClick={() => inputRef.current.click()} disabled={uploading} style={btnStyle(currentPath ? "#1a3a2a" : "#1a2a3a", 11)}>
        {uploading ? "Uploading..." : currentPath ? `${icon} ${label} ✓` : `${icon} Upload ${label}`}
      </button>
      {currentPath && <button onClick={viewFile} style={btnStyle("#1a2020", 11)}>View</button>}
    </div>
  );
}

function ContractsTab({ contracts, properties, deposits, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  async function save() {
    setSaving(true);
    const prop = properties.find(p => p.id === form.property_id);
    const payload = { ...form, property_address: prop?.address || "", monthly_rent: Number(form.monthly_rent) || null, start_date: form.start_date || null, end_date: form.end_date || null };
    if (form.id) await supabase.from("contracts").update(payload).eq("id", form.id);
    else await supabase.from("contracts").insert(payload);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" });
    reload();
  }

  const depositMap = Object.fromEntries(deposits.map(d => [d.contract_id, d]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Leases</h2>
        <button onClick={() => { setShowForm(true); setForm({ property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "", start_date: "", end_date: "", notes: "", renewal_option: "" }); }} style={btnStyle("#4f7ef7")}>+ New Lease</button>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Lease" : "New Lease"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => { const prop = properties.find(p => p.id === v); setForm({ ...form, property_id: v, monthly_rent: prop?.rent || form.monthly_rent }); }} options={properties.map(p => ({ value: p.id, label: `${p.name} — ${p.address}` }))} colors={colors} />
          {form.property_id && <div style={{ color: colors.sub, fontSize: 12, marginBottom: 8 }}>📍 {propMap[form.property_id]?.address}</div>}
          <FormField label="Tenant Name" value={form.tenant_name} onChange={v => setForm({ ...form, tenant_name: v })} colors={colors} />
          <FormField label="Phone" value={form.tenant_phone} onChange={v => setForm({ ...form, tenant_phone: v })} colors={colors} />
          <FormField label="Email" value={form.tenant_email} onChange={v => setForm({ ...form, tenant_email: v })} colors={colors} />
          <FormField label="Monthly Rent (₪)" type="number" value={form.monthly_rent} onChange={v => setForm({ ...form, monthly_rent: v })} colors={colors} />
          <DateField label="Lease Start" value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} colors={colors} />
          <DateField label="Lease End" value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} colors={colors} />
          <FormField label="Renewal Option" value={form.renewal_option} onChange={v => setForm({ ...form, renewal_option: v })} colors={colors} />
          <FormField label="Notes / Special Terms" value={form.notes} onChange={v => setForm({ ...form, notes: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmModal title="Delete Lease?" message="This will permanently delete this lease record." onConfirm={async () => { await supabase.from("contracts").delete().eq("id", confirmDelete); setConfirmDelete(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      <div style={{ display: "grid", gap: 12 }}>
        {contracts.length === 0 && <EmptyState icon="📋" message="No leases yet. Add your first lease!" />}
        {contracts.map(c => {
          const d = daysUntil(c.end_date);
          const expired = d !== null && d < 0;
          const expiring = d !== null && d >= 0 && d <= 90;
          const prop = propMap[c.property_id];
          const deposit = depositMap[c.id];
          return (
            <div key={c.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${expired ? "#3a1a1a" : expiring ? "#2a2010" : colors.border}`, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>{c.tenant_name}</div>
                  <div style={{ color: colors.sub, fontSize: 12, marginBottom: 4 }}>📍 {c.property_address || prop?.address || "—"} {prop ? `(${prop.name})` : ""}</div>
                  <div style={{ color: colors.sub, fontSize: 12 }}>
                    {displayDate(c.start_date)} → {displayDate(c.end_date)}
                    {expired && <span style={{ color: "#f97070", marginLeft: 8, fontWeight: 600 }}>EXPIRED</span>}
                    {!expired && expiring && <span style={{ color: "#f0b429", marginLeft: 8 }}>⚠ {d} days left</span>}
                  </div>
                  {c.renewal_option && <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4 }}>🔄 Renewal: {c.renewal_option}</div>}
                  {c.tenant_phone && <div style={{ fontSize: 12, color: colors.sub, marginTop: 2 }}>📞 {c.tenant_phone}</div>}
                  {deposit && <div style={{ fontSize: 12, color: "#f0b429", marginTop: 2 }}>🔐 Deposit: {fmt(deposit.amount)}</div>}
                  <div style={{ color: "#4f7ef7", fontWeight: 600, fontSize: 14, marginTop: 4 }}>{fmt(c.monthly_rent)}/mo</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setForm(c); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                  <button onClick={() => setConfirmDelete(c.id)} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}`, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <UploadButton contractId={c.id} type="lease" currentPath={c.lease_pdf_path} onDone={reload} colors={colors} />
                <UploadButton contractId={c.id} type="collateral" currentPath={c.collateral_pdf_path} onDone={reload} colors={colors} />
              </div>
              {c.notes && <div style={{ fontSize: 12, color: colors.sub, marginTop: 8 }}>📝 {c.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EXPENSES TAB ─────────────────────────────────────────────────────────────
function ExpensesTab({ expenses, properties, vendors, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", description: "", amount: "", category: "Repair", date: today(), note: "", vendor_id: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("expenses").update(form).eq("id", form.id);
    else await supabase.from("expenses").insert(form);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", description: "", amount: "", category: "Repair", date: today(), note: "", vendor_id: "" });
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

  const cats = ["all", "Repair", "Tax", "Utilities", "Insurance", "Management", "Legal", "Other"];
  const filtered = expenses
    .filter(e => filter === "all" || e.category === filter)
    .sort((a, b) => sortBy === "date" ? b.date?.localeCompare(a.date) : Number(b.amount) - Number(a.amount));
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Expenses</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCSV(filtered.map(e => ({ Date: e.date, Description: e.description, Amount: e.amount, Category: e.category, Property: propMap[e.property_id] || "", Note: e.note || "" })), "expenses.csv")} style={btnStyle("#2a2d3a")}>📥 Export</button>
          <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Add Expense</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={btnStyle(filter === c ? "#4f7ef7" : colors.border, 12)}>{c}</button>)}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...getInputStyle(colors), padding: "5px 10px", fontSize: 12 }}>
          <option value="date">Sort: Date</option>
          <option value="amount">Sort: Amount</option>
        </select>
      </div>

      <div style={{ background: colors.card, borderRadius: 10, padding: "10px 16px", marginBottom: 16, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: colors.sub, fontSize: 13 }}>Total ({filter})</span>
        <span style={{ color: "#f97070", fontWeight: 700 }}>{fmt(total)}</span>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Expense" : "Add Expense"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
          <FormField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} colors={colors} />
          <FormField label="Amount (₪)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} colors={colors} />
          <FormField label="Category" type="select" value={form.category} onChange={v => setForm({ ...form, category: v })} options={["Repair", "Tax", "Utilities", "Insurance", "Management", "Legal", "Other"]} colors={colors} />
          <DateField label="Date" value={form.date} onChange={v => setForm({ ...form, date: v })} colors={colors} />
          {vendors.length > 0 && <FormField label="Vendor" type="select" value={form.vendor_id} onChange={v => setForm({ ...form, vendor_id: v })} options={vendors.map(v => ({ value: v.id, label: v.name }))} colors={colors} />}
          <FormField label="Note" value={form.note} onChange={v => setForm({ ...form, note: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmModal title="Delete Expense?" message="This cannot be undone." onConfirm={async () => { await supabase.from("expenses").delete().eq("id", confirmDelete); setConfirmDelete(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        {filtered.length === 0 && <EmptyState icon="💸" message="No expenses found." />}
        {filtered.map(e => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14, color: colors.text }}>{e.description}</div>
              <div style={{ color: colors.sub, fontSize: 12 }}>{displayDate(e.date)} · {propMap[e.property_id] || "—"} · {e.category}</div>
            </div>
            <div style={{ fontWeight: 700, color: "#f97070" }}>{fmt(e.amount)}</div>
            <div style={{ display: "flex", gap: 4 }}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} id={`r-${e.id}`} onChange={ev => ev.target.files[0] && uploadReceipt(e.id, ev.target.files[0])} />
              <label htmlFor={`r-${e.id}`} style={{ ...btnStyle("#1a2a3a", 11), cursor: "pointer", padding: "4px 8px", display: "inline-block" }}>{e.receipt_path ? "🧾✓" : "🧾"}</label>
              {e.receipt_path && <button onClick={() => viewReceipt(e.receipt_path)} style={btnStyle("#1a2020", 11)}>View</button>}
              <button onClick={() => { setForm(e); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
              <button onClick={() => setConfirmDelete(e.id)} style={{ background: "none", border: "none", color: "#f97070", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAINTENANCE TAB ──────────────────────────────────────────────────────────
function MaintenanceTab({ logs, properties, vendors, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: "", title: "", description: "", priority: "normal", status: "open", cost: "", vendor_id: "", vendor: "", created_at: new Date().toISOString() });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

  async function save() {
    setSaving(true);
    const vendorName = form.vendor_id ? vendorMap[form.vendor_id]?.name : form.vendor;
    const payload = { ...form, property_name: propMap[form.property_id] || "", vendor: vendorName };
    if (form.id) await supabase.from("maintenance_logs").update(payload).eq("id", form.id);
    else await supabase.from("maintenance_logs").insert(payload);
    setSaving(false); setShowForm(false);
    setForm({ property_id: "", title: "", description: "", priority: "normal", status: "open", cost: "", vendor_id: "", vendor: "", created_at: new Date().toISOString() });
    reload();
  }

  const filtered = logs.filter(m => filterStatus === "all" || m.status === filterStatus);
  const priorityColor = { high: "#f97070", normal: "#f0b429", low: "#34d399" };
  const statusColor = { open: "#f0b429", "in-progress": "#60a5fa", resolved: "#34d399" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Maintenance</h2>
        <button onClick={() => setShowForm(true)} style={btnStyle("#4f7ef7")}>+ Log Issue</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["all", "open", "in-progress", "resolved"].map(s => <button key={s} onClick={() => setFilterStatus(s)} style={btnStyle(filterStatus === s ? "#4f7ef7" : colors.border, 12)}>{s}</button>)}
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Issue" : "Log Issue"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
          <FormField label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} colors={colors} />
          <FormField label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} colors={colors} />
          <FormField label="Priority" type="select" value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={["low", "normal", "high"]} colors={colors} />
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm({ ...form, status: v })} options={["open", "in-progress", "resolved"]} colors={colors} />
          {vendors.length > 0
            ? <FormField label="Vendor (from address book)" type="select" value={form.vendor_id} onChange={v => setForm({ ...form, vendor_id: v })} options={vendors.map(v => ({ value: v.id, label: `${v.name} — ${v.specialty}` }))} colors={colors} />
            : <FormField label="Vendor / Contractor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} colors={colors} />
          }
          <FormField label="Cost (₪)" type="number" value={form.cost} onChange={v => setForm({ ...form, cost: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmModal title="Delete Issue?" message="This cannot be undone." onConfirm={async () => { await supabase.from("maintenance_logs").delete().eq("id", confirmDelete); setConfirmDelete(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && <EmptyState icon="🔧" message="No maintenance issues found." />}
        {filtered.map(m => {
          const vendor = m.vendor_id ? vendorMap[m.vendor_id] : null;
          return (
            <div key={m.id} style={{ background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: colors.text }}>{m.title}</div>
                  <div style={{ color: colors.sub, fontSize: 12 }}>{propMap[m.property_id] || m.property_name || "—"} · {m.created_at?.slice(0, 10)}</div>
                  {m.description && <div style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{m.description}</div>}
                  {(vendor || m.vendor) && <div style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>🔨 {vendor ? `${vendor.name} (${vendor.phone})` : m.vendor}{m.cost ? ` · ${fmt(m.cost)}` : ""}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: colors.bg, color: priorityColor[m.priority] || colors.sub }}>{m.priority}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: colors.bg, color: statusColor[m.status] || colors.sub }}>{m.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setForm(m); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                    <button onClick={() => setConfirmDelete(m.id)} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VENDORS TAB ──────────────────────────────────────────────────────────────
function VendorsTab({ vendors, reload, colors }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", email: "", notes: "", rating: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function save() {
    setSaving(true);
    if (form.id) await supabase.from("vendors").update(form).eq("id", form.id);
    else await supabase.from("vendors").insert(form);
    setSaving(false); setShowForm(false);
    setForm({ name: "", specialty: "", phone: "", email: "", notes: "", rating: "" });
    reload();
  }

  const specialties = ["Plumber", "Electrician", "Carpenter", "Painter", "Cleaner", "Locksmith", "AC Technician", "General Contractor", "Other"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Vendor Address Book</h2>
        <button onClick={() => { setShowForm(true); setForm({ name: "", specialty: "", phone: "", email: "", notes: "", rating: "" }); }} style={btnStyle("#4f7ef7")}>+ Add Vendor</button>
      </div>

      {showForm && (
        <Modal title={form.id ? "Edit Vendor" : "New Vendor"} onClose={() => setShowForm(false)} colors={colors}>
          <FormField label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} colors={colors} />
          <FormField label="Specialty" type="select" value={form.specialty} onChange={v => setForm({ ...form, specialty: v })} options={specialties} colors={colors} />
          <FormField label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} colors={colors} />
          <FormField label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} colors={colors} />
          <FormField label="Rating (1–5)" type="number" value={form.rating} onChange={v => setForm({ ...form, rating: v })} colors={colors} />
          <FormField label="Notes (reliability, pricing etc.)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} colors={colors} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmModal title="Delete Vendor?" message="This cannot be undone." onConfirm={async () => { await supabase.from("vendors").delete().eq("id", confirmDelete); setConfirmDelete(null); reload(); }} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {vendors.length === 0 && <EmptyState icon="👷" message="No vendors yet. Build your contractor address book!" />}
        {vendors.map(v => (
          <div key={v.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#4f7ef7", marginBottom: 6 }}>{v.specialty}</div>
                {v.phone && <div style={{ fontSize: 13, color: colors.text }}>📞 <a href={`tel:${v.phone}`} style={{ color: colors.text, textDecoration: "none" }}>{v.phone}</a></div>}
                {v.email && <div style={{ fontSize: 12, color: colors.sub }}>{v.email}</div>}
                {v.rating && <div style={{ fontSize: 12, color: "#f0b429", marginTop: 4 }}>{"⭐".repeat(Math.min(Number(v.rating), 5))}</div>}
                {v.notes && <div style={{ fontSize: 12, color: colors.sub, marginTop: 6 }}>{v.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
                <button onClick={() => { setForm(v); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                <button onClick={() => setConfirmDelete(v.id)} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                {v.phone && <a href={`https://wa.me/972${v.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer" style={{ ...btnStyle("#1a3a1a", 11), textDecoration: "none", textAlign: "center" }}>📱 WA</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FINANCIAL TAB (Deposits, Insurance, Mortgages, Yield) ───────────────────
function FinancialTab({ properties, payments, expenses, contracts, insurance, mortgages, deposits, reload, colors }) {
  const [activeSection, setActiveSection] = useState("deposits");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
  const contractMap = Object.fromEntries(contracts.map(c => [c.id, c.tenant_name]));

  const thisYear = new Date().getFullYear().toString();

  async function save(table) {
    setSaving(true);
    // Convert empty strings to null (Supabase rejects "" for uuid/numeric fields)
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    );
    if (cleaned.id) await supabase.from(table).update(cleaned).eq("id", cleaned.id);
    else await supabase.from(table).insert(cleaned);
    setSaving(false); setShowForm(false); setForm({});
    reload();
  }

  async function del(table, id) {
    await supabase.from(table).delete().eq("id", id);
    setConfirmDelete(null); reload();
  }

  // Yield calculator
  const yieldData = properties.map(prop => {
    const annualIncome = payments.filter(p => p.property_id === prop.id && p.month?.startsWith(thisYear) && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const annualExpenses = expenses.filter(e => e.property_id === prop.id && e.date?.startsWith(thisYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const mortgage = mortgages.find(m => m.property_id === prop.id);
    const annualMortgage = mortgage ? Number(mortgage.monthly_payment) * 12 : 0;
    const netAnnual = annualIncome - annualExpenses - annualMortgage;
    const purchasePrice = Number(prop.purchase_price || 0);
    const grossYield = purchasePrice > 0 ? ((prop.rent * 12) / purchasePrice * 100).toFixed(2) : null;
    const netYield = purchasePrice > 0 ? ((netAnnual / purchasePrice) * 100).toFixed(2) : null;
    return { ...prop, annualIncome, annualExpenses, annualMortgage, netAnnual, grossYield, netYield };
  });

  // Tax estimate
  const totalAnnualIncome = payments.filter(p => p.month?.startsWith(thisYear) && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAnnualExpenses = expenses.filter(e => e.date?.startsWith(thisYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const taxableIncome = Math.max(0, totalAnnualIncome - totalAnnualExpenses);
  const estimatedTax = taxableIncome * (TAX_RATE / 100);

  const sections = [
    { id: "deposits", label: "🔐 Deposits" },
    { id: "insurance", label: "🛡️ Insurance" },
    { id: "mortgages", label: "🏦 Mortgages" },
    { id: "yield", label: "📐 Yield & Tax" },
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 22 }}>Financial Overview</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {sections.map(s => <button key={s.id} onClick={() => setActiveSection(s.id)} style={btnStyle(activeSection === s.id ? "#4f7ef7" : colors.border)}>{s.label}</button>)}
      </div>

      {confirmDelete && <ConfirmModal title="Delete record?" message="This cannot be undone." onConfirm={() => del(confirmDelete.table, confirmDelete.id)} onCancel={() => setConfirmDelete(null)} colors={colors} />}

      {/* DEPOSITS */}
      {activeSection === "deposits" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: colors.sub, fontSize: 13 }}>Total held: <strong style={{ color: "#f0b429" }}>{fmt(deposits.reduce((s, d) => s + Number(d.amount || 0), 0))}</strong></div>
            <button onClick={() => { setShowForm(true); setForm({ contract_id: "", property_id: "", tenant_name: "", amount: "", received_date: today(), status: "held", notes: "" }); }} style={btnStyle("#4f7ef7")}>+ Add Deposit</button>
          </div>
          {showForm && (
            <Modal title="Security Deposit" onClose={() => setShowForm(false)} colors={colors}>
              <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
              <FormField label="Tenant Name" value={form.tenant_name} onChange={v => setForm({ ...form, tenant_name: v })} colors={colors} />
              <FormField label="Amount (₪)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} colors={colors} />
              <DateField label="Received Date" value={form.received_date} onChange={v => setForm({ ...form, received_date: v })} colors={colors} />
              <FormField label="Status" type="select" value={form.status} onChange={v => setForm({ ...form, status: v })} options={["held", "returned", "partial"]} colors={colors} />
              <FormField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} colors={colors} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => save("deposits")} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
              </div>
            </Modal>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {deposits.length === 0 && <EmptyState icon="🔐" message="No deposits recorded yet." />}
            {deposits.map(d => (
              <div key={d.id} style={{ background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: colors.text }}>{d.tenant_name}</div>
                  <div style={{ color: colors.sub, fontSize: 12 }}>{propMap[d.property_id] || "—"} · Received {displayDate(d.received_date)}</div>
                  {d.notes && <div style={{ color: colors.sub, fontSize: 12 }}>{d.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "#f0b429", fontWeight: 700, fontSize: 16 }}>{fmt(d.amount)}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: d.status === "held" ? "#1a3a2a" : "#2a1a1a", color: d.status === "held" ? "#34d399" : "#f97070" }}>{d.status}</span>
                  <button onClick={() => { setForm(d); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                  <button onClick={() => setConfirmDelete({ table: "deposits", id: d.id })} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSURANCE */}
      {activeSection === "insurance" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => { setShowForm(true); setForm({ property_id: "", provider: "", policy_number: "", annual_cost: "", expiry_date: "", notes: "" }); }} style={btnStyle("#4f7ef7")}>+ Add Insurance</button>
          </div>
          {showForm && (
            <Modal title="Insurance Policy" onClose={() => setShowForm(false)} colors={colors}>
              <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
              <FormField label="Provider" value={form.provider} onChange={v => setForm({ ...form, provider: v })} colors={colors} />
              <FormField label="Policy Number" value={form.policy_number} onChange={v => setForm({ ...form, policy_number: v })} colors={colors} />
              <FormField label="Annual Cost (₪)" type="number" value={form.annual_cost} onChange={v => setForm({ ...form, annual_cost: v })} colors={colors} />
              <DateField label="Expiry Date" value={form.expiry_date} onChange={v => setForm({ ...form, expiry_date: v })} colors={colors} />
              <FormField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} colors={colors} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => save("insurance")} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
              </div>
            </Modal>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {insurance.length === 0 && <EmptyState icon="🛡️" message="No insurance policies recorded yet." />}
            {insurance.map(i => {
              const d = daysUntil(i.expiry_date);
              const expiring = d !== null && d >= 0 && d <= 60;
              return (
                <div key={i.id} style={{ background: colors.card, borderRadius: 10, border: `1px solid ${expiring ? "#2a2010" : colors.border}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text }}>{i.provider} <span style={{ color: colors.sub, fontWeight: 400, fontSize: 12 }}>#{i.policy_number}</span></div>
                    <div style={{ color: colors.sub, fontSize: 12 }}>{propMap[i.property_id] || "—"} · Expires {displayDate(i.expiry_date)}</div>
                    {expiring && <div style={{ color: "#f0b429", fontSize: 12 }}>⚠ Expiring in {d} days!</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "#f97070", fontWeight: 700 }}>{fmt(i.annual_cost)}/yr</span>
                    <button onClick={() => { setForm(i); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                    <button onClick={() => setConfirmDelete({ table: "insurance", id: i.id })} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MORTGAGES */}
      {activeSection === "mortgages" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: colors.sub, fontSize: 13 }}>Total monthly: <strong style={{ color: "#f97070" }}>{fmt(mortgages.reduce((s, m) => s + Number(m.monthly_payment || 0), 0))}</strong></div>
            <button onClick={() => { setShowForm(true); setForm({ property_id: "", bank: "", monthly_payment: "", remaining_balance: "", interest_rate: "", end_date: "", notes: "" }); }} style={btnStyle("#4f7ef7")}>+ Add Mortgage</button>
          </div>
          {showForm && (
            <Modal title="Mortgage" onClose={() => setShowForm(false)} colors={colors}>
              <FormField label="Property" type="select" value={form.property_id} onChange={v => setForm({ ...form, property_id: v })} options={properties.map(p => ({ value: p.id, label: p.name }))} colors={colors} />
              <FormField label="Bank / Lender" value={form.bank} onChange={v => setForm({ ...form, bank: v })} colors={colors} />
              <FormField label="Monthly Payment (₪)" type="number" value={form.monthly_payment} onChange={v => setForm({ ...form, monthly_payment: v })} colors={colors} />
              <FormField label="Remaining Balance (₪)" type="number" value={form.remaining_balance} onChange={v => setForm({ ...form, remaining_balance: v })} colors={colors} />
              <FormField label="Interest Rate (%)" type="number" value={form.interest_rate} onChange={v => setForm({ ...form, interest_rate: v })} colors={colors} />
              <DateField label="End Date" value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} colors={colors} />
              <FormField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} colors={colors} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => save("mortgages")} disabled={saving} style={btnStyle("#4f7ef7")}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setShowForm(false)} style={btnStyle("#2a2d3a")}>Cancel</button>
              </div>
            </Modal>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {mortgages.length === 0 && <EmptyState icon="🏦" message="No mortgages recorded yet." />}
            {mortgages.map(m => (
              <div key={m.id} style={{ background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text }}>{propMap[m.property_id] || "—"}</div>
                    <div style={{ color: colors.sub, fontSize: 12 }}>{m.bank} · {m.interest_rate}% · Until {displayDate(m.end_date)}</div>
                    <div style={{ color: "#f97070", fontWeight: 700, marginTop: 4 }}>{fmt(m.monthly_payment)}/mo</div>
                    {m.remaining_balance && <div style={{ color: colors.sub, fontSize: 12 }}>Balance: {fmt(m.remaining_balance)}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setForm(m); setShowForm(true); }} style={btnStyle("#2a2d3a", 11)}>Edit</button>
                    <button onClick={() => setConfirmDelete({ table: "mortgages", id: m.id })} style={btnStyle("#3a1a1a", 11)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YIELD & TAX */}
      {activeSection === "yield" && (
        <div>
          {/* Tax estimate */}
          <div style={{ background: "linear-gradient(135deg, #1a2240 0%, #0f1830 100%)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: "1px solid #2a3560" }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>TAX ESTIMATE {new Date().getFullYear()} (rate: {TAX_RATE}%)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div><div style={{ color: "#aaa", fontSize: 11 }}>Gross Income</div><div style={{ color: "#34d399", fontSize: 20, fontWeight: 700 }}>{fmt(totalAnnualIncome)}</div></div>
              <div><div style={{ color: "#aaa", fontSize: 11 }}>Expenses</div><div style={{ color: "#f97070", fontSize: 20, fontWeight: 700 }}>{fmt(totalAnnualExpenses)}</div></div>
              <div><div style={{ color: "#aaa", fontSize: 11 }}>Taxable Income</div><div style={{ color: "#f0b429", fontSize: 20, fontWeight: 700 }}>{fmt(taxableIncome)}</div></div>
              <div><div style={{ color: "#aaa", fontSize: 11 }}>Est. Tax ({TAX_RATE}%)</div><div style={{ color: "#f97070", fontSize: 20, fontWeight: 700 }}>{fmt(estimatedTax)}</div></div>
            </div>
            <div style={{ color: "#555", fontSize: 11, marginTop: 12 }}>* Estimate only. Consult your accountant. Change TAX_RATE in App.jsx line 12.</div>
          </div>

          {/* Yield per property */}
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: colors.text }}>Rental Yield per Property</div>
          <div style={{ color: colors.sub, fontSize: 12, marginBottom: 12 }}>Add purchase price to each property to calculate yield. Edit a property and add "purchase_price" or ask Claude to add that field.</div>
          <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: colors.sub, borderBottom: `1px solid ${colors.border}` }}>
                  {["Property", "Annual Income", "Net Annual", "Gross Yield", "Net Yield"].map(h => <th key={h} style={{ textAlign: h === "Property" ? "left" : "right", padding: "10px 14px", fontWeight: 500 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {yieldData.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "10px 14px", color: colors.text }}>{p.name}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#34d399" }}>{fmt(p.annualIncome)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: p.netAnnual >= 0 ? "#34d399" : "#f97070", fontWeight: 600 }}>{fmt(p.netAnnual)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#60a5fa" }}>{p.grossYield ? `${p.grossYield}%` : "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#60a5fa" }}>{p.netYield ? `${p.netYield}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab({ properties, payments, expenses, contracts, rentHistory, mortgages, colors }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportProp, setReportProp] = useState("all");
  const years = Array.from(new Set([...payments, ...expenses].map(x => (x.month || x.date || "").slice(0, 4)).filter(Boolean))).sort().reverse();
  if (!years.includes(String(year))) years.unshift(String(year));

  const filtPay = payments.filter(p => p.month?.startsWith(year) && (reportProp === "all" || p.property_id === reportProp));
  const filtExp = expenses.filter(e => e.date?.startsWith(year) && (reportProp === "all" || e.property_id === reportProp));
  const totalIncome = filtPay.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = filtExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalMortgage = mortgages.reduce((s, m) => s + Number(m.monthly_payment || 0), 0) * 12;
  const netIncome = totalIncome - totalExpenses - totalMortgage;

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const monthly = months.map(m => {
    const key = `${year}-${m}`;
    const inc = filtPay.filter(p => p.month === key && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const exp = filtExp.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { month: key, inc, exp, net: inc - exp };
  });
  const maxVal = Math.max(...monthly.map(m => Math.max(m.inc, m.exp)), 1);

  const byCat = {};
  filtExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });

  const perProp = properties.map(prop => {
    const inc = payments.filter(p => p.property_id === prop.id && p.month?.startsWith(year) && p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const exp = expenses.filter(e => e.property_id === prop.id && e.date?.startsWith(year)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { ...prop, inc, exp, net: inc - exp };
  });

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function exportReport() {
    exportToCSV(monthly.map((m, i) => ({ Month: shortMonths[i], Income: m.inc, Expenses: m.exp, Net: m.net })), `report_${year}.csv`);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Reports & Tax Summary</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...getInputStyle(colors), padding: "6px 12px" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={reportProp} onChange={e => setReportProp(e.target.value)} style={{ ...getInputStyle(colors), padding: "6px 12px" }}>
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={exportReport} style={btnStyle("#2a2d3a")}>📥 Export CSV</button>
          <button onClick={() => window.print()} style={btnStyle("#2a2d3a")}>🖨 Print</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: `Income ${year}`, val: fmt(totalIncome), color: "#34d399" },
          { label: `Expenses ${year}`, val: fmt(totalExpenses), color: "#f97070" },
          { label: "Mortgages (est.)", val: fmt(totalMortgage), color: "#f0b429" },
          { label: "Net Income", val: fmt(netIncome), color: netIncome >= 0 ? "#34d399" : "#f97070" },
        ].map(s => (
          <div key={s.label} style={{ background: colors.card, borderRadius: 12, padding: "16px 18px", border: `1px solid ${colors.border}` }}>
            <div style={{ color: colors.sub, fontSize: 12, marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Monthly Breakdown {year}</div>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 100 }}>
          {monthly.map((m, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 85 }}>
                <div style={{ flex: 1, background: "#34d399", borderRadius: "2px 2px 0 0", height: `${(m.inc / maxVal) * 100}%`, minHeight: m.inc > 0 ? 2 : 0 }} title={`Income: ${fmt(m.inc)}`} />
                <div style={{ flex: 1, background: "#f97070", borderRadius: "2px 2px 0 0", height: `${(m.exp / maxVal) * 100}%`, minHeight: m.exp > 0 ? 2 : 0 }} title={`Expenses: ${fmt(m.exp)}`} />
              </div>
              <div style={{ fontSize: 8, color: colors.sub }}>{shortMonths[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Per Property</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ color: colors.sub, borderBottom: `1px solid ${colors.border}` }}>{["Property", "Income", "Expenses", "Net"].map(h => <th key={h} style={{ textAlign: h === "Property" ? "left" : "right", padding: "8px 0", fontWeight: 500 }}>{h}</th>)}</tr></thead>
          <tbody>
            {perProp.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: "8px 0", color: colors.text }}>{p.name}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "#34d399" }}>{fmt(p.inc)}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "#f97070" }}>{fmt(p.exp)}</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: p.net >= 0 ? "#34d399" : "#f97070", fontWeight: 600 }}>{fmt(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: "16px 20px" }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Expenses by Category (Tax)</div>
        {Object.keys(byCat).length === 0 && <div style={{ color: colors.sub, fontSize: 13 }}>No expenses this year.</div>}
        {Object.entries(byCat).map(([cat, amt]) => (
          <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
            <span style={{ color: colors.text }}>{cat}</span>
            <span style={{ color: "#f97070", fontWeight: 600 }}>{fmt(amt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TENANT PORTAL ────────────────────────────────────────────────────────────
function TenantPortal({ payments, contracts, onLogout, colors }) {
  const [selectedTenant, setSelectedTenant] = useState("");
  const uniqueTenants = [...new Set(contracts.map(c => c.tenant_name))];
  const myContracts = contracts.filter(c => c.tenant_name === selectedTenant);
  const myPayments = payments.filter(p => p.tenant_name === selectedTenant).slice(0, 24);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "DM Sans, sans-serif", color: "#e8eaf0" }}>
      <div style={{ background: "#161922", borderBottom: "1px solid #1e2130", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>🏠 Tenant Portal</span>
        <button onClick={onLogout} style={btnStyle("#2a2d3a", 12)}>Logout</button>
      </div>
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#888", fontSize: 12, display: "block", marginBottom: 4 }}>Select your name</label>
          <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} style={{ background: "#161922", border: "1px solid #2a2d3a", borderRadius: 8, color: "#e8eaf0", fontSize: 14, padding: "10px 12px", width: "100%" }}>
            <option value="">— Select —</option>
            {uniqueTenants.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {selectedTenant && (
          <>
            {myContracts.map(c => (
              <div key={c.id} style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{c.property_address || "—"}</div>
                <div style={{ color: "#888", fontSize: 13 }}>{displayDate(c.start_date)} → {displayDate(c.end_date)}</div>
                <div style={{ color: "#4f7ef7", fontWeight: 700, marginTop: 4 }}>{fmt(c.monthly_rent)}/mo</div>
                {c.renewal_option && <div style={{ color: "#60a5fa", fontSize: 12, marginTop: 4 }}>🔄 Renewal: {c.renewal_option}</div>}
              </div>
            ))}
            <h3 style={{ margin: "20px 0 12px" }}>Payment History</h3>
            <div style={{ background: "#161922", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
              {myPayments.length === 0 && <div style={{ padding: 16, color: "#888", fontSize: 13 }}>No payment records.</div>}
              {myPayments.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1e2130" }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{monthLabel(p.month)}</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>{fmt(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, onClose, children, colors }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: colors?.card || "#161922", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${colors?.border || "#2a2d3a"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: colors?.text || "#e8eaf0" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: colors?.sub || "#888", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, colors }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: colors?.card || "#161922", borderRadius: 16, padding: 28, width: "100%", maxWidth: 360, border: "1px solid #3a1a1a", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ margin: "0 0 8px", color: colors?.text || "#e8eaf0" }}>{title}</h3>
        <p style={{ color: colors?.sub || "#888", fontSize: 14, margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onConfirm} style={btnStyle("#f97070")}>Yes, delete</button>
          <button onClick={onCancel} style={btnStyle("#2a2d3a")}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "#555" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange, options, colors }) {
  const style = { ...getInputStyle(colors), width: "100%", boxSizing: "border-box", marginBottom: 12 };
  return (
    <div>
      <label style={{ display: "block", color: colors?.sub || "#888", fontSize: 12, marginBottom: 4 }}>{label}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          <option value="">— Select —</option>
          {options?.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={style} />
      )}
    </div>
  );
}

function DateField({ label, value, onChange, colors }) {
  const toDisplay = (v) => { if (!v) return ""; const [y, m, d] = v.split("-"); if (!y || !m || !d) return v; return `${d}/${m}/${y}`; };
  const toStore = (v) => { const clean = v.replace(/[^\d/]/g, ""); const parts = clean.split("/"); if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`; return v; };
  return (
    <div>
      <label style={{ display: "block", color: colors?.sub || "#888", fontSize: 12, marginBottom: 4 }}>{label}</label>
      <input type="text" placeholder="dd/mm/yyyy" value={toDisplay(value)} onChange={e => onChange(toStore(e.target.value))} maxLength={10} style={{ ...getInputStyle(colors), width: "100%", boxSizing: "border-box", marginBottom: 12 }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { paid: "#34d399", pending: "#f0b429", late: "#f97070" };
  return <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "#0f1117", color: colors[status] || "#888", border: `1px solid ${colors[status] || "#888"}` }}>{status}</span>;
}

function InfoCard({ label, value, colors }) {
  return (
    <div style={{ background: colors?.bg || "#0f1117", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ color: colors?.sub || "#555", fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: colors?.text || "#ccc", fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function getInputStyle(colors) {
  return {
    background: colors?.input || "#0f1117",
    border: `1px solid ${colors?.inputBorder || "#2a2d3a"}`,
    borderRadius: 8, color: colors?.text || "#e8eaf0",
    fontSize: 14, padding: "10px 12px",
    fontFamily: "DM Sans, sans-serif", outline: "none"
  };
}

function btnStyle(bg, fontSize = 14) {
  return {
    background: bg, border: "none", borderRadius: 8, color: "#e8eaf0",
    fontSize, fontWeight: 500, padding: fontSize <= 12 ? "5px 10px" : "9px 16px",
    cursor: "pointer", fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap"
  };
}
