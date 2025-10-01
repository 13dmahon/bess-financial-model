import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, ComposedChart
} from "recharts";
import {
  Download, TrendingUp, Battery, Zap, PoundSterling,
  Calculator, FileText, Sliders, FileSpreadsheet, Upload, Check, AlertCircle,
  Copy, Mail, Trash2, Edit, Plus, ArrowUpDown
} from "lucide-react";

const BESSFinancialModel = () => {
  const [inputs, setInputs] = useState({
    projectName: "Staythorpe",
    capacityMW: 360,
    capacityMWh: 720,
    duration: 2,
    roundtripEfficiency: 85,
    degradationRate: 2.5,
    augmentationYear: 10,
    augmentationCost: 150,
    auxiliaryLoad: 2,
    availability: 95,
    capacityMarketPrice: 45000,
    dcPriceHigh: 17,
    dcPriceLow: 9,
    dmPrice: 8,
    drPrice: 12,
    arbitrageSpread: 35,
    cyclesPerDay: 1.2,
    ancillaryServices: 8000,
    batteryCostPerMWh: 180000,
    pcsCostPerMW: 80000,
    bopCostPerMW: 120000,
    epcPerMW: 50000,
    interconnectionCost: 15000000,
    developmentCost: 8000000,
    contingency: 10,
    fixedOM: 12000,
    variableOMPerCycle: 0.5,
    insurance: 0.5,
    propertyTax: 0.8,
    landLease: 500000,
    assetManagement: 0.3,
    debtPercentage: 75,
    interestRate: 6.5,
    debtTenor: 18,
    equityIRRTarget: 12,
    corporateTax: 25,
    inflation: 2.5,
    discountRate: 8,
    constructionPeriod: 2,
    operatingPeriod: 25,
    codYear: 2025,
  });

  const [scenario, setScenario] = useState("base");
  const [tab, setTab] = useState("dashboard");
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectPortfolio, setProjectPortfolio] = useState([]);
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [emailTone, setEmailTone] = useState("formal");
  const [toast, setToast] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "irr", direction: "desc" });

  const scenarios = {
    base: { name: "Base Case", multiplier: 1.0, tag: "P50" },
    upside: { name: "Upside", multiplier: 1.2, tag: "P90" },
    downside: { name: "Downside", multiplier: 0.8, tag: "P10" },
  };

  const calc = (S = inputs, mult = scenarios[scenario].multiplier) => {
    const batteryCost = S.capacityMWh * S.batteryCostPerMWh;
    const pcsCost = S.capacityMW * S.pcsCostPerMW;
    const bopCost = S.capacityMW * S.bopCostPerMW;
    const epcCost = S.capacityMW * S.epcPerMW;
    const totalCapex =
      (batteryCost + pcsCost + bopCost + epcCost + S.interconnectionCost + S.developmentCost) *
      (1 + S.contingency / 100);

    const debtAmount = totalCapex * (S.debtPercentage / 100);
    const equityAmount = totalCapex - debtAmount;
    const annuity =
      debtAmount *
      ((S.interestRate / 100) * Math.pow(1 + S.interestRate / 100, S.debtTenor)) /
      (Math.pow(1 + S.interestRate / 100, S.debtTenor) - 1);

    const years = [];
    let outstanding = debtAmount;

    for (let y = 1; y <= S.operatingPeriod; y++) {
      const degr = Math.pow(1 - S.degradationRate / 100, y);
      const effMW = S.capacityMW * degr * (S.availability / 100);

      const capacityRevenue = effMW * S.capacityMarketPrice * mult;
      const dcRevenue = effMW * 8760 * ((S.dcPriceHigh + S.dcPriceLow) / 2) * 0.4 * mult;
      const arbitrageRevenue = S.capacityMWh * S.cyclesPerDay * 365 * S.arbitrageSpread * (S.roundtripEfficiency / 100) * mult;
      const ancillaryRevenue = effMW * S.ancillaryServices * mult;

      const revenue = capacityRevenue + dcRevenue + arbitrageRevenue + ancillaryRevenue;

      const fixed = S.capacityMW * S.fixedOM * Math.pow(1 + S.inflation / 100, y);
      const variable = S.capacityMWh * S.cyclesPerDay * 365 * S.variableOMPerCycle;
      const insurance = totalCapex * (S.insurance / 100);
      const rates = totalCapex * (S.propertyTax / 100);
      const opex = fixed + variable + insurance + rates + S.landLease + totalCapex * (S.assetManagement / 100);

      const aug = y === S.augmentationYear ? S.capacityMWh * S.augmentationCost * 1000 : 0;

      const ebitda = revenue - opex;
      const debtPay = y <= S.debtTenor ? annuity : 0;
      const interest = outstanding * (S.interestRate / 100);
      const principal = y <= S.debtTenor ? Math.max(0, debtPay - interest) : 0;

      outstanding = Math.max(0, outstanding - principal);
      const ebt = ebitda - (outstanding > 0 ? interest : 0);
      const tax = Math.max(0, ebt * (S.corporateTax / 100));
      const net = ebt - tax;

      const fcf = net + (y <= S.debtTenor ? principal : 0) - aug;
      const dscr = ebitda / (debtPay || 1);

      years.push({
        year: S.codYear + y,
        yearNum: y,
        effectiveCapacity: Number(effMW.toFixed(1)),
        capacityRevenue: capacityRevenue / 1_000_000,
        dcRevenue: dcRevenue / 1_000_000,
        arbitrageRevenue: arbitrageRevenue / 1_000_000,
        ancillaryRevenue: ancillaryRevenue / 1_000_000,
        totalRevenue: revenue / 1_000_000,
        totalOpex: opex / 1_000_000,
        ebitda: ebitda / 1_000_000,
        augmentation: aug / 1_000_000,
        debtService: debtPay / 1_000_000,
        taxPayment: tax / 1_000_000,
        netIncome: net / 1_000_000,
        freeCashFlow: fcf / 1_000_000,
        cumulativeDebt: outstanding / 1_000_000,
        dscr,
      });
    }

    const totalCF = years.reduce((s, y) => s + y.freeCashFlow, 0);
    const npv =
      years.reduce((s, y) => s + y.freeCashFlow / Math.pow(1 + inputs.discountRate / 100, y.yearNum), 0) -
      equityAmount / 1_000_000;
    const avgDSCR =
      years.slice(0, inputs.debtTenor).reduce((s, y) => s + y.dscr, 0) /
      Math.min(inputs.debtTenor, years.length);
    const minDSCR = Math.min(...years.slice(0, inputs.debtTenor).map((y) => y.dscr));

    let irr = 0;
    for (let r = 0; r <= 50; r += 0.1) {
      const n = years.reduce((s, y) => s + y.freeCashFlow / Math.pow(1 + r / 100, y.yearNum), 0) - equityAmount / 1_000_000;
      if (n <= 0) { irr = r; break; }
    }

    return {
      totalCapex: totalCapex / 1_000_000,
      debtAmount: debtAmount / 1_000_000,
      equityAmount: equityAmount / 1_000_000,
      annualDebtService: annuity / 1_000_000,
      years, npv, irr, averageDSCR: avgDSCR, minDSCR, totalCashFlows: totalCF
    };
  };

  const financials = useMemo(() => calc(), [inputs, scenario]);

  const optimizeDebt = () => {
    const results = [];
    let best = { debt: inputs.debtPercentage, irr: -Infinity };

    for (let d = 50; d <= 90; d++) {
      const tf = calc({ ...inputs, debtPercentage: d }, scenarios[scenario].multiplier);
      results.push({ debt: d, irr: tf.irr, minDSCR: tf.minDSCR, avgDSCR: tf.averageDSCR });
      if (tf.minDSCR >= 1.2 && tf.irr > best.irr) best = { debt: d, irr: tf.irr };
    }
    return { results, best };
  };

  const exportCSV = () => {
    let csv = `${inputs.projectName} ${inputs.capacityMW}MW BESS Financial Model\nGenerated,${new Date().toLocaleString()}\nScenario,${scenarios[scenario].name}\n\n`;
    csv += `CAPEX,£${financials.totalCapex.toFixed(1)}m\nIRR,${financials.irr.toFixed(1)}%\nNPV,${financials.npv.toFixed(1)}m\n\n`;
    csv += "Year,Revenue,OPEX,EBITDA,FCF,DSCR\n";
    financials.years.forEach(y => {
      csv += `${y.year},${y.totalRevenue.toFixed(1)},${y.totalOpex.toFixed(1)},${y.ebitda.toFixed(1)},${y.freeCashFlow.toFixed(1)},${y.dscr.toFixed(2)}\n`;
    });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${inputs.projectName}_${scenario}.csv`; a.click();
  };

  const revenueBreakdown = [
    { name: "Capacity Market", value: financials.years[0]?.capacityRevenue || 0, color: "#2563eb" },
    { name: "Dynamic Containment", value: financials.years[0]?.dcRevenue || 0, color: "#8b5cf6" },
    { name: "Arbitrage", value: financials.years[0]?.arbitrageRevenue || 0, color: "#16a34a" },
    { name: "Ancillary", value: financials.years[0]?.ancillaryRevenue || 0, color: "#f59e0b" },
  ];

  const update = (k, v) =>
    setInputs(p => ({ ...p, [k]: k === "projectName" ? v : (parseFloat(v) || 0) }));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const extracted = parseDocumentForInputs(text);
      setExtractedData(extracted);
      showToast("Document processed successfully!", "success");
    } catch (err) {
      showToast("Error processing document", "error");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseDocumentForInputs = (text) => {
    const found = {};
    const patterns = {
      projectName: /project\s+(?:name|title)[:\s]+([a-z0-9\s]+)/i,
      capacityMW: /(\d+\.?\d*)\s*MW(?!\s*h)/gi,
      capacityMWh: /(\d+\.?\d*)\s*MWh/gi,
      duration: /(\d+\.?\d*)\s*(?:hour|hr|h)\s+duration/gi,
      roundtripEfficiency: /(?:roundtrip|round-trip|rt)\s+efficiency[:\s]+(\d+\.?\d*)%?/gi,
      degradationRate: /degradation[:\s]+(\d+\.?\d*)%?/gi,
      capacityMarketPrice: /capacity\s+market[:\s]+£?(\d+,?\d*)/gi,
      arbitrageSpread: /arbitrage[:\s]+£?(\d+\.?\d*)/gi,
      cyclesPerDay: /(\d+\.?\d*)\s+cycles?\s+(?:per\s+)?day/gi,
      debtPercentage: /(\d+)%?\s+debt/gi,
      interestRate: /interest\s+rate[:\s]+(\d+\.?\d*)%?/gi,
      codYear: /COD[:\s]+(\d{4})/gi,
      operatingPeriod: /(?:operating|operation)\s+period[:\s]+(\d+)\s+years?/gi,
    };

    Object.entries(patterns).forEach(([key, regex]) => {
      const matches = [...text.matchAll(regex)];
      if (matches.length > 0) {
        const value = matches[0][1].replace(/,/g, '');
        found[key] = {
          value: key === 'projectName' ? value.trim() : parseFloat(value),
          confidence: matches.length > 1 ? 'medium' : 'high',
          source: matches[0][0].substring(0, 50) + '...'
        };
      }
    });

    return found;
  };

  const applyExtractedData = () => {
    if (!extractedData) return;
    
    const newInputs = { ...inputs };
    Object.entries(extractedData).forEach(([key, data]) => {
      newInputs[key] = data.value;
    });
    setInputs(newInputs);
    showToast("Data applied to model!", "success");
  };

  const addToPortfolio = () => {
    const newProject = {
      id: Date.now(),
      ...inputs,
      ...financials,
      scenario,
      dateAdded: new Date().toLocaleString(),
      dataSource: extractedData ? "Document Upload" : "Manual",
    };
    setProjectPortfolio(prev => [...prev, newProject]);
    showToast(`${inputs.projectName} added to portfolio!`, "success");
  };

  const removeProject = (id) => {
    setProjectPortfolio(prev => prev.filter(p => p.id !== id));
    showToast("Project removed", "success");
  };

  const loadProject = (project) => {
    const { id, years, npv, irr, averageDSCR, minDSCR, totalCapex, debtAmount, 
            equityAmount, annualDebtService, totalCashFlows, dateAdded, dataSource, ...projectInputs } = project;
    setInputs(projectInputs);
    setScenario(project.scenario);
    showToast(`Loaded ${project.projectName}`, "success");
  };

  const sortedPortfolio = useMemo(() => {
    const sorted = [...projectPortfolio];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [projectPortfolio, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const generateEmail = () => {
    const missing = [];
    const categories = {
      technical: ['capacityMW', 'capacityMWh', 'duration', 'roundtripEfficiency', 'degradationRate', 'availability'],
      revenue: ['capacityMarketPrice', 'dcPriceHigh', 'dcPriceLow', 'arbitrageSpread', 'cyclesPerDay', 'ancillaryServices'],
      costs: ['batteryCostPerMWh', 'pcsCostPerMW', 'bopCostPerMW', 'interconnectionCost', 'developmentCost'],
      finance: ['debtPercentage', 'interestRate', 'equityIRRTarget', 'corporateTax'],
      timeline: ['codYear', 'constructionPeriod', 'operatingPeriod']
    };

    Object.entries(categories).forEach(([cat, fields]) => {
      fields.forEach(field => {
        if (!extractedData || !extractedData[field]) {
          missing.push({ category: cat, field, label: field.replace(/([A-Z])/g, ' $1').trim() });
        }
      });
    });

    const greeting = emailTone === 'formal' 
      ? "Dear [Recipient Name],"
      : "Hi [Name],";

    const opening = emailTone === 'formal'
      ? `Thank you for providing the initial project documentation for ${inputs.projectName}. To complete our financial analysis and provide you with accurate modeling results, we require the following additional information:`
      : `Thanks for sending over the info on ${inputs.projectName}! To finish up the financial model, I just need a few more details:`;

    let body = `${greeting}\n\n${opening}\n\n`;

    const grouped = missing.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item.label);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([cat, items]) => {
      const catName = cat.charAt(0).toUpperCase() + cat.slice(1) + ' Parameters';
      body += `${catName}:\n`;
      items.forEach(item => body += `  • ${item}\n`);
      body += '\n';
    });

    const closing = emailTone === 'formal'
      ? "Once we receive this information, we can finalize the financial model and provide comprehensive valuation metrics including IRR, NPV, and debt service coverage ratios.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\n[Your Name]"
      : "Once I have these, I'll run the full analysis and send over the IRR, NPV, and DSCR numbers.\n\nLet me know if you need any clarification on what I'm looking for!\n\nCheers,\n[Your Name]";

    body += closing;

    return body;
  };

  const copyEmailToClipboard = () => {
    const email = generateEmail();
    navigator.clipboard.writeText(email);
    showToast("Email copied to clipboard!", "success");
  };

  const styles = `
  * { box-sizing: border-box; }
  .shell{ max-width:1200px; margin:40px auto; padding:0 20px; }
  .topbar{
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:20px; flex-wrap:wrap; gap:16px;
  }
  .brand{ display:flex; gap:14px; align-items:center; }
  .brand h1{ font-size:28px; font-weight:800; margin:0; letter-spacing:.2px; }
  .sub{ color:#64748b; font-size:14px; margin-top:4px }
  .btn{
    display:inline-flex; align-items:center; gap:8px;
    background:white; color:#0f172a;
    border:1px solid #e5e7eb; padding:10px 14px; border-radius:10px;
    font-weight:600; cursor:pointer; transition:.15s ease; font-size:14px;
  }
  .btn:hover{ box-shadow:0 2px 14px rgba(0,0,0,.1) }
  .btn.primary{ background:#2563eb; border-color:#2563eb; color:white }
  .toolbar{ display:flex; gap:10px; flex-wrap:wrap }
  .panel{ background:white; border:1px solid #e5e7eb; border-radius:16px; padding:16px 18px; }
  .chips{ display:flex; gap:10px; flex-wrap:wrap }
  .chip{
    background:#eef2ff; color:#1e40af; border:1px solid #dbeafe;
    padding:8px 12px; border-radius:999px; font-weight:600; cursor:pointer; font-size:14px;
  }
  .chip.active{ background:#2563eb; color:white; border-color:#2563eb }
  .tabs{ display:flex; gap:6px; margin-top:14px; flex-wrap:wrap }
  .tab{ background:transparent; border:none; padding:10px 14px; border-radius:10px; font-weight:700; color:#64748b; cursor:pointer; font-size:14px }
  .tab.active{ background:#2563eb; color:white }
  .grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:16px; margin-top:16px }
  @media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .card, .chart { grid-column: span 1 !important; }
  }
  .card{ grid-column: span 3; padding:18px; border:1px solid #e5e7eb; background:white; border-radius:16px; }
  .k{ display:flex; align-items:flex-start; gap:12px }
  .k .title{ font-size:12px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:.5px }
  .k .val{ font-size:28px; font-weight:800; margin-top:4px }
  .blue{ background:linear-gradient(180deg,#e0ecff,#ffffff) }
  .green{ background:linear-gradient(180deg,#defce7,#ffffff) }
  .purple{ background:linear-gradient(180deg,#efe9ff,#ffffff) }
  .orange{ background:linear-gradient(180deg,#fff1db,#ffffff) }
  .chart{ grid-column: span 6; }
  .table-wrap{ background:white; border:1px solid #e5e7eb; border-radius:16px; overflow:auto }
  table{ width:100%; border-collapse:collapse; min-width:800px }
  thead{ background:#f1f5f9 }
  th,td{ padding:12px 14px; text-align:right; font-size:14px }
  th:first-child, td:first-child{ text-align:left }
  tbody tr:nth-child(even){ background:#fafafa }
  .upload-zone{
    border:2px dashed #cbd5e1; border-radius:12px; padding:40px;
    text-align:center; cursor:pointer; transition:.2s ease;
  }
  .upload-zone:hover{ border-color:#2563eb; background:#f8fafc }
  .extraction-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-top:16px }
  .extracted-item{
    background:#f0fdf4; border:1px solid #86efac; padding:12px; border-radius:8px;
  }
  .extracted-item.missing{
    background:#fef3c7; border-color:#fbbf24;
  }
  .badge{
    display:inline-block; padding:4px 8px; border-radius:6px;
    font-size:11px; font-weight:700; text-transform:uppercase;
  }
  .badge.high{ background:#dcfce7; color:#166534 }
  .badge.medium{ background:#fef3c7; color:#92400e }
  .badge.low{ background:#fee2e2; color:#991b1b }
  .toast{
    position:fixed; bottom:20px; right:20px; background:white;
    border:1px solid #e5e7eb; border-radius:12px; padding:16px 20px;
    box-shadow:0 4px 20px rgba(0,0,0,.15); z-index:100;
    display:flex; align-items:center; gap:12px; max-width:400px;
  }
  .toast.success{ border-left:4px solid #16a34a }
  .toast.error{ border-left:4px solid #ef4444 }
  .modal-backdrop{
    position:fixed; inset:0; background:rgba(0,0,0,.5);
    display:flex; align-items:center; justify-content:center;
    padding:20px; z-index:50; overflow-y:auto;
  }
  .portfolio-row{ cursor:pointer; transition:.15s ease }
  .portfolio-row:hover{ background:#f1f5f9 !important }
  .portfolio-row.excellent{ border-left:4px solid #16a34a }
  .portfolio-row.good{ border-left:4px solid #f59e0b }
  .portfolio-row.poor{ border-left:4px solid #ef4444 }
  .action-btns{ display:flex; gap:8px; justify-content:flex-end }
  .icon-btn{
    background:transparent; border:none; cursor:pointer;
    padding:6px; border-radius:6px; transition:.15s ease;
  }
  .icon-btn:hover{ background:#f1f5f9 }
  input[type="text"], input[type="number"] {
    width:100%; padding:8px 12px; border:1px solid #e5e7eb;
    border-radius:8px; font-size:14px; margin-top:4px;
  }
  label { display:block; font-weight:600; font-size:14px; margin-bottom:4px; color:#334155 }
  `;

  return (
    <>
      <style>{styles}</style>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={20} color="#16a34a" /> : <AlertCircle size={20} color="#ef4444" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <Battery size={28} color="#2563eb" />
            <div>
              <h1>{inputs.projectName} {inputs.capacityMW}MW BESS</h1>
              <div className="sub">Financial Model & Valuation • Elements Green (UK)</div>
            </div>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={exportCSV}><FileSpreadsheet size={18}/> Export CSV</button>
            <button className="btn" onClick={() => setShowOptimizer(true)}><Sliders size={18}/> Optimize</button>
            <button className="btn" onClick={addToPortfolio}><Plus size={18}/> Add to Portfolio</button>
            <button className="btn primary"><Download size={18}/> Share</button>
          </div>
        </div>

        <div className="panel">
          <div style={{fontWeight:700, marginBottom:10}}>Scenario Analysis</div>
          <div className="chips">
            {Object.entries(scenarios).map(([key, val]) => (
              <button
                key={key}
                className={`chip ${key===scenario ? "active":""}`}
                onClick={()=>setScenario(key)}
              >
                {val.name} ({val.tag})
              </button>
            ))}
          </div>

          <div className="tabs">
            {["dashboard","upload","inputs","portfolio","cashflow","sensitivity"].map(t => (
              <button key={t} className={`tab ${t===tab?"active":""}`} onClick={()=>setTab(t)}>
                {t[0].toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab==="dashboard" && (
          <>
            <div className="grid">
              <div className="card blue">
                <div className="k">
                  <PoundSterling size={24} />
                  <div>
                    <div className="title">Total CAPEX</div>
                    <div className="val">£{financials.totalCapex.toFixed(0)}m</div>
                    <div className="sub">{inputs.debtPercentage}% Debt • {100-inputs.debtPercentage}% Equity</div>
                  </div>
                </div>
              </div>

              <div className="card green">
                <div className="k">
                  <TrendingUp size={24} />
                  <div>
                    <div className="title">Project IRR</div>
                    <div className="val">{financials.irr.toFixed(1)}%</div>
                    <div className="sub">NPV £{financials.npv.toFixed(1)}m @ {inputs.discountRate}%</div>
                  </div>
                </div>
              </div>

              <div className="card purple">
                <div className="k">
                  <Zap size={24} />
                  <div>
                    <div className="title">Year 1 Revenue</div>
                    <div className="val">£{financials.years[0]?.totalRevenue.toFixed(1)}m</div>
                    <div className="sub">EBITDA £{financials.years[0]?.ebitda.toFixed(1)}m</div>
                  </div>
                </div>
              </div>

              <div className="card orange">
                <div className="k">
                  <Calculator size={24} />
                  <div>
                    <div className="title">Avg DSCR</div>
                    <div className="val">{financials.averageDSCR.toFixed(2)}x</div>
                    <div className="sub">Min {financials.minDSCR.toFixed(2)}x • Tenor {inputs.debtTenor}y</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid" style={{marginTop:8}}>
              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>Revenue Stack – Year 1</div>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}
                         label={(e)=>`£${e.value.toFixed(1)}m`}>
                      {revenueBreakdown.map((d,i)=><Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>`£${Number(v).toFixed(1)}m`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>25-Year Cash Flow</div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={financials.years}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v)=>`£${Number(v).toFixed(1)}m`} />
                    <Legend />
                    <Area type="monotone" dataKey="totalRevenue" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} name="Revenue" />
                    <Area type="monotone" dataKey="freeCashFlow" stackId="2" stroke="#16a34a" fill="#16a34a" fillOpacity={0.35} name="FCF" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>Debt Service Coverage</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financials.years.slice(0, inputs.debtTenor)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v)=>`${Number(v).toFixed(2)}x`} />
                    <Legend />
                    <Line type="monotone" dataKey="dscr" stroke="#16a34a" strokeWidth={3} name="DSCR" />
                    <Line type="monotone" dataKey={()=>1.2} stroke="#ef4444" strokeDasharray="6 6" name="Covenant 1.20x" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>Capacity Degradation</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financials.years}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v)=>`${v} MW`} />
                    <Legend />
                    <Line type="monotone" dataKey="effectiveCapacity" stroke="#8b5cf6" strokeWidth={3} name="Effective MW" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab==="upload" && (
          <div style={{marginTop:16}}>
            <div className="panel">
              <div style={{fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:10}}>
                <Upload size={24} />
                <span>Upload Project Document</span>
              </div>
              
              <input 
                type="file" 
                id="fileUpload" 
                accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt"
                style={{display:'none'}}
                onChange={handleFileUpload}
              />
              
              <label htmlFor="fileUpload" className="upload-zone">
                {isProcessing ? (
                  <div>
                    <div style={{fontSize:16, fontWeight:700, marginBottom:8}}>Processing document...</div>
                    <div style={{color:'#64748b'}}>Extracting financial data</div>
                  </div>
                ) : uploadedFile ? (
                  <div>
                    <FileText size={40} color="#2563eb" style={{margin:'0 auto 12px'}} />
                    <div style={{fontSize:16, fontWeight:700, marginBottom:4}}>{uploadedFile.name}</div>
                    <div style={{color:'#64748b', fontSize:14}}>Click to upload a different file</div>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} color="#64748b" style={{margin:'0 auto 12px'}} />
                    <div style={{fontSize:16, fontWeight:700, marginBottom:4}}>Click to upload or drag and drop</div>
                    <div style={{color:'#64748b', fontSize:14}}>PDF, DOCX, PPTX, XLSX, CSV, TXT (max 10MB)</div>
                  </div>
                )}
              </label>

              {extractedData && Object.keys(extractedData).length > 0 && (
                <>
                  <div style={{marginTop:24, fontWeight:700, marginBottom:12}}>Extracted Data</div>
                  <div className="extraction-grid">
                    {Object.entries(extractedData).map(([key, data]) => (
                      <div key={key} className="extracted-item">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                          <span style={{fontWeight:700, fontSize:13}}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`badge ${data.confidence}`}>{data.confidence}</span>
                        </div>
                        <div style={{fontSize:18, fontWeight:800, marginBottom:4}}>{data.value}</div>
                        <div style={{fontSize:11, color:'#64748b', fontStyle:'italic'}}>
                          "{data.source}"
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{marginTop:20, display:'flex', gap:12, flexWrap:'wrap'}}>
                    <button className="btn primary" onClick={applyExtractedData} style={{flex:1, minWidth:200}}>
                      <Check size={18} /> Apply Data to Model
                    </button>
                    <button className="btn" onClick={() => setShowEmailGenerator(true)} style={{flex:1, minWidth:200}}>
                      <Mail size={18} /> Generate Email
                    </button>
                  </div>
                </>
              )}

              {!extractedData && !isProcessing && (
                <div style={{marginTop:20, padding:16, background:'#f8fafc', borderRadius:10}}>
                  <div style={{fontWeight:700, marginBottom:8}}>What we look for:</div>
                  <div style={{color:'#64748b', fontSize:14, lineHeight:1.6}}>
                    • Project name and capacity (MW/MWh)<br/>
                    • Technical specs (efficiency, degradation, duration)<br/>
                    • Revenue assumptions (capacity market, arbitrage prices)<br/>
                    • Cost breakdown (CAPEX, OPEX, financing terms)<br/>
                    • Timeline (COD date, operating period)
                  </div>
                </div>
              )}
            </div>

            {extractedData && (
              <div className="panel" style={{marginTop:16}}>
                <div style={{fontWeight:700, marginBottom:12}}>Input Status Overview</div>
                <div className="extraction-grid">
                  {['capacityMW', 'capacityMWh', 'roundtripEfficiency', 'degradationRate', 
                    'capacityMarketPrice', 'arbitrageSpread', 'batteryCostPerMWh', 'debtPercentage'].map(key => {
                    const isExtracted = extractedData[key];
                    return (
                      <div key={key} className={`extracted-item ${isExtracted ? '' : 'missing'}`}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          {isExtracted ? <Check size={16} color="#16a34a" /> : <AlertCircle size={16} color="#f59e0b" />}
                          <span style={{fontWeight:700, fontSize:13}}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <div style={{fontSize:12, color:'#64748b', marginTop:4}}>
                          {isExtracted ? 'From document' : 'Using default assumption'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="portfolio" && (
          <div style={{marginTop:16}}>
            {projectPortfolio.length === 0 ? (
              <div className="panel" style={{textAlign:'center', padding:60}}>
                <Battery size={60} color="#64748b" style={{margin:'0 auto 20px'}} />
                <div style={{fontSize:20, fontWeight:800, marginBottom:8}}>No Projects Yet</div>
                <div style={{color:'#64748b', marginBottom:24}}>
                  Add your first project to start building your portfolio comparison
                </div>
                <button className="btn primary" onClick={() => setTab('dashboard')}>
                  <Plus size={18} /> Create First Project
                </button>
              </div>
            ) : (
              <>
                <div className="panel" style={{marginBottom:16}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16}}>
                    <div>
                      <div style={{fontWeight:800, fontSize:18}}>Project Portfolio</div>
                      <div style={{color:'#64748b', fontSize:14, marginTop:4}}>
                        {projectPortfolio.length} project{projectPortfolio.length !== 1 ? 's' : ''} • 
                        Sorted by {sortConfig.key} ({sortConfig.direction})
                      </div>
                    </div>
                    <button className="btn" onClick={() => {
                      const csv = `Project,Capacity MW,IRR %,NPV £m,Avg DSCR,Min DSCR,CAPEX £m,Scenario,Date Added\n` +
                        projectPortfolio.map(p => 
                          `${p.projectName},${p.capacityMW},${p.irr.toFixed(1)},${p.npv.toFixed(1)},` +
                          `${p.averageDSCR.toFixed(2)},${p.minDSCR.toFixed(2)},${p.totalCapex.toFixed(1)},${p.scenario},${p.dateAdded}`
                        ).join('\n');
                      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'portfolio_comparison.csv';
                      a.click();
                    }}>
                      <Download size={18} /> Export Portfolio
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          {key: 'projectName', label: 'Project'},
                          {key: 'capacityMW', label: 'MW'},
                          {key: 'capacityMWh', label: 'MWh'},
                          {key: 'irr', label: 'IRR %'},
                          {key: 'npv', label: 'NPV £m'},
                          {key: 'averageDSCR', label: 'Avg DSCR'},
                          {key: 'minDSCR', label: 'Min DSCR'},
                          {key: 'totalCapex', label: 'CAPEX £m'},
                          {key: 'scenario', label: 'Scenario'},
                          {key: 'dataSource', label: 'Source'},
                          {key: 'actions', label: 'Actions'}
                        ].map(col => (
                          <th key={col.key} onClick={() => col.key !== 'actions' && handleSort(col.key)}
                              style={{cursor: col.key !== 'actions' ? 'pointer' : 'default'}}>
                            <div style={{display:'flex', alignItems:'center', gap:6, justifyContent: col.key==='projectName'?'flex-start':'center'}}>
                              {col.label}
                              {col.key !== 'actions' && sortConfig.key === col.key && (
                                <ArrowUpDown size={14} />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPortfolio.map((project) => {
                        const rowClass = project.irr >= 15 ? 'excellent' : project.irr >= 10 ? 'good' : 'poor';
                        return (
                          <tr key={project.id} className={`portfolio-row ${rowClass}`}>
                            <td><strong>{project.projectName}</strong></td>
                            <td style={{textAlign:'center'}}>{project.capacityMW}</td>
                            <td style={{textAlign:'center'}}>{project.capacityMWh}</td>
                            <td style={{textAlign:'center', fontWeight:700, color: project.irr >= 15 ? '#16a34a' : project.irr >= 10 ? '#f59e0b' : '#ef4444'}}>
                              {project.irr.toFixed(1)}%
                            </td>
                            <td style={{textAlign:'center'}}>£{project.npv.toFixed(1)}m</td>
                            <td style={{textAlign:'center'}}>{project.averageDSCR.toFixed(2)}x</td>
                            <td style={{textAlign:'center'}}>{project.minDSCR.toFixed(2)}x</td>
                            <td style={{textAlign:'center'}}>£{project.totalCapex.toFixed(0)}m</td>
                            <td style={{textAlign:'center'}}>
                              <span className="chip" style={{fontSize:10, padding:'4px 8px'}}>
                                {scenarios[project.scenario].name}
                              </span>
                            </td>
                            <td style={{textAlign:'center', fontSize:12}}>
                              {project.dataSource}
                            </td>
                            <td>
                              <div className="action-btns">
                                <button className="icon-btn" onClick={() => loadProject(project)} title="Load">
                                  <Edit size={16} />
                                </button>
                                <button className="icon-btn" onClick={() => removeProject(project.id)} title="Delete">
                                  <Trash2 size={16} color="#ef4444" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid" style={{marginTop:16}}>
                  <div className="panel chart">
                    <div style={{fontWeight:700, marginBottom:8}}>IRR Comparison</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={sortedPortfolio}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                        <Bar dataKey="irr" name="IRR %">
                          {sortedPortfolio.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.irr >= 15 ? '#16a34a' : entry.irr >= 10 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="panel chart">
                    <div style={{fontWeight:700, marginBottom:8}}>NPV vs CAPEX</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={sortedPortfolio}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalCapex" fill="#8b5cf6" name="CAPEX £m" />
                        <Line type="monotone" dataKey="npv" stroke="#2563eb" strokeWidth={3} name="NPV £m" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab==="inputs" && (
          <div className="grid" style={{marginTop:16}}>
            <div className="panel" style={{gridColumn:"span 6"}}>
              <div style={{fontWeight:700, marginBottom:12}}>Project</div>
              <label>Project Name</label>
              <input type="text" value={inputs.projectName} onChange={e=>update("projectName", e.target.value)} />
            </div>

            <div className="panel" style={{gridColumn:"span 6"}}>
              <div style={{fontWeight:700, marginBottom:12}}>Technical</div>
              {[
                ["capacityMW","Capacity (MW)",10],
                ["capacityMWh","Energy (MWh)",10],
                ["roundtripEfficiency","Efficiency (%)",1],
                ["degradationRate","Degradation (%/yr)",0.1],
              ].map(([k,l,step])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label>{l}</label>
                  <input type="number" step={step} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                </div>
              ))}
            </div>

            <div className="panel" style={{gridColumn:"span 6"}}>
              <div style={{fontWeight:700, marginBottom:12}}>Revenue</div>
              {[
                ["capacityMarketPrice","Capacity Market (£/MW/yr)",1000],
                ["arbitrageSpread","Arbitrage (£/MWh)",1],
                ["cyclesPerDay","Cycles/Day",0.1],
              ].map(([k,l,step])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label>{l}</label>
                  <input type="number" step={step} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                </div>
              ))}
            </div>

            <div className="panel" style={{gridColumn:"span 6"}}>
              <div style={{fontWeight:700, marginBottom:12}}>Finance</div>
              {[
                ["debtPercentage","Debt (%)",1],
                ["interestRate","Interest (%)",0.1],
                ["discountRate","Discount (%)",0.5],
              ].map(([k,l,step])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label>{l}</label>
                  <input type="number" step={step} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="cashflow" && (
          <div className="table-wrap" style={{marginTop:16}}>
            <table>
              <thead>
                <tr>
                  {["Year","Revenue","OPEX","EBITDA","FCF","DSCR"].map(h=>(
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financials.years.map((y,i)=>(
                  <tr key={i}>
                    <td><strong>{y.year}</strong></td>
                    <td>£{y.totalRevenue.toFixed(1)}m</td>
                    <td>£{y.totalOpex.toFixed(1)}m</td>
                    <td>£{y.ebitda.toFixed(1)}m</td>
                    <td>£{y.freeCashFlow.toFixed(1)}m</td>
                    <td>{y.dscr.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==="sensitivity" && (
          <div className="panel" style={{marginTop:16}}>
            <div style={{fontWeight:700, marginBottom:10}}>Sensitivity – IRR</div>
            <table style={{width:"100%", borderCollapse:"collapse"}}>
              <thead style={{background:"#f8fafc"}}>
                <tr>
                  {["Variable","-20%","-10%","Base","+10%","+20%"].map(h=>(
                    <th key={h} style={{textAlign: h==="Variable"?"left":"center", padding:12}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Capacity Market", delta: 3 },
                  { label: "Arbitrage", delta: 2.5 },
                  { label: "CAPEX", delta: -2 },
                ].map((r,i)=>(
                  <tr key={i} style={{background:i%2?"#ffffff":"#fafafa"}}>
                    <td style={{textAlign:"left", padding:12}}><strong>{r.label}</strong></td>
                    <td style={{textAlign:"center", color:"#ef4444", fontWeight:700}}>{(financials.irr - r.delta*2).toFixed(1)}%</td>
                    <td style={{textAlign:"center", color:"#f97316"}}>{(financials.irr - r.delta).toFixed(1)}%</td>
                    <td style={{textAlign:"center", background:"#eef2ff", color:"#1d4ed8", fontWeight:700}}>{financials.irr.toFixed(1)}%</td>
                    <td style={{textAlign:"center", color:"#16a34a"}}>{(financials.irr + r.delta).toFixed(1)}%</td>
                    <td style={{textAlign:"center", color:"#15803d", fontWeight:700}}>{(financials.irr + r.delta*2).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showOptimizer && (
        <div className="modal-backdrop" onClick={()=>setShowOptimizer(false)}>
          <div className="panel" style={{maxWidth:800, width:"100%", background:"white"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
              <div style={{fontWeight:800, fontSize:18}}>Debt Optimization</div>
              <button className="btn" onClick={()=>setShowOptimizer(false)}>Close</button>
            </div>
            {(() => {
              const { results, best } = optimizeDebt();
              return (
                <>
                  <div className="grid">
                    <div className="panel" style={{gridColumn:"span 6"}}>
                      <div className="k">
                        <div>
                          <div className="title">Optimal Debt</div>
                          <div className="val" style={{fontSize:34, fontWeight:800}}>{best.debt}%</div>
                          <div className="sub">Max IRR {isFinite(best.irr)?best.irr.toFixed(1):"–"}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="panel" style={{gridColumn:"span 6"}}>
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={results}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="debt" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="irr" fill="#2563eb" name="IRR (%)" />
                          <Line yAxisId="right" type="monotone" dataKey="minDSCR" stroke="#ef4444" strokeWidth={3} name="Min DSCR" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <button
                    className="btn primary"
                    style={{width:"100%"}}
                    onClick={()=>{
                      setInputs(p=>({...p, debtPercentage: best.debt}));
                      setShowOptimizer(false);
                      showToast(`Debt updated to ${best.debt}%`, "success");
                    }}
                  >
                    Apply Optimal Debt ({best.debt}%)
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showEmailGenerator && (
        <div className="modal-backdrop" onClick={()=>setShowEmailGenerator(false)}>
          <div className="panel" style={{maxWidth:700, width:"100%", background:"white", maxHeight:'80vh', overflow:'auto'}} 
               onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div>
                <div style={{fontWeight:800, fontSize:18}}>Email for Missing Inputs</div>
                <div style={{color:'#64748b', fontSize:14, marginTop:4}}>
                  Request additional information needed for financial modeling
                </div>
              </div>
              <button className="btn" onClick={()=>setShowEmailGenerator(false)}>Close</button>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontWeight:700, marginBottom:8, fontSize:14}}>Email Tone</div>
              <div style={{display:'flex', gap:10}}>
                <button 
                  className={`chip ${emailTone==='formal'?'active':''}`}
                  onClick={()=>setEmailTone('formal')}
                >
                  Formal
                </button>
                <button 
                  className={`chip ${emailTone==='casual'?'active':''}`}
                  onClick={()=>setEmailTone('casual')}
                >
                  Casual
                </button>
              </div>
            </div>

            <div style={{
              background:'#f8fafc', 
              border:'1px solid #e5e7eb', 
              borderRadius:10, 
              padding:20,
              fontFamily:'monospace',
              fontSize:13,
              lineHeight:1.8,
              whiteSpace:'pre-wrap',
              marginBottom:16,
              maxHeight:400,
              overflow:'auto'
            }}>
              {generateEmail()}
            </div>

            <div style={{display:'flex', gap:12}}>
              <button className="btn primary" onClick={copyEmailToClipboard} style={{flex:1}}>
                <Copy size={18} /> Copy to Clipboard
              </button>
              <button className="btn" onClick={()=>setShowEmailGenerator(false)} style={{flex:1}}>
                Cancel
              </button>
            </div>

            <div style={{marginTop:16, padding:12, background:'#eff6ff', borderRadius:8, fontSize:13}}>
              <strong>Tip:</strong> This email lists all inputs that weren't found in the uploaded document. 
              Customize the placeholders ([Recipient Name], [Your Name]) before sending.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BESSFinancialModel;