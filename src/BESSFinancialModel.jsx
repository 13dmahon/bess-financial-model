import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, ScatterChart, Scatter
} from "recharts";
import {
  Download, TrendingUp, Battery, Zap, PoundSterling,
  Calculator, FileText, Sliders, FileSpreadsheet, Check, AlertCircle,
  Copy, Mail, Trash2, Edit, Plus, X, Eye, ChevronDown, ChevronRight, Target, Percent, Clock, DollarSign
} from "lucide-react";

const numberOr = (v, d = 0) => (v === "" || v === null || isNaN(parseFloat(v)) ? d : parseFloat(v));

const presets = {
  conservative: {
    revenueEscalation: 1.5,
    energyTrading_k: 15,
    frequencyResponse_k: 2,
    capacityMarket_k: 30,
    ancillaryServices_k: 2,
    floorRevenue_k: 20,
    fixedOM_k: 18,
    variableOM_perMWh: 0.8,
    bessLTSA_k: 10,
    gridOM_k: 2.0,
    insurance_pctCapex: 0.6,
    businessRates_pctCapex: 0.9,
    assetMgmt_pctCapex: 1.0,
    landLease_k: 3.0,
    debtPercentage: 60,
    baseRate: 4.0,
    interestMargin: 5.0,
  },
  base: {
    revenueEscalation: 2.0,
    energyTrading_k: 40,
    frequencyResponse_k: 28,
    capacityMarket_k: 45,
    ancillaryServices_k: 22,
    floorRevenue_k: 0,
    fixedOM_k: 15,
    variableOM_perMWh: 0.5,
    bessLTSA_k: 7,
    gridOM_k: 1.6,
    insurance_pctCapex: 0.5,
    businessRates_pctCapex: 0.8,
    assetMgmt_pctCapex: 0.8,
    landLease_k: 2.0,
    debtPercentage: 65,
    baseRate: 4.5,
    interestMargin: 5.5,
  },
  optimistic: {
    revenueEscalation: 2.5,
    energyTrading_k: 50,
    frequencyResponse_k: 35,
    capacityMarket_k: 52,
    ancillaryServices_k: 28,
    floorRevenue_k: 30,
    fixedOM_k: 12,
    variableOM_perMWh: 0.4,
    bessLTSA_k: 5,
    gridOM_k: 1.3,
    insurance_pctCapex: 0.4,
    businessRates_pctCapex: 0.6,
    assetMgmt_pctCapex: 0.6,
    landLease_k: 1.5,
    debtPercentage: 70,
    baseRate: 4.0,
    interestMargin: 4.5,
  }
};

const BESSFinancialModel = () => {
  const [scenario, setScenario] = useState("base");
  const [tab, setTab] = useState("dashboard");
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [projectPortfolio, setProjectPortfolio] = useState([]);
  const [showInvestmentMemo, setShowInvestmentMemo] = useState(false);
  const [showIRRCalculation, setShowIRRCalculation] = useState(false);
  const [toast, setToast] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "irr", direction: "desc" });

  const [open, setOpen] = useState({
    project: true,
    technical: true,
    revenues: true,
    opex: true,
    capex: true,
    debt: true,
    refi: false,
    tax: true,
    returns: true,
  });

  const [inputs, setInputs] = useState({
    projectName: "Staythorpe",
    capacityMW: 360,
    durationHours: 2,
    fcDate: "2025-05-01",
    codDate: "2027-08-01",
    projectLifeYears: 40,
    roundtripEfficiency_pct: 85,
    degradationRate_pct: 2.0,
    availability_pct: 95,
    cyclesPerDay: 1.5,
    augmentationYear: 20,
    augmentationCost_pctOfBattery: 40,
    energyTrading_k: 15,
    frequencyResponse_k: 2,
    capacityMarket_k: 30,
    ancillaryServices_k: 2,
    floorRevenue_k: 0,
    contractLength_years: 12,
    revenueEscalation: 2.0,
    fixedOM_k: 15,
    variableOM_perMWh: 0.5,
    bessLTSA_k: 7,
    ltsaStartYear: 1,
    gridOM_k: 1.6,
    insurance_pctCapex: 0.5,
    businessRates_pctCapex: 0.8,
    assetMgmt_pctCapex: 0.8,
    landLease_k: 2.0,
    epc_k: 201,
    bessSupply_k: 196,
    bop_k: 50,
    gridContestable_k: 85,
    gridNonContestable_k: 45,
    development_k: 14,
    contingency_pct: 10,
    debtPercentage: 65,
    baseRate: 4.5,
    interestMargin: 5.5,
    debtTenor: 15,
    dscrCovenant: 1.40,
    refinancing: true,
    refiAfterCOD_years: 1,
    refiRate: 2.25,
    corpTaxRate: 25,
    capAllowancesPool: "Special",
    depreciationMethod: "Straight-line",
    vatTreatment: "Recoverable",
    targetEquityIRR: 12,
    minDSCR: 1.15,
    maxGearing_pct: 85,
    discountRate: 8,
  });

  const [activeSubtab, setActiveSubtab] = useState("project");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const applyPreset = (name) => {
    const p = presets[name];
    if (!p) return;
    setInputs((prev) => ({ ...prev, ...p }));
    setScenario(name === "conservative" ? "downside" : name === "optimistic" ? "upside" : "base");
    showToast(`${name[0].toUpperCase()}${name.slice(1)} preset applied`, "success");
  };

  const update = (k, v) => setInputs((p) => ({ ...p, [k]: typeof v === "string" && k.toLowerCase().includes("name") ? v : numberOr(v, "") }));

  const calc = (S = inputs) => {
    const MW = numberOr(S.capacityMW, 0);
    const MWh = MW * numberOr(S.durationHours, 0);

    const capexPerMW_k =
      numberOr(S.epc_k) + numberOr(S.bessSupply_k) + numberOr(S.bop_k) +
      numberOr(S.gridContestable_k) + numberOr(S.gridNonContestable_k) + numberOr(S.development_k);
    const baseCapex = capexPerMW_k * 1000 * MW;
    const totalCapex = baseCapex * (1 + numberOr(S.contingency_pct, 0) / 100);

    const y1RevPerMW_k = numberOr(S.energyTrading_k) + numberOr(S.frequencyResponse_k) + numberOr(S.capacityMarket_k) + numberOr(S.ancillaryServices_k);

    const fixedOM = numberOr(S.fixedOM_k) * 1000 * MW;
    const gridOM = numberOr(S.gridOM_k) * 1000 * MW;
    const ltsa = numberOr(S.bessLTSA_k) * 1000 * MW;
    const variableOM_perMWh = numberOr(S.variableOM_perMWh);

    const insurance = totalCapex * numberOr(S.insurance_pctCapex) / 100;
    const rates = totalCapex * numberOr(S.businessRates_pctCapex) / 100;
    const assetMgmt = totalCapex * numberOr(S.assetMgmt_pctCapex) / 100;
    const landLease = numberOr(S.landLease_k) * 1000 * MW;

    const debtPct = numberOr(S.debtPercentage) / 100;
    const debtAmount = totalCapex * debtPct;
    const equityAmount = totalCapex - debtAmount;

    const basePlusMargin = numberOr(S.baseRate) + numberOr(S.interestMargin);
    const refiYear = numberOr(S.refiAfterCOD_years, Infinity);

    const years = [];
    const opYears = numberOr(S.projectLifeYears, 25);

    const r0 = basePlusMargin / 100;
    const n0 = Math.max(1, Math.min(numberOr(S.debtTenor, 15), opYears));
    const annuity = debtAmount * (r0 * Math.pow(1 + r0, n0)) / (Math.pow(1 + r0, n0) - 1);

    let outstanding = debtAmount;

    for (let y = 1; y <= opYears; y++) {
      const degr = Math.pow(1 - numberOr(S.degradationRate_pct, 0) / 100, y);
      const effMW = MW * degr * (numberOr(S.availability_pct, 100) / 100);

      const escalator = Math.pow(1 + numberOr(S.revenueEscalation, 0) / 100, Math.min(y - 1, Math.max(0, numberOr(S.contractLength_years, 0) - 1)));
      const revPerMW_k = y <= numberOr(S.contractLength_years, 0)
        ? Math.max(numberOr(S.floorRevenue_k, 0), y1RevPerMW_k * escalator)
        : y1RevPerMW_k * Math.pow(1 + numberOr(S.revenueEscalation, 0) / 100, y - 1);
      const revenue = (revPerMW_k * 1000) * MW;

      const cycles = numberOr(S.cyclesPerDay, 0) * 365;
      const roundtrip = numberOr(S.roundtripEfficiency_pct, 100) / 100;
      const cycledMWh = Math.max(0, MWh * cycles * roundtrip * degr);
      const variableOM = cycledMWh * variableOM_perMWh;

      const ltsaCost = y >= numberOr(S.ltsaStartYear, 1) ? ltsa : 0;

      const opex = fixedOM + gridOM + ltsaCost + variableOM + insurance + rates + landLease + assetMgmt;

      const initialBatteryCost = numberOr(S.bessSupply_k) * 1000 * MW;
      const aug = y === numberOr(S.augmentationYear, -1)
        ? (initialBatteryCost * numberOr(S.augmentationCost_pctOfBattery, 0) / 100)
        : 0;

      const ebitda = revenue - opex;

      const rateThisYear = (S.refinancing && y > refiYear) ? numberOr(S.refiRate) / 100 : r0;
      const debtPay = y <= n0 ? annuity : 0;
      const interest = y <= n0 ? outstanding * rateThisYear : 0;
      const principal = y <= n0 ? Math.max(0, debtPay - interest) : 0;
      outstanding = Math.max(0, outstanding - principal);

      const ebt = ebitda - interest - aug;
      const tax = Math.max(0, ebt * numberOr(S.corpTaxRate, 0) / 100);
      const net = ebt - tax;
      const fcf = net + principal;

      const dscr = debtPay > 0 ? (ebitda / debtPay) : Infinity;

      years.push({
        year: (new Date(S.codDate || "2027-01-01").getFullYear()) + y,
        yearNum: y,
        effectiveCapacity: Number(effMW.toFixed(1)),
        totalRevenue: revenue / 1e6,
        totalOpex: opex / 1e6,
        ebitda: ebitda / 1e6,
        interest: interest / 1e6,
        principal: principal / 1e6,
        augmentation: aug / 1e6,
        debtService: debtPay / 1e6,
        ebt: ebt / 1e6,
        taxPayment: tax / 1e6,
        netIncome: net / 1e6,
        freeCashFlow: fcf / 1e6,
        cumulativeFCF: 0,
        dscr,
      });
    }

    years.forEach((y, i) => {
      y.cumulativeFCF = (i === 0 ? 0 : years[i - 1].cumulativeFCF) + y.freeCashFlow;
    });

    const npv = years.reduce((s, y) => s + y.freeCashFlow / Math.pow(1 + numberOr(inputs.discountRate, 8) / 100, y.yearNum), 0) - (equityAmount / 1e6);

    let irr = 0;
    for (let r = 0; r <= 50; r += 0.1) {
      const pv = years.reduce((s, y) => s + y.freeCashFlow / Math.pow(1 + r / 100, y.yearNum), 0) - (equityAmount / 1e6);
      if (pv <= 0) { irr = r; break; }
    }

    const avgDSCR = years.slice(0, Math.min(years.length, numberOr(S.debtTenor, 15)))
      .reduce((s, y) => s + (isFinite(y.dscr) ? y.dscr : 0), 0) /
      Math.min(years.length, numberOr(S.debtTenor, 15));
    const minDSCR = years.slice(0, Math.min(years.length, numberOr(S.debtTenor, 15)))
      .reduce((m, y) => Math.min(m, y.dscr), Infinity);

    let simplePayback = 0, discountedPayback = 0;
    let cum = -equityAmount / 1e6, cumDisc = -equityAmount / 1e6;
    for (let i = 0; i < years.length; i++) {
      cum += years[i].freeCashFlow;
      cumDisc += years[i].freeCashFlow / Math.pow(1 + numberOr(inputs.discountRate, 8) / 100, years[i].yearNum);
      if (cum >= 0 && simplePayback === 0) simplePayback = years[i].yearNum;
      if (cumDisc >= 0 && discountedPayback === 0) discountedPayback = years[i].yearNum;
    }
    const moic = (years.reduce((s, y) => s + y.freeCashFlow, 0)) / (equityAmount / 1e6);

    const evPerMW = (totalCapex / MW) / 1000;

    return {
      totalCapex: totalCapex / 1e6,
      debtAmount: debtAmount / 1e6,
      equityAmount: equityAmount / 1e6,
      annualDebtService: annuity / 1e6,
      years,
      npv,
      irr,
      averageDSCR: avgDSCR,
      minDSCR,
      totalCashFlows: years.reduce((s, y) => s + y.freeCashFlow, 0),
      simplePayback,
      discountedPayback,
      moic,
      evPerMW,
    };
  };

  const financials = useMemo(() => calc(), [inputs, scenario]);

  const validations = useMemo(() => {
    const warns = [];
    if (numberOr(inputs.roundtripEfficiency_pct) > 100 || numberOr(inputs.roundtripEfficiency_pct) < 50)
      warns.push({ field: "roundtripEfficiency_pct", msg: "Efficiency should be 50–100%" });
    if (numberOr(inputs.degradationRate_pct) < 0 || numberOr(inputs.degradationRate_pct) > 8)
      warns.push({ field: "degradationRate_pct", msg: "Degradation typically 0–8%/yr" });
    if (numberOr(inputs.dscrCovenant) < 1.0)
      warns.push({ field: "dscrCovenant", msg: "DSCR covenant rarely < 1.00x" });
    if (numberOr(inputs.debtPercentage) > numberOr(inputs.maxGearing_pct))
      warns.push({ field: "debtPercentage", msg: `Debt exceeds max gearing ${inputs.maxGearing_pct}%` });
    if (numberOr(inputs.capacityMW) <= 0)
      warns.push({ field: "capacityMW", msg: "Capacity must be > 0" });
    return warns;
  }, [inputs]);

  const handleInputsCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const next = { ...inputs };
    text.split(/\r?\n/).forEach((line) => {
      const [k, v] = line.split(",").map((s) => s?.trim());
      if (k && v && Object.prototype.hasOwnProperty.call(next, k)) {
        next[k] = isNaN(Number(v)) ? v : Number(v);
      }
    });
    setInputs(next);
    showToast("Inputs CSV imported", "success");
    e.target.value = "";
  };

  const addToPortfolio = () => {
    const newProject = {
      id: Date.now(),
      name: inputs.projectName,
      capacity: inputs.capacityMW,
      duration: inputs.durationHours,
      capex: financials.totalCapex,
      irr: financials.irr,
      npv: financials.npv,
      moic: financials.moic,
      avgDSCR: financials.averageDSCR,
      minDSCR: financials.minDSCR,
      payback: financials.simplePayback,
      inputs: { ...inputs },
    };
    setProjectPortfolio(prev => [...prev, newProject]);
    showToast(`${inputs.projectName} added to portfolio`, "success");
  };

  const deleteProject = (id) => {
    setProjectPortfolio(prev => prev.filter(p => p.id !== id));
    showToast("Project removed", "success");
  };

  const loadProject = (project) => {
    setInputs(project.inputs);
    setTab("dashboard");
    showToast(`Loaded ${project.name}`, "success");
  };

  const sortPortfolio = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedPortfolio = useMemo(() => {
    const sorted = [...projectPortfolio];
    sorted.sort((a, b) => {
      if (sortConfig.direction === "asc") {
        return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      } else {
        return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
      }
    });
    return sorted;
  }, [projectPortfolio, sortConfig]);

  // Sensitivity Analysis
  const sensitivityData = useMemo(() => {
    const revenueVariations = [-20, -10, 0, 10, 20];
    const opexVariations = [-20, -10, 0, 10, 20];
    const results = [];

    revenueVariations.forEach(revVar => {
      opexVariations.forEach(opexVar => {
        const testInputs = {
          ...inputs,
          energyTrading_k: inputs.energyTrading_k * (1 + revVar / 100),
          frequencyResponse_k: inputs.frequencyResponse_k * (1 + revVar / 100),
          capacityMarket_k: inputs.capacityMarket_k * (1 + revVar / 100),
          ancillaryServices_k: inputs.ancillaryServices_k * (1 + revVar / 100),
          fixedOM_k: inputs.fixedOM_k * (1 + opexVar / 100),
          variableOM_perMWh: inputs.variableOM_perMWh * (1 + opexVar / 100),
          bessLTSA_k: inputs.bessLTSA_k * (1 + opexVar / 100),
        };
        const testCalc = calc(testInputs);
        results.push({
          revenueVar: revVar,
          opexVar: opexVar,
          irr: testCalc.irr,
          npv: testCalc.npv,
        });
      });
    });
    return results;
  }, [inputs]);

  const styles = `
    * { box-sizing: border-box; }
    .shell{ max-width:1200px; margin:40px auto; padding:0 20px; }
    .topbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:16px; }
    .brand{ display:flex; gap:14px; align-items:center; }
    .brand h1{ font-size:28px; font-weight:800; margin:0; }
    .sub{ color:#64748b; font-size:14px; margin-top:4px; }
    .btn{ display:inline-flex; align-items:center; gap:8px; background:white; color:#0f172a;
      border:1px solid #e5e7eb; padding:10px 14px; border-radius:10px; font-weight:600;
      cursor:pointer; transition:.15s ease; font-size:14px; }
    .btn:hover{ box-shadow:0 2px 14px rgba(0,0,0,.1); }
    .btn.primary{ background:#2563eb; border-color:#2563eb; color:white; }
    .btn.secondary{ background:#8b5cf6; border-color:#8b5cf6; color:white; }
    .toolbar{ display:flex; gap:10px; flex-wrap:wrap; }
    .panel{ background:white; border:1px solid #e5e7eb; border-radius:16px; padding:16px 18px; }
    .chips{ display:flex; gap:10px; flex-wrap:wrap; }
    .chip{ background:#eef2ff; color:#1e40af; border:1px solid #dbeafe; padding:8px 12px;
      border-radius:999px; font-weight:600; cursor:pointer; font-size:14px; }
    .chip.active{ background:#2563eb; color:white; border-color:#2563eb; }
    .tabs{ display:flex; gap:6px; margin-top:14px; flex-wrap:wrap; }
    .tab{ background:transparent; border:none; padding:10px 14px; border-radius:10px;
      font-weight:700; color:#64748b; cursor:pointer; font-size:14px; }
    .tab.active{ background:#2563eb; color:white; }
    .grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:16px; margin-top:16px; }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
      .card, .chart { grid-column: span 1 !important; }
    }
    .card{ grid-column: span 3; padding:18px; border:1px solid #e5e7eb; background:white; border-radius:16px; }
    .k{ display:flex; align-items:flex-start; gap:12px; }
    .k .title{ font-size:12px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:.5px; }
    .k .val{ font-size:28px; font-weight:800; margin-top:4px; }
    .blue{ background:linear-gradient(180deg,#e0ecff,#ffffff); }
    .green{ background:linear-gradient(180deg,#defce7,#ffffff); }
    .purple{ background:linear-gradient(180deg,#efe9ff,#ffffff); }
    .orange{ background:linear-gradient(180deg,#fff1db,#ffffff); }
    .chart{ grid-column: span 6; }
    .table-wrap{ background:white; border:1px solid #e5e7eb; border-radius:16px; overflow:auto; }
    table{ width:100%; border-collapse:collapse; min-width:800px; }
    thead{ background:#f1f5f9; }
    th,td{ padding:12px 14px; text-align:right; font-size:14px; }
    th:first-child, td:first-child{ text-align:left; }
    tbody tr:nth-child(even){ background:#fafafa; }
    .badge{ display:inline-block; padding:4px 8px; border-radius:6px; font-size:11px;
      font-weight:700; text-transform:uppercase; }
    .badge.high{ background:#dcfce7; color:#166534; }
    .badge.medium{ background:#fef3c7; color:#92400e; }
    .toast{ position:fixed; bottom:20px; right:20px; background:white; border:1px solid #e5e7eb;
      border-radius:12px; padding:16px 20px; box-shadow:0 4px 20px rgba(0,0,0,.15); z-index:100;
      display:flex; align-items:center; gap:12px; max-width:400px; }
    .toast.success{ border-left:4px solid #16a34a; }
    .toast.error{ border-left:4px solid #ef4444; }
    .modal-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex;
      align-items:center; justify-content:center; padding:20px; z-index:50; overflow-y:auto; }
    .portfolio-row{ cursor:pointer; transition:.15s ease; }
    .portfolio-row:hover{ background:#f1f5f9 !important; }
    .portfolio-row.excellent{ border-left:4px solid #16a34a; }
    .portfolio-row.good{ border-left:4px solid #f59e0b; }
    .portfolio-row.poor{ border-left:4px solid #ef4444; }
    .action-btns{ display:flex; gap:8px; justify-content:flex-end; }
    .icon-btn{ background:transparent; border:none; cursor:pointer; padding:6px; border-radius:6px; transition:.15s ease; }
    .icon-btn:hover{ background:#f1f5f9; }
    input[type="text"], input[type="number"], input[type="date"], select { width:100%; padding:8px 12px; border:1px solid #e5e7eb;
      border-radius:8px; font-size:14px; margin-top:4px; }
    label { display:block; font-weight:600; font-size:14px; margin-bottom:4px; color:#334155; }
    .groupHdr{ display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:8px 0; }
    .memo-doc{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:900px; margin:0 auto; background:white; padding:40px; line-height:1.6; }
    .memo-header{ text-align:center; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:30px; }
    .memo-title{ font-size:32px; font-weight:800; color:#1e40af; margin:0; }
    .memo-subtitle{ font-size:16px; color:#64748b; margin-top:8px; }
    .memo-section{ margin-bottom:30px; }
    .memo-section h2{ font-size:20px; font-weight:700; color:#1e40af; border-bottom:2px solid #e5e7eb; padding-bottom:8px; margin-bottom:16px; }
    .memo-metrics{ display:grid; grid-template-columns:repeat(4, 1fr); gap:20px; margin:20px 0; }
    .memo-metric{ text-align:center; padding:16px; background:#f8fafc; border-radius:8px; }
    .memo-metric-label{ font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:0.5px; }
    .memo-metric-value{ font-size:24px; font-weight:800; color:#1e40af; margin-top:4px; }
    .memo-table{ width:100%; border-collapse:collapse; margin:16px 0; }
    .memo-table th{ background:#f1f5f9; padding:12px; text-align:left; font-weight:700; color:#334155; border-bottom:2px solid #e5e7eb; }
    .memo-table td{ padding:12px; border-bottom:1px solid #e5e7eb; }
    .memo-table tr:last-child td{ border-bottom:none; }
    .sensitivity-grid{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; margin-top:16px; }
    .sensitivity-cell{ padding:8px; text-align:center; font-size:12px; font-weight:600; border-radius:4px; }
    .sensitivity-header{ background:#f1f5f9; color:#334155; font-weight:700; }
  `;

  const revenueBreakdown = [
    { name: "Capacity Market", value: (inputs.capacityMarket_k || 0), color: "#2563eb" },
    { name: "Energy Trading", value: (inputs.energyTrading_k || 0), color: "#16a34a" },
    { name: "Frequency Response", value: (inputs.frequencyResponse_k || 0), color: "#8b5cf6" },
    { name: "Ancillary", value: (inputs.ancillaryServices_k || 0), color: "#f59e0b" },
  ];

  const generateInvestmentMemo = () => {
    const gearing = ((inputs.debtPercentage / 100) * 100).toFixed(0);
    const equity = (100 - gearing);
    
    return (
      <div className="memo-doc">
        <div className="memo-header">
          <div className="memo-title">{inputs.projectName} {inputs.capacityMW}MW BESS</div>
          <div className="memo-subtitle">Investment Memorandum - {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Case Scenario</div>
          <div className="sub" style={{marginTop:12}}>Date: {new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div className="memo-section">
          <h2>Executive Summary</h2>
          <div className="memo-metrics">
            <div className="memo-metric">
              <div className="memo-metric-label">Total Investment</div>
              <div className="memo-metric-value">£{financials.totalCapex.toFixed(0)}m</div>
            </div>
            <div className="memo-metric">
              <div className="memo-metric-label">Project IRR</div>
              <div className="memo-metric-value">{financials.irr.toFixed(1)}%</div>
            </div>
            <div className="memo-metric">
              <div className="memo-metric-label">NPV @ {inputs.discountRate}%</div>
              <div className="memo-metric-value">£{financials.npv.toFixed(1)}m</div>
            </div>
            <div className="memo-metric">
              <div className="memo-metric-label">Equity Multiple</div>
              <div className="memo-metric-value">{financials.moic.toFixed(2)}x</div>
            </div>
          </div>
        </div>

        <div className="memo-section">
          <h2>Project Overview</h2>
          <p>The {inputs.projectName} Battery Energy Storage System (BESS) is a utility-scale {inputs.capacityMW}MW / {(inputs.capacityMW * inputs.durationHours).toFixed(0)}MWh project providing critical grid services to the UK electricity market. The project delivers value through capacity market contracts, Dynamic Containment services, energy arbitrage, and ancillary services.</p>
          
          <p style={{marginTop:12}}><strong>Financial Close:</strong> {new Date(inputs.fcDate).toLocaleDateString('en-GB')}<br/>
          <strong>Commercial Operation Date:</strong> {new Date(inputs.codDate).toLocaleDateString('en-GB')}<br/>
          <strong>Project Life:</strong> {inputs.projectLifeYears} years</p>
        </div>

        <div className="memo-section">
          <h2>Key Investment Metrics</h2>
          <table className="memo-table">
            <tbody>
              <tr>
                <td><strong>Installed Capacity</strong></td>
                <td style={{textAlign:'right'}}>{inputs.capacityMW}MW / {(inputs.capacityMW * inputs.durationHours).toFixed(0)}MWh</td>
              </tr>
              <tr>
                <td><strong>EV/MW</strong></td>
                <td style={{textAlign:'right'}}>£{financials.evPerMW.toFixed(0)}k</td>
              </tr>
              <tr>
                <td><strong>Gearing</strong></td>
                <td style={{textAlign:'right'}}>{gearing}% Debt / {equity}% Equity</td>
              </tr>
              <tr>
                <td><strong>Average DSCR</strong></td>
                <td style={{textAlign:'right'}}>{financials.averageDSCR.toFixed(2)}x</td>
              </tr>
              <tr>
                <td><strong>Minimum DSCR</strong></td>
                <td style={{textAlign:'right'}}>{financials.minDSCR.toFixed(2)}x</td>
              </tr>
              <tr>
                <td><strong>Debt Tenor</strong></td>
                <td style={{textAlign:'right'}}>{inputs.debtTenor} years</td>
              </tr>
              <tr>
                <td><strong>Simple Payback</strong></td>
                <td style={{textAlign:'right'}}>{financials.simplePayback.toFixed(1)} years</td>
              </tr>
              <tr>
                <td><strong>Discounted Payback</strong></td>
                <td style={{textAlign:'right'}}>{financials.discountedPayback.toFixed(1)} years</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="memo-section">
          <h2>Revenue Profile (Year 1)</h2>
          <table className="memo-table">
            <thead>
              <tr>
                <th>Revenue Stream</th>
                <th style={{textAlign:'right'}}>£k/MW/yr</th>
                <th style={{textAlign:'right'}}>Total £m</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Capacity Market (T-4)</td>
                <td style={{textAlign:'right'}}>{inputs.capacityMarket_k.toFixed(1)}</td>
                <td style={{textAlign:'right'}}>{(inputs.capacityMarket_k * inputs.capacityMW / 1000).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Energy Trading (Arbitrage)</td>
                <td style={{textAlign:'right'}}>{inputs.energyTrading_k.toFixed(1)}</td>
                <td style={{textAlign:'right'}}>{(inputs.energyTrading_k * inputs.capacityMW / 1000).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Frequency Response (DC/DM/DR)</td>
                <td style={{textAlign:'right'}}>{inputs.frequencyResponse_k.toFixed(1)}</td>
                <td style={{textAlign:'right'}}>{(inputs.frequencyResponse_k * inputs.capacityMW / 1000).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Ancillary Services</td>
                <td style={{textAlign:'right'}}>{inputs.ancillaryServices_k.toFixed(1)}</td>
                <td style={{textAlign:'right'}}>{(inputs.ancillaryServices_k * inputs.capacityMW / 1000).toFixed(1)}</td>
              </tr>
              <tr style={{fontWeight:700, background:'#f8fafc'}}>
                <td>Total Annual Revenue</td>
                <td style={{textAlign:'right'}}>{(inputs.energyTrading_k + inputs.frequencyResponse_k + inputs.capacityMarket_k + inputs.ancillaryServices_k).toFixed(1)}</td>
                <td style={{textAlign:'right'}}>{financials.years[0]?.totalRevenue.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
          <p style={{marginTop:12, fontSize:13, color:'#64748b'}}>Revenue escalation: {inputs.revenueEscalation}% p.a. for first {inputs.contractLength_years} years</p>
        </div>

        <div className="memo-section">
          <h2>Financial Structure</h2>
          <table className="memo-table">
            <tbody>
              <tr>
                <td><strong>Total CAPEX</strong></td>
                <td style={{textAlign:'right'}}>£{financials.totalCapex.toFixed(1)}m</td>
              </tr>
              <tr>
                <td>Senior Debt ({gearing}%)</td>
                <td style={{textAlign:'right'}}>£{financials.debtAmount.toFixed(1)}m</td>
              </tr>
              <tr>
                <td>Equity ({equity}%)</td>
                <td style={{textAlign:'right'}}>£{financials.equityAmount.toFixed(1)}m</td>
              </tr>
              <tr style={{marginTop:16}}>
                <td><strong>Interest Rate</strong></td>
                <td style={{textAlign:'right'}}>{inputs.baseRate.toFixed(2)}% + {inputs.interestMargin.toFixed(2)}% = {(inputs.baseRate + inputs.interestMargin).toFixed(2)}%</td>
              </tr>
              <tr>
                <td><strong>Annual Debt Service</strong></td>
                <td style={{textAlign:'right'}}>£{financials.annualDebtService.toFixed(1)}m</td>
              </tr>
              {inputs.refinancing && (
                <tr>
                  <td>Refinancing (Year {inputs.refiAfterCOD_years})</td>
                  <td style={{textAlign:'right'}}>{inputs.refiRate.toFixed(2)}% p.a.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="memo-section">
          <h2>Risk Assessment</h2>
          <table className="memo-table">
            <tbody>
              <tr>
                <td><strong>DSCR Covenant</strong></td>
                <td style={{textAlign:'right'}}>{inputs.dscrCovenant.toFixed(2)}x</td>
              </tr>
              <tr>
                <td><strong>Actual Minimum DSCR</strong></td>
                <td style={{textAlign:'right', color: financials.minDSCR >= inputs.dscrCovenant ? '#16a34a' : '#dc2626', fontWeight:700}}>
                  {financials.minDSCR.toFixed(2)}x {financials.minDSCR >= inputs.dscrCovenant ? '✓' : '✗'}
                </td>
              </tr>
              <tr>
                <td><strong>Degradation</strong></td>
                <td style={{textAlign:'right'}}>{inputs.degradationRate_pct}% p.a.</td>
              </tr>
              <tr>
                <td><strong>Augmentation</strong></td>
                <td style={{textAlign:'right'}}>Year {inputs.augmentationYear} ({inputs.augmentationCost_pctOfBattery}% of battery cost)</td>
              </tr>
              <tr>
                <td><strong>Availability</strong></td>
                <td style={{textAlign:'right'}}>{inputs.availability_pct}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="memo-section">
          <h2>Returns Summary</h2>
          <div style={{background:'#f8fafc', padding:20, borderRadius:12, border:'2px solid #e5e7eb'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
              <div>
                <div style={{fontSize:13, color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>Equity IRR</div>
                <div style={{fontSize:36, fontWeight:800, color: financials.irr >= inputs.targetEquityIRR ? '#16a34a' : '#dc2626'}}>
                  {financials.irr.toFixed(1)}%
                </div>
                <div style={{fontSize:13, color:'#64748b', marginTop:4}}>Target: {inputs.targetEquityIRR}%</div>
              </div>
              <div>
                <div style={{fontSize:13, color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>MOIC</div>
                <div style={{fontSize:36, fontWeight:800, color:'#1e40af'}}>{financials.moic.toFixed(2)}x</div>
                <div style={{fontSize:13, color:'#64748b', marginTop:4}}>Over {inputs.projectLifeYears} years</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            <button className="btn" onClick={() => setShowInvestmentMemo(true)}><FileText size={18}/> Investment Memo</button>
            <button className="btn" onClick={() => setShowOptimizer(true)}><Sliders size={18}/> Optimize</button>
            <button className="btn" onClick={addToPortfolio}><Plus size={18}/> Add to Portfolio</button>
          </div>
        </div>

        <div className="panel">
          <div style={{fontWeight:700, marginBottom:10}}>Scenario Analysis</div>
          <div className="chips">
            {[
              {key:'downside', name:'Conservative', tag:'P10'},
              {key:'base', name:'Base', tag:'P50'},
              {key:'upside', name:'Optimistic', tag:'P90'},
            ].map(({key,name,tag}) => (
              <button key={key} className={`chip ${key===scenario? 'active':''}`} onClick={()=>setScenario(key)}>
                {name} ({tag})
              </button>
            ))}
            <span style={{marginLeft:8, display:'inline-flex', gap:8}}>
              <button className="chip" onClick={()=>applyPreset('conservative')}>Apply Conservative</button>
              <button className="chip" onClick={()=>applyPreset('base')}>Apply Base</button>
              <button className="chip" onClick={()=>applyPreset('optimistic')}>Apply Optimistic</button>
            </span>
          </div>

          <div className="tabs">
            {["dashboard","inputs","portfolio","cashflow","sensitivity"].map(t => (
              <button key={t} className={`tab ${t===tab?"active":""}`} onClick={()=>setTab(t)}>
                {t[0].toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === "dashboard" && (
          <>
            <div className="grid">
              <div className="card blue">
                <div className="k">
                  <PoundSterling size={24} />
                  <div>
                    <div className="title">Total CAPEX</div>
                    <div className="val">£{financials.totalCapex.toFixed(0)}m</div>
                    <div className="sub">{inputs.debtPercentage}% Debt • {100 - numberOr(inputs.debtPercentage,0)}% Equity</div>
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

              <div className="card blue">
                <div className="k">
                  <Target size={24} />
                  <div>
                    <div className="title">MOIC</div>
                    <div className="val">{financials.moic.toFixed(2)}x</div>
                    <div className="sub">Equity Multiple</div>
                  </div>
                </div>
              </div>

              <div className="card green">
                <div className="k">
                  <Clock size={24} />
                  <div>
                    <div className="title">Payback</div>
                    <div className="val">{financials.simplePayback.toFixed(1)}y</div>
                    <div className="sub">Disc. {financials.discountedPayback.toFixed(1)}y</div>
                  </div>
                </div>
              </div>

              <div className="card purple">
                <div className="k">
                  <DollarSign size={24} />
                  <div>
                    <div className="title">EV/MW</div>
                    <div className="val">£{financials.evPerMW.toFixed(0)}k</div>
                    <div className="sub">Per MW Installed</div>
                  </div>
                </div>
              </div>

              <div className="card orange">
                <div className="k">
                  <Percent size={24} />
                  <div>
                    <div className="title">Equity Req'd</div>
                    <div className="val">£{financials.equityAmount.toFixed(0)}m</div>
                    <div className="sub">{100 - inputs.debtPercentage}% of Capex</div>
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
                      label={(e)=>`£${e.value.toFixed(1)}k/MW`}> 
                      {revenueBreakdown.map((d,i)=><Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>`£${Number(v).toFixed(1)}k/MW`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>25-Year Cash Flow Profile</div>
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
                <div style={{fontWeight:700, marginBottom:8}}>Debt Service Coverage Ratio</div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={financials.years.slice(0, inputs.debtTenor)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 2]} />
                    <Tooltip formatter={(v)=>`${Number(v).toFixed(2)}x`} />
                    <Legend />
                    <Line type="monotone" dataKey="dscr" stroke="#16a34a" strokeWidth={2} name="DSCR" dot={{r:3}} />
                    <Line type="monotone" dataKey={() => inputs.dscrCovenant} stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" name="Min Covenant" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>Capacity Degradation & Augmentation</div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={financials.years}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}MW`} />
                    <Legend />
                    <Line type="monotone" dataKey="effectiveCapacity" stroke="#8b5cf6" strokeWidth={2} name="Effective Capacity" dot={{r:2}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === "inputs" && (
          <div className="grid" style={{marginTop:16}}>
            <div className="panel" style={{gridColumn:"span 4"}}>
              <div style={{fontWeight:800, marginBottom:8}}>Input Categories</div>
              {[
                {key:'project', label:'Project Setup'},
                {key:'technical', label:'Technical'},
                {key:'revenues', label:'Revenues'},
                {key:'opex', label:'OPEX'},
                {key:'capex', label:'CAPEX'},
                {key:'debt', label:'Financing'},
                {key:'tax', label:'Tax'},
                {key:'returns', label:'Returns Targets'},
              ].map(t => (
                <button key={t.key} className={`tab ${activeSubtab===t.key? 'active':''}`} style={{width:'100%', textAlign:'left'}} onClick={()=>setActiveSubtab(t.key)}>
                  {t.label}
                </button>
              ))}

              <div style={{marginTop:16}}>
                <div style={{fontWeight:700, marginBottom:8}}>Import Inputs (CSV)</div>
                <input type="file" accept=".csv" onChange={handleInputsCSV} />
                <div className="sub" style={{marginTop:6}}>Format: <code>key,value</code> per line</div>
              </div>

              {validations.length > 0 && (
                <div style={{marginTop:16, background:'#fff7ed', border:'1px solid #fdba74', borderRadius:8, padding:12}}>
                  <div style={{fontWeight:800, color:'#9a3412', marginBottom:6}}>Validation Warnings</div>
                  <ul style={{margin:0, paddingLeft:18}}>
                    {validations.map((v,i)=>(<li key={i} style={{color:'#9a3412', fontSize:13}}>{v.msg}</li>))}
                  </ul>
                </div>
              )}
            </div>

            <div className="panel" style={{gridColumn:"span 8"}}>

              {activeSubtab === 'project' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, project:!o.project}))}>
                    <div style={{fontWeight:800}}>Project Fundamentals</div>
                    {open.project ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.project && (
                    <div className="grid">
                      <div style={{gridColumn:'span 6'}}>
                        <label>Site name</label>
                        <input type="text" value={inputs.projectName} onChange={e=>update('projectName', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Capacity (MW)</label>
                        <input type="number" step={1} value={inputs.capacityMW} onChange={e=>update('capacityMW', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Duration (hours)</label>
                        <input type="number" step={0.1} value={inputs.durationHours} onChange={e=>update('durationHours', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Financial Close</label>
                        <input type="date" value={inputs.fcDate} onChange={e=>update('fcDate', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>COD</label>
                        <input type="date" value={inputs.codDate} onChange={e=>update('codDate', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Project life (years)</label>
                        <input type="number" step={1} value={inputs.projectLifeYears} onChange={e=>update('projectLifeYears', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'technical' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, technical:!o.technical}))}>
                    <div style={{fontWeight:800}}>Technical Parameters</div>
                    {open.technical ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.technical && (
                    <div className="grid">
                      {[['roundtripEfficiency_pct','Initial RTE (%)',0.1],['degradationRate_pct','Degradation (% p.a.)',0.1],['availability_pct','Availability (%)',0.1],['cyclesPerDay','Cycles per day',0.1]].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 3'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                        </div>
                      ))}
                      <div style={{gridColumn:'span 3'}}>
                        <label>Augmentation year</label>
                        <input type="number" step={1} value={inputs.augmentationYear} onChange={e=>update('augmentationYear', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Augmentation cost (% of battery)</label>
                        <input type="number" step={1} value={inputs.augmentationCost_pctOfBattery} onChange={e=>update('augmentationCost_pctOfBattery', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'revenues' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, revenues:!o.revenues}))}>
                    <div style={{fontWeight:800}}>Revenue Inputs (£k/MW/yr)</div>
                    {open.revenues ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.revenues && (
                    <div className="grid">
                      {[
                        ['energyTrading_k','Energy trading',1],
                        ['frequencyResponse_k','Frequency response',1],
                        ['capacityMarket_k','Capacity market (T-4)',1],
                        ['ancillaryServices_k','Ancillary services',1],
                        ['floorRevenue_k','Floor revenue (if contracted)',1],
                        ['contractLength_years','Contract length (years)',1],
                        ['revenueEscalation','Revenue escalation (% p.a.)',0.1]
                      ].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 4'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'opex' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, opex:!o.opex}))}>
                    <div style={{fontWeight:800}}>Operating Costs</div>
                    {open.opex ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.opex && (
                    <div className="grid">
                      {[
                        ['fixedOM_k','Fixed O&M (£k/MW/yr)',0.1],
                        ['variableOM_perMWh','Variable O&M (£/MWh)',0.1],
                        ['bessLTSA_k','BESS LTSA (£k/MW/yr)',0.1],
                        ['ltsaStartYear','LTSA start year',1],
                        ['gridOM_k','Grid O&M (£k/MW/yr)',0.1],
                        ['insurance_pctCapex','Insurance (% of capex)',0.1],
                        ['businessRates_pctCapex','Business rates (% of capex)',0.1],
                        ['assetMgmt_pctCapex','Asset management (% of capex)',0.1],
                        ['landLease_k','Land lease (£k/MW/yr)',0.1]
                      ].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 4'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'capex' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, capex:!o.capex}))}>
                    <div style={{fontWeight:800}}>Capital Costs (£k/MW)</div>
                    {open.capex ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.capex && (
                    <div className="grid">
                      {[['epc_k','EPC cost',1],['bessSupply_k','BESS supply cost',1],['bop_k','Balance of plant',1],['gridContestable_k','Grid (contestable)',1],['gridNonContestable_k','Grid (non-contestable)',1],['development_k','Development costs',1],['contingency_pct','Contingency (%)',0.1]].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 4'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'debt' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, debt:!o.debt}))}>
                    <div style={{fontWeight:800}}>Debt Structure</div>
                    {open.debt ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.debt && (
                    <div className="grid">
                      {[['debtPercentage','Senior debt (% of capex)',1],['interestMargin','Interest margin (% p.a.)',0.1],['baseRate','Base rate (% p.a.)',0.1],['debtTenor','Debt tenor (years)',1],['dscrCovenant','DSCR covenant (x)',0.01]].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 4'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k,e.target.value)} />
                        </div>
                      ))}
                      <div style={{gridColumn:'span 12', display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                        <input type="checkbox" checked={!!inputs.refinancing} onChange={(e)=>update('refinancing', e.target.checked)} />
                        <label style={{margin:0}}>Enable Refinancing</label>
                      </div>
                      {inputs.refinancing && (
                        <>
                          <div style={{gridColumn:'span 4'}}>
                            <label>Refi timing (years after COD)</label>
                            <input type="number" step={1} value={inputs.refiAfterCOD_years} onChange={e=>update('refiAfterCOD_years', e.target.value)} />
                          </div>
                          <div style={{gridColumn:'span 4'}}>
                            <label>Refi interest rate (% p.a.)</label>
                            <input type="number" step={0.1} value={inputs.refiRate} onChange={e=>update('refiRate', e.target.value)} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'tax' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, tax:!o.tax}))}>
                    <div style={{fontWeight:800}}>Tax & Accounting</div>
                    {open.tax ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.tax && (
                    <div className="grid">
                      <div style={{gridColumn:'span 3'}}>
                        <label>Corporation tax rate (%)</label>
                        <input type="number" step={0.1} value={inputs.corpTaxRate} onChange={e=>update('corpTaxRate', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Capital allowances pool</label>
                        <select value={inputs.capAllowancesPool} onChange={e=>update('capAllowancesPool', e.target.value)}>
                          <option>General</option>
                          <option>Special</option>
                          <option>SBA</option>
                        </select>
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>Depreciation method</label>
                        <select value={inputs.depreciationMethod} onChange={e=>update('depreciationMethod', e.target.value)}>
                          <option>Straight-line</option>
                          <option>Declining balance</option>
                        </select>
                      </div>
                      <div style={{gridColumn:'span 3'}}>
                        <label>VAT treatment</label>
                        <select value={inputs.vatTreatment} onChange={e=>update('vatTreatment', e.target.value)}>
                          <option>Recoverable</option>
                          <option>Partially recoverable</option>
                          <option>Non-recoverable</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubtab === 'returns' && (
                <div>
                  <div className="groupHdr" onClick={()=>setOpen(o=>({...o, returns:!o.returns}))}>
                    <div style={{fontWeight:800}}>Returns Targets</div>
                    {open.returns ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}    
                  </div>
                  {open.returns && (
                    <div className="grid">
                      {[['targetEquityIRR','Target equity IRR (%)',0.1],['minDSCR','Minimum DSCR (x)',0.01],['maxGearing_pct','Maximum gearing (%)',1],['discountRate','Discount rate (%)',0.1]].map(([k,l,s])=> (
                        <div key={k} style={{gridColumn:'span 3'}}>
                          <label>{l}</label>
                          <input type="number" step={s} value={inputs[k]} onChange={e=>update(k, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div style={{marginTop:16}}>
            <div className="panel" style={{marginBottom:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800, fontSize:18}}>Project Portfolio</div>
                  <div className="sub">{projectPortfolio.length} project{projectPortfolio.length !== 1 ? 's' : ''} in portfolio</div>
                </div>
                {projectPortfolio.length > 0 && (
                  <button className="btn" onClick={() => showToast('Portfolio export coming soon', 'success')}>
                    <Download size={18}/> Export Portfolio
                  </button>
                )}
              </div>
            </div>

            {projectPortfolio.length === 0 ? (
              <div className="panel" style={{textAlign:'center', padding:60}}>
                <Battery size={48} color="#cbd5e1" style={{margin:'0 auto 16px'}}/>
                <div style={{fontSize:18, fontWeight:700, color:'#64748b', marginBottom:8}}>No projects yet</div>
                <div style={{color:'#94a3b8', marginBottom:20}}>Add projects to your portfolio to compare returns and manage multiple investments</div>
                <button className="btn primary" onClick={() => setTab('dashboard')}>
                  <Plus size={18}/> Create First Project
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => sortPortfolio('name')} style={{cursor:'pointer'}}>Project</th>
                      <th onClick={() => sortPortfolio('capacity')} style={{cursor:'pointer'}}>Capacity</th>
                      <th onClick={() => sortPortfolio('capex')} style={{cursor:'pointer'}}>CAPEX</th>
                      <th onClick={() => sortPortfolio('irr')} style={{cursor:'pointer'}}>IRR</th>
                      <th onClick={() => sortPortfolio('npv')} style={{cursor:'pointer'}}>NPV</th>
                      <th onClick={() => sortPortfolio('moic')} style={{cursor:'pointer'}}>MOIC</th>
                      <th onClick={() => sortPortfolio('avgDSCR')} style={{cursor:'pointer'}}>Avg DSCR</th>
                      <th onClick={() => sortPortfolio('payback')} style={{cursor:'pointer'}}>Payback</th>
                      <th style={{textAlign:'center'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPortfolio.map((project) => {
                      const irrClass = project.irr >= 15 ? 'excellent' : project.irr >= 10 ? 'good' : 'poor';
                      return (
                        <tr key={project.id} className={`portfolio-row ${irrClass}`} onClick={() => loadProject(project)}>
                          <td><strong>{project.name}</strong></td>
                          <td>{project.capacity}MW / {(project.capacity * project.duration).toFixed(0)}MWh</td>
                          <td>£{project.capex.toFixed(0)}m</td>
                          <td style={{fontWeight:700, color: project.irr >= 15 ? '#16a34a' : project.irr >= 10 ? '#f59e0b' : '#dc2626'}}>
                            {project.irr.toFixed(1)}%
                          </td>
                          <td>£{project.npv.toFixed(1)}m</td>
                          <td>{project.moic.toFixed(2)}x</td>
                          <td>{project.avgDSCR.toFixed(2)}x</td>
                          <td>{project.payback.toFixed(1)}y</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="action-btns">
                              <button className="icon-btn" onClick={() => loadProject(project)} title="Load project">
                                <Eye size={16} />
                              </button>
                              <button className="icon-btn" onClick={() => deleteProject(project.id)} title="Delete project">
                                <Trash2 size={16} color="#dc2626" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "cashflow" && (
          <div className="table-wrap" style={{marginTop:16}}>
            <table>
              <thead>
                <tr>
                  {["Year","Revenue","OPEX","EBITDA","Interest","Principal","Augmentation","Tax","Net Income","FCF","Cumulative FCF","DSCR"].map(h=> (<th key={h}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {financials.years.map((y,i)=> (
                  <tr key={i} style={y.augmentation > 0 ? {background:'#fef3c7'} : {}}>
                    <td><strong>{y.year}</strong></td>
                    <td>£{y.totalRevenue.toFixed(1)}m</td>
                    <td>£{y.totalOpex.toFixed(1)}m</td>
                    <td>£{y.ebitda.toFixed(1)}m</td>
                    <td>£{y.interest.toFixed(1)}m</td>
                    <td>£{y.principal.toFixed(1)}m</td>
                    <td>{y.augmentation > 0 ? `£${y.augmentation.toFixed(1)}m` : '—'}</td>
                    <td>£{y.taxPayment.toFixed(1)}m</td>
                    <td>£{y.netIncome.toFixed(1)}m</td>
                    <td style={{fontWeight:700, color: y.freeCashFlow >= 0 ? '#16a34a' : '#dc2626'}}>£{y.freeCashFlow.toFixed(1)}m</td>
                    <td style={{fontWeight:700}}>£{y.cumulativeFCF.toFixed(1)}m</td>
                    <td style={{color: y.dscr >= inputs.dscrCovenant ? '#16a34a' : '#dc2626'}}>{isFinite(y.dscr)? y.dscr.toFixed(2): '—'}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sensitivity" && (
          <div style={{marginTop:16}}>
            <div className="panel" style={{marginBottom:16}}>
              <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Sensitivity Analysis</div>
              <div className="sub">IRR sensitivity to revenue and operating cost variations</div>
            </div>

            <div className="panel">
              <div style={{fontWeight:700, marginBottom:12}}>IRR Sensitivity Matrix (%)</div>
              <div className="sensitivity-grid">
                <div className="sensitivity-cell sensitivity-header">Revenue →<br/>OPEX ↓</div>
                {[-20, -10, 0, 10, 20].map(rev => (
                  <div key={rev} className="sensitivity-cell sensitivity-header">{rev > 0 ? '+' : ''}{rev}%</div>
                ))}
                
                {[20, 10, 0, -10, -20].map(opex => (
                  <React.Fragment key={opex}>
                    <div className="sensitivity-cell sensitivity-header">{opex > 0 ? '+' : ''}{opex}%</div>
                    {[-20, -10, 0, 10, 20].map(rev => {
                      const dataPoint = sensitivityData.find(d => d.revenueVar === rev && d.opexVar === opex);
                      const irr = dataPoint ? dataPoint.irr : 0;
                      const color = irr >= 15 ? '#dcfce7' : irr >= 10 ? '#fef3c7' : irr >= 5 ? '#fed7aa' : '#fecaca';
                      return (
                        <div key={`${rev}-${opex}`} className="sensitivity-cell" style={{background: color}}>
                          {irr.toFixed(1)}%
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div style={{marginTop:16, fontSize:13, color:'#64748b'}}>
                Base case IRR: {financials.irr.toFixed(1)}% (center cell)
              </div>
            </div>

            <div className="grid" style={{marginTop:16}}>
              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>IRR vs Revenue Variation</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sensitivityData.filter(d => d.opexVar === 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="revenueVar" label={{value: 'Revenue Variation (%)', position: 'insideBottom', offset: -5}} />
                    <YAxis label={{value: 'IRR (%)', angle: -90, position: 'insideLeft'}} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="irr" stroke="#2563eb" strokeWidth={3} name="IRR" dot={{r:5}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="panel chart">
                <div style={{fontWeight:700, marginBottom:8}}>IRR vs OPEX Variation</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sensitivityData.filter(d => d.revenueVar === 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="opexVar" label={{value: 'OPEX Variation (%)', position: 'insideBottom', offset: -5}} />
                    <YAxis label={{value: 'IRR (%)', angle: -90, position: 'insideLeft'}} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="irr" stroke="#16a34a" strokeWidth={3} name="IRR" dot={{r:5}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel" style={{marginTop:16}}>
              <div style={{fontWeight:700, marginBottom:12}}>Key Observations</div>
              <ul style={{marginLeft:20, color:'#334155', lineHeight:1.8}}>
                <li>A <strong>10% increase in revenue</strong> improves IRR to <strong>{sensitivityData.find(d => d.revenueVar === 10 && d.opexVar === 0)?.irr.toFixed(1)}%</strong></li>
                <li>A <strong>10% increase in OPEX</strong> reduces IRR to <strong>{sensitivityData.find(d => d.revenueVar === 0 && d.opexVar === 10)?.irr.toFixed(1)}%</strong></li>
                <li>Revenue sensitivity is <strong>{Math.abs((sensitivityData.find(d => d.revenueVar === 10 && d.opexVar === 0)?.irr || 0) - financials.irr).toFixed(1)} percentage points per 10% change</strong></li>
                <li>OPEX sensitivity is <strong>{Math.abs(financials.irr - (sensitivityData.find(d => d.revenueVar === 0 && d.opexVar === 10)?.irr || 0)).toFixed(1)} percentage points per 10% change</strong></li>
                <li>Project remains above {inputs.targetEquityIRR}% target IRR unless revenue drops below <strong>{[-20,-10,0,10,20].find(v => (sensitivityData.find(d => d.revenueVar === v && d.opexVar === 0)?.irr || 0) < inputs.targetEquityIRR) || 'never'}%</strong></li>
              </ul>
            </div>
          </div>
        )}

        {showOptimizer && (
          <div className="modal-backdrop" onClick={()=>setShowOptimizer(false)}>
            <div className="panel" style={{maxWidth:800, width:"100%", background:"white"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                <div style={{fontWeight:800, fontSize:18}}>Debt Optimization</div>
                <button className="btn" onClick={()=>setShowOptimizer(false)}><X size={18}/></button>
              </div>
              <div style={{padding:20, textAlign:'center'}}>
                <div style={{fontSize:14, color:'#64748b', marginBottom:8}}>Recommended Debt Level</div>
                <div style={{fontSize:42, fontWeight:800}}>{Math.min(inputs.debtPercentage, inputs.maxGearing_pct)}%</div>
                <div style={{color:'#64748b', marginTop:8}}>Current DSCR: {financials.averageDSCR.toFixed(2)}x • Covenant: {inputs.dscrCovenant}x</div>
                <div style={{color:'#64748b'}}>Max Gearing Limit: {inputs.maxGearing_pct}%</div>
              </div>
              <div style={{background:'#f8fafc', padding:16, borderRadius:8, marginBottom:16}}>
                <div style={{fontSize:13, color:'#334155'}}>
                  <strong>Analysis:</strong> Your project has a DSCR of {financials.averageDSCR.toFixed(2)}x, which is {financials.averageDSCR >= inputs.dscrCovenant ? 'above' : 'below'} the covenant requirement of {inputs.dscrCovenant}x. 
                  {financials.averageDSCR > inputs.dscrCovenant + 0.2 && ' You may have headroom to increase debt levels.'}
                  {financials.averageDSCR < inputs.dscrCovenant && ' Consider reducing debt to meet covenant requirements.'}
                </div>
              </div>
              <button className="btn primary" style={{width:"100%"}}
                onClick={()=>{setInputs(p=>({...p, debtPercentage: Math.min(p.debtPercentage, p.maxGearing_pct)})); setShowOptimizer(false); showToast('Debt structure updated', 'success');}}>
                Apply Recommendation
              </button>
            </div>
          </div>
        )}

        {showInvestmentMemo && (
          <div className="modal-backdrop" onClick={()=>setShowInvestmentMemo(false)}>
            <div className="panel" style={{maxWidth:1000, width:"100%", background:"white", maxHeight:'90vh', overflow:'auto'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, position:'sticky', top:0, background:'white', zIndex:10, paddingBottom:16, borderBottom:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:800, fontSize:20}}>Investment Memorandum</div>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn" onClick={() => showToast('PDF export coming soon', 'success')}>
                    <Download size={18}/> Export PDF
                  </button>
                  <button className="btn" onClick={()=>setShowInvestmentMemo(false)}><X size={18}/></button>
                </div>
              </div>
              {generateInvestmentMemo()}
            </div>
          </div>
        )}

        {showIRRCalculation && (
          <div className="modal-backdrop" onClick={()=>setShowIRRCalculation(false)}>
            <div className="panel" style={{maxWidth:900, width:"100%", background:"white", maxHeight:'85vh', overflow:'auto'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
                <div>
                  <div style={{fontWeight:800, fontSize:18}}>IRR Calculation Breakdown</div>
                  <div style={{color:'#64748b', fontSize:14, marginTop:4}}>How the {financials.irr.toFixed(2)}% IRR was calculated</div>
                </div>
                <button className="btn" onClick={()=>setShowIRRCalculation(false)}><X size={18}/></button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Cash Flow (£m)</th>
                      <th>Discount Factor</th>
                      <th>Present Value (£m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{background:'#fef3c7'}}>
                      <td><strong>0</strong></td>
                      <td style={{textAlign:'center', color:'#dc2626'}}>-£{financials.equityAmount.toFixed(2)}m</td>
                      <td style={{textAlign:'center'}}>1.0000</td>
                      <td style={{textAlign:'center', color:'#dc2626'}}>-£{financials.equityAmount.toFixed(2)}m</td>
                    </tr>
                    {financials.years.slice(0,15).map((y) => {
                      const df = 1 / Math.pow(1 + financials.irr / 100, y.yearNum);
                      const pv = y.freeCashFlow * df;
                      return (
                        <tr key={y.yearNum}>
                          <td><strong>{y.yearNum}</strong></td>
                          <td style={{textAlign:'center'}}>£{y.freeCashFlow.toFixed(2)}m</td>
                          <td style={{textAlign:'center'}}>{df.toFixed(4)}</td>
                          <td style={{textAlign:'center', color: pv > 0 ? '#16a34a' : '#dc2626'}}>£{pv.toFixed(2)}m</td>
                        </tr>
                      );
                    })}
                    <tr><td colSpan={4} style={{textAlign:'center', padding:8, color:'#64748b'}}>... {financials.years.length - 15} more years ...</td></tr>
                    <tr style={{background:'#dcfce7', fontWeight:700}}>
                      <td colSpan={3}><strong>Sum of Present Values (NPV @ IRR)</strong></td>
                      <td style={{textAlign:'center'}}>≈ £0.00m</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{marginTop:16, padding:16, background:'#f8fafc', borderRadius:8}}>
                <div style={{fontWeight:700, marginBottom:8}}>IRR Definition</div>
                <p style={{margin:0, fontSize:14, color:'#334155', lineHeight:1.6}}>
                  The Internal Rate of Return (IRR) is the discount rate at which the Net Present Value (NPV) of all cash flows equals zero. 
                  At {financials.irr.toFixed(2)}%, the present value of future equity cash flows exactly equals the initial equity investment of £{financials.equityAmount.toFixed(1)}m.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BESSFinancialModel;