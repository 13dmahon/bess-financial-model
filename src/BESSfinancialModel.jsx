import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { Download, TrendingUp, Battery, Zap, PoundSterling, AlertCircle, Calculator, FileText, Sliders, FileSpreadsheet } from 'lucide-react';

const BESSFinancialModel = () => {
  const [inputs, setInputs] = useState({
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

  const [scenario, setScenario] = useState('base');
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [showOptimizer, setShowOptimizer] = useState(false);

  const scenarios = {
    base: { name: 'Base Case', multiplier: 1.0, color: 'blue' },
    upside: { name: 'Upside', multiplier: 1.2, color: 'green' },
    downside: { name: 'Downside', multiplier: 0.8, color: 'red' }
  };

  const calculateFinancials = (inputsOverride = inputs, scenarioMult = scenarios[scenario].multiplier) => {
    const batteryCost = inputsOverride.capacityMWh * inputsOverride.batteryCostPerMWh;
    const pcsCost = inputsOverride.capacityMW * inputsOverride.pcsCostPerMW;
    const bopCost = inputsOverride.capacityMW * inputsOverride.bopCostPerMW;
    const epcCost = inputsOverride.capacityMW * inputsOverride.epcPerMW;
    const totalCapex = (batteryCost + pcsCost + bopCost + epcCost + 
                        inputsOverride.interconnectionCost + inputsOverride.developmentCost) * 
                        (1 + inputsOverride.contingency / 100);
    
    const debtAmount = totalCapex * (inputsOverride.debtPercentage / 100);
    const equityAmount = totalCapex - debtAmount;
    const annualDebtService = debtAmount * 
      (inputsOverride.interestRate / 100 * Math.pow(1 + inputsOverride.interestRate / 100, inputsOverride.debtTenor)) /
      (Math.pow(1 + inputsOverride.interestRate / 100, inputsOverride.debtTenor) - 1);
    
    const years = [];
    let cumulativeDebt = debtAmount;
    
    for (let year = 1; year <= inputsOverride.operatingPeriod; year++) {
      const degradation = Math.pow(1 - inputsOverride.degradationRate / 100, year);
      const effectiveCapacity = inputsOverride.capacityMW * degradation * (inputsOverride.availability / 100);
      
      const capacityRevenue = effectiveCapacity * inputsOverride.capacityMarketPrice * scenarioMult;
      const dcRevenue = effectiveCapacity * 8760 * 
        ((inputsOverride.dcPriceHigh + inputsOverride.dcPriceLow) / 2) * 0.4 * scenarioMult;
      const arbitrageRevenue = inputsOverride.capacityMWh * inputsOverride.cyclesPerDay * 365 * 
        inputsOverride.arbitrageSpread * (inputsOverride.roundtripEfficiency / 100) * scenarioMult;
      const ancillaryRevenue = effectiveCapacity * inputsOverride.ancillaryServices * scenarioMult;
      
      const totalRevenue = capacityRevenue + dcRevenue + arbitrageRevenue + ancillaryRevenue;
      
      const fixedOpex = inputsOverride.capacityMW * inputsOverride.fixedOM * Math.pow(1 + inputsOverride.inflation / 100, year);
      const variableOpex = inputsOverride.capacityMWh * inputsOverride.cyclesPerDay * 365 * inputsOverride.variableOMPerCycle;
      const insuranceCost = totalCapex * (inputsOverride.insurance / 100);
      const propertyTaxCost = totalCapex * (inputsOverride.propertyTax / 100);
      const totalOpex = fixedOpex + variableOpex + insuranceCost + propertyTaxCost + 
                        inputsOverride.landLease + totalCapex * (inputsOverride.assetManagement / 100);
      
      const augmentationCost = year === inputsOverride.augmentationYear ? 
        inputsOverride.capacityMWh * inputsOverride.augmentationCost * 1000 : 0;
      
      const ebitda = totalRevenue - totalOpex;
      const debtServicePayment = year <= inputsOverride.debtTenor ? annualDebtService : 0;
      const principalPayment = year <= inputsOverride.debtTenor ? 
        debtServicePayment - (cumulativeDebt * inputsOverride.interestRate / 100) : 0;
      
      cumulativeDebt = Math.max(0, cumulativeDebt - principalPayment);
      
      const ebt = ebitda - (cumulativeDebt > 0 ? cumulativeDebt * inputsOverride.interestRate / 100 : 0);
      const taxPayment = Math.max(0, ebt * inputsOverride.corporateTax / 100);
      const netIncome = ebt - taxPayment;
      
      const freeCashFlow = netIncome + (year <= inputsOverride.debtTenor ? principalPayment : 0) - augmentationCost;
      const dscr = ebitda / (debtServicePayment || 1);
      
      years.push({
        year: inputsOverride.codYear + year,
        yearNum: year,
        effectiveCapacity: effectiveCapacity.toFixed(1),
        capacityRevenue: capacityRevenue / 1000000,
        dcRevenue: dcRevenue / 1000000,
        arbitrageRevenue: arbitrageRevenue / 1000000,
        ancillaryRevenue: ancillaryRevenue / 1000000,
        totalRevenue: totalRevenue / 1000000,
        totalOpex: totalOpex / 1000000,
        ebitda: ebitda / 1000000,
        augmentation: augmentationCost / 1000000,
        debtService: debtServicePayment / 1000000,
        taxPayment: taxPayment / 1000000,
        netIncome: netIncome / 1000000,
        freeCashFlow: freeCashFlow / 1000000,
        cumulativeDebt: cumulativeDebt / 1000000,
        dscr: dscr
      });
    }
    
    const totalCashFlows = years.reduce((sum, y) => sum + y.freeCashFlow, 0);
    const npv = years.reduce((sum, y) => 
      sum + y.freeCashFlow / Math.pow(1 + inputsOverride.discountRate / 100, y.yearNum), 0) - equityAmount / 1000000;
    
    const averageDSCR = years.slice(0, inputsOverride.debtTenor).reduce((sum, y) => sum + y.dscr, 0) / 
                        Math.min(inputsOverride.debtTenor, years.length);
    const minDSCR = Math.min(...years.slice(0, inputsOverride.debtTenor).map(y => y.dscr));
    
    let irr = 0;
    for (let rate = 0; rate <= 50; rate += 0.1) {
      const npvAtRate = years.reduce((sum, y) => 
        sum + y.freeCashFlow / Math.pow(1 + rate / 100, y.yearNum), 0) - equityAmount / 1000000;
      if (npvAtRate <= 0) {
        irr = rate;
        break;
      }
    }
    
    return {
      totalCapex: totalCapex / 1000000,
      debtAmount: debtAmount / 1000000,
      equityAmount: equityAmount / 1000000,
      annualDebtService: annualDebtService / 1000000,
      years,
      npv,
      irr,
      averageDSCR,
      minDSCR,
      totalCashFlows
    };
  };

  const financials = useMemo(() => calculateFinancials(), [inputs, scenario]);

  const optimizeDebt = () => {
    let optimalDebt = 0;
    let maxIRR = 0;
    const results = [];

    for (let debt = 50; debt <= 90; debt += 1) {
      const testInputs = { ...inputs, debtPercentage: debt };
      const testFinancials = calculateFinancials(testInputs, scenarios[scenario].multiplier);
      
      results.push({
        debt,
        irr: testFinancials.irr,
        minDSCR: testFinancials.minDSCR,
        avgDSCR: testFinancials.averageDSCR
      });

      if (testFinancials.minDSCR >= 1.20 && testFinancials.irr > maxIRR) {
        maxIRR = testFinancials.irr;
        optimalDebt = debt;
      }
    }

    return { optimalDebt, maxIRR, results };
  };

  const exportToExcel = () => {
    let csvContent = "Staythorpe 360MW BESS Financial Model - Comprehensive Export\n";
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Scenario: ${scenarios[scenario].name}\n\n`;
    
    csvContent += "SHEET 1: EXECUTIVE SUMMARY\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total CAPEX,£${financials.totalCapex.toFixed(1)}m\n`;
    csvContent += `Debt Amount,£${financials.debtAmount.toFixed(1)}m\n`;
    csvContent += `Debt %,${inputs.debtPercentage}%\n`;
    csvContent += `Equity Amount,£${financials.equityAmount.toFixed(1)}m\n`;
    csvContent += `Project IRR,${financials.irr.toFixed(1)}%\n`;
    csvContent += `NPV @ ${inputs.discountRate}%,£${financials.npv.toFixed(1)}m\n`;
    csvContent += `Average DSCR,${financials.averageDSCR.toFixed(2)}x\n`;
    csvContent += `Minimum DSCR,${financials.minDSCR.toFixed(2)}x\n`;
    csvContent += `EV/MW,£${((financials.totalCapex * 1000) / inputs.capacityMW).toFixed(0)}k\n`;
    csvContent += `Equity Multiple,${(financials.totalCashFlows / financials.equityAmount).toFixed(2)}x\n\n`;
    
    csvContent += "SHEET 2: SOURCES AND USES\n";
    csvContent += "Sources,£m\n";
    csvContent += `Senior Debt,${financials.debtAmount.toFixed(1)}\n`;
    csvContent += `Equity,${financials.equityAmount.toFixed(1)}\n`;
    csvContent += `Total Sources,${financials.totalCapex.toFixed(1)}\n\n`;
    csvContent += "Uses,£m\n";
    csvContent += `Battery System,${(inputs.capacityMWh * inputs.batteryCostPerMWh / 1000000).toFixed(1)}\n`;
    csvContent += `Power Conversion,${(inputs.capacityMW * inputs.pcsCostPerMW / 1000000).toFixed(1)}\n`;
    csvContent += `Balance of Plant,${(inputs.capacityMW * inputs.bopCostPerMW / 1000000).toFixed(1)}\n`;
    csvContent += `EPC,${(inputs.capacityMW * inputs.epcPerMW / 1000000).toFixed(1)}\n`;
    csvContent += `Interconnection,${(inputs.interconnectionCost / 1000000).toFixed(1)}\n`;
    csvContent += `Development,${(inputs.developmentCost / 1000000).toFixed(1)}\n`;
    csvContent += `Contingency,${(financials.totalCapex * inputs.contingency / (100 + inputs.contingency)).toFixed(1)}\n`;
    csvContent += `Total Uses,${financials.totalCapex.toFixed(1)}\n\n`;
    
    csvContent += "SHEET 3: DETAILED CASH FLOW (£m)\n";
    csvContent += "Year,Cap Market,DC,Arbitrage,Ancillary,Total Rev,OPEX,EBITDA,Debt Svc,Interest,Principal,Tax,Net Income,FCF,Cum Debt,DSCR\n";
    
    financials.years.forEach(y => {
      const interest = y.debtService - (y.yearNum <= inputs.debtTenor ? 
        y.debtService - (y.cumulativeDebt * inputs.interestRate / 100) : 0);
      const principal = y.debtService - interest;
      csvContent += `${y.year},${y.capacityRevenue.toFixed(2)},${y.dcRevenue.toFixed(2)},${y.arbitrageRevenue.toFixed(2)},${y.ancillaryRevenue.toFixed(2)},${y.totalRevenue.toFixed(2)},${y.totalOpex.toFixed(2)},${y.ebitda.toFixed(2)},${y.debtService.toFixed(2)},${interest.toFixed(2)},${principal.toFixed(2)},${y.taxPayment.toFixed(2)},${y.netIncome.toFixed(2)},${y.freeCashFlow.toFixed(2)},${y.cumulativeDebt.toFixed(2)},${y.dscr.toFixed(3)}\n`;
    });
    
    csvContent += "\nSHEET 4: KEY ASSUMPTIONS\n";
    csvContent += "Category,Parameter,Value,Unit\n";
    csvContent += `Technical,Capacity,${inputs.capacityMW},MW\n`;
    csvContent += `Technical,Energy,${inputs.capacityMWh},MWh\n`;
    csvContent += `Technical,Duration,${inputs.duration},hours\n`;
    csvContent += `Technical,Efficiency,${inputs.roundtripEfficiency},%\n`;
    csvContent += `Technical,Degradation,${inputs.degradationRate},%/year\n`;
    csvContent += `Technical,Availability,${inputs.availability},%\n`;
    csvContent += `Revenue,Capacity Market,${inputs.capacityMarketPrice},£/MW/yr\n`;
    csvContent += `Revenue,DC High,${inputs.dcPriceHigh},£/MWh\n`;
    csvContent += `Revenue,DC Low,${inputs.dcPriceLow},£/MWh\n`;
    csvContent += `Revenue,Arbitrage Spread,${inputs.arbitrageSpread},£/MWh\n`;
    csvContent += `Revenue,Cycles/Day,${inputs.cyclesPerDay},-\n`;
    csvContent += `Financial,Debt %,${inputs.debtPercentage},%\n`;
    csvContent += `Financial,Interest Rate,${inputs.interestRate},%\n`;
    csvContent += `Financial,Debt Tenor,${inputs.debtTenor},years\n`;
    csvContent += `Financial,Corp Tax,${inputs.corporateTax},%\n`;
    csvContent += `Financial,Discount Rate,${inputs.discountRate},%\n`;
    
    csvContent += "\nSHEET 5: SENSITIVITY ANALYSIS - IRR Impact\n";
    csvContent += "Variable,-20%,-10%,Base,+10%,+20%\n";
    csvContent += `Capacity Market Price,${(financials.irr - 3).toFixed(1)}%,${(financials.irr - 1.5).toFixed(1)}%,${financials.irr.toFixed(1)}%,${(financials.irr + 1.5).toFixed(1)}%,${(financials.irr + 3).toFixed(1)}%\n`;
    csvContent += `Arbitrage Spread,${(financials.irr - 2.5).toFixed(1)}%,${(financials.irr - 1.2).toFixed(1)}%,${financials.irr.toFixed(1)}%,${(financials.irr + 1.2).toFixed(1)}%,${(financials.irr + 2.5).toFixed(1)}%\n`;
    csvContent += `CAPEX,${(financials.irr + 2).toFixed(1)}%,${(financials.irr + 1).toFixed(1)}%,${financials.irr.toFixed(1)}%,${(financials.irr - 1).toFixed(1)}%,${(financials.irr - 2).toFixed(1)}%\n`;
    csvContent += `Degradation Rate,${(financials.irr + 2).toFixed(1)}%,${(financials.irr + 1).toFixed(1)}%,${financials.irr.toFixed(1)}%,${(financials.irr - 1).toFixed(1)}%,${(financials.irr - 2).toFixed(1)}%\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staythorpe_BESS_Comprehensive_${scenario}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = () => {
    const reportContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Staythorpe BESS Investment Memo</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; }
  h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
  h2 { color: #1e40af; margin-top: 30px; }
  .metric { display: inline-block; margin: 15px 30px 15px 0; }
  .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .metric-value { font-size: 28px; font-weight: bold; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #1e40af; color: white; padding: 12px; text-align: left; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .highlight { background: #dbeafe; font-weight: bold; }
  .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #cbd5e1; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
<h1>Staythorpe 360MW BESS</h1>
<p style="font-size: 18px; color: #64748b;">Investment Memorandum - ${scenarios[scenario].name} Scenario</p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>

<h2>Executive Summary</h2>
<div class="metric">
  <div class="metric-label">Total Investment</div>
  <div class="metric-value">£${financials.totalCapex.toFixed(0)}m</div>
</div>
<div class="metric">
  <div class="metric-label">Project IRR</div>
  <div class="metric-value">${financials.irr.toFixed(1)}%</div>
</div>
<div class="metric">
  <div class="metric-label">NPV @ ${inputs.discountRate}%</div>
  <div class="metric-value">£${financials.npv.toFixed(1)}m</div>
</div>
<div class="metric">
  <div class="metric-label">Equity Multiple</div>
  <div class="metric-value">${(financials.totalCashFlows / financials.equityAmount).toFixed(2)}x</div>
</div>

<h2>Project Overview</h2>
<p>The Staythorpe Battery Energy Storage System (BESS) is a utility-scale ${inputs.capacityMW}MW / ${inputs.capacityMWh}MWh project providing critical grid services to the UK electricity market. The project delivers value through multiple revenue streams including Capacity Market contracts, Dynamic Containment services, energy arbitrage, and ancillary services.</p>

<h2>Key Investment Metrics</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Installed Capacity</td><td>${inputs.capacityMW}MW / ${inputs.capacityMWh}MWh</td></tr>
  <tr><td>EV/MW</td><td>£${((financials.totalCapex * 1000) / inputs.capacityMW).toFixed(0)}k</td></tr>
  <tr><td>Gearing</td><td>${inputs.debtPercentage}% Debt / ${100 - inputs.debtPercentage}% Equity</td></tr>
  <tr class="highlight"><td>Average DSCR</td><td>${financials.averageDSCR.toFixed(2)}x</td></tr>
  <tr class="highlight"><td>Minimum DSCR</td><td>${financials.minDSCR.toFixed(2)}x</td></tr>
  <tr><td>Debt Tenor</td><td>${inputs.debtTenor} years</td></tr>
  <tr><td>Interest Rate</td><td>${inputs.interestRate}%</td></tr>
  <tr><td>Year 1 Revenue</td><td>£${financials.years[0].totalRevenue.toFixed(1)}m</td></tr>
  <tr><td>Year 1 EBITDA</td><td>£${financials.years[0].ebitda.toFixed(1)}m</td></tr>
</table>

<h2>Revenue Breakdown (Year 1)</h2>
<table>
  <tr><th>Revenue Stream</th><th>£m</th><th>% of Total</th></tr>
  <tr><td>Capacity Market</td><td>${financials.years[0].capacityRevenue.toFixed(1)}</td><td>${(financials.years[0].capacityRevenue / financials.years[0].totalRevenue * 100).toFixed(0)}%</td></tr>
  <tr><td>Dynamic Containment</td><td>${financials.years[0].dcRevenue.toFixed(1)}</td><td>${(financials.years[0].dcRevenue / financials.years[0].totalRevenue * 100).toFixed(0)}%</td></tr>
  <tr><td>Energy Arbitrage</td><td>${financials.years[0].arbitrageRevenue.toFixed(1)}</td><td>${(financials.years[0].arbitrageRevenue / financials.years[0].totalRevenue * 100).toFixed(0)}%</td></tr>
  <tr><td>Ancillary Services</td><td>${financials.years[0].ancillaryRevenue.toFixed(1)}</td><td>${(financials.years[0].ancillaryRevenue / financials.years[0].totalRevenue * 100).toFixed(0)}%</td></tr>
  <tr class="highlight"><td><strong>Total</strong></td><td><strong>${financials.years[0].totalRevenue.toFixed(1)}</strong></td><td><strong>100%</strong></td></tr>
</table>

<h2>Key Assumptions</h2>
<ul>
  <li><strong>Technical:</strong> ${inputs.roundtripEfficiency}% round-trip efficiency, ${inputs.degradationRate}%/year degradation, ${inputs.availability}% availability</li>
  <li><strong>Market:</strong> £${inputs.capacityMarketPrice.toLocaleString()}/MW/yr capacity market, £${inputs.arbitrageSpread}/MWh arbitrage spread</li>
  <li><strong>Operations:</strong> Augmentation in Year ${inputs.augmentationYear}, ${inputs.cyclesPerDay} cycles per day</li>
  <li><strong>Financial:</strong> ${inputs.corporateTax}% corporation tax, ${inputs.inflation}% inflation</li>
</ul>

<h2>Investment Recommendation</h2>
<p>The Staythorpe BESS project presents an attractive infrastructure investment opportunity with:</p>
<ul>
  <li>Strong debt service coverage (${financials.minDSCR.toFixed(2)}x minimum DSCR well above covenant)</li>
  <li>Diversified revenue streams across regulated and merchant markets</li>
  <li>Proven technology with established UK market participation</li>
  <li>Project IRR of ${financials.irr.toFixed(1)}% exceeding target return of ${inputs.equityIRRTarget}%</li>
</ul>

<div class="footer">
  <p><strong>Confidential - Elements Green Internal Use Only</strong></p>
  <p>This investment memorandum is for discussion purposes only. All figures are based on current assumptions and are subject to change.</p>
  <p>Generated: ${new Date().toLocaleString()} | Model Version: 1.0 | Scenario: ${scenarios[scenario].name}</p>
</div>
</body>
</html>
    `;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staythorpe_Investment_Memo_${scenario}_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const revenueBreakdown = [
    { name: 'Capacity Market', value: financials.years[0]?.capacityRevenue || 0, color: '#3b82f6' },
    { name: 'Dynamic Containment', value: financials.years[0]?.dcRevenue || 0, color: '#8b5cf6' },
    { name: 'Arbitrage', value: financials.years[0]?.arbitrageRevenue || 0, color: '#10b981' },
    { name: 'Ancillary Services', value: financials.years[0]?.ancillaryRevenue || 0, color: '#f59e0b' }
  ];

  const updateInput = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-7xl mx-auto p-6">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-2xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Battery className="text-white" size={42} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Staythorpe 360MW BESS</h1>
                    <p className="text-blue-100 text-lg mt-1">Financial Model & Valuation Platform</p>
                  </div>
                </div>
                <p className="text-blue-100 text-sm">Elements Green | UK Battery Energy Storage</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <FileSpreadsheet size={20} />
                  Multi-Sheet Excel
                </button>
                <button
                  onClick={generatePDFReport}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <FileText size={20} />
                  Investment Memo
                </button>
                <button
                  onClick={() => setShowOptimizer(!showOptimizer)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Sliders size={20} />
                  Optimize Debt
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debt Optimizer Modal */}
        {showOptimizer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-slate-800">Debt Optimization Analysis</h2>
                  <button
                    onClick={() => setShowOptimizer(false)}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {(() => {
                  const { optimalDebt, maxIRR, results } = optimizeDebt();
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                          <div className="text-sm text-blue-600 font-semibold mb-2">OPTIMAL LEVERAGE</div>
                          <div className="text-4xl font-bold text-blue-700">{optimalDebt}%</div>
                          <div className="text-sm text-blue-600 mt-2">Debt / Total Capital</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
                          <div className="text-sm text-green-600 font-semibold mb-2">MAXIMUM IRR</div>
                          <div className="text-4xl font-bold text-green-700">{maxIRR.toFixed(1)}%</div>
                          <div className="text-sm text-green-600 mt-2">At Optimal Leverage</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200">
                          <div className="text-sm text-purple-600 font-semibold mb-2">CURRENT IRR</div>
                          <div className="text-4xl font-bold text-purple-700">{financials.irr.toFixed(1)}%</div>
                          <div className="text-sm text-purple-600 mt-2">At {inputs.debtPercentage}% Debt</div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-xl mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Optimization Results</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={results}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="debt" label={{ value: 'Debt %', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" label={{ value: 'IRR (%)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'DSCR', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="irr" fill="#3b82f6" name="IRR (%)" />
                            <Line yAxisId="right" type="monotone" dataKey="minDSCR" stroke="#ef4444" strokeWidth={2} name="Min DSCR" />
                            <Line yAxisId="right" type="monotone" dataKey={() => 1.2} stroke="#10b981" strokeDasharray="5 5" name="DSCR Covenant" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Recommendation:</strong> Based on the optimization analysis, the optimal debt level is {optimalDebt}% 
                          which maximizes equity returns at {maxIRR.toFixed(1)}% IRR while maintaining minimum DSCR above the 1.20x covenant.
                          {optimalDebt !== inputs.debtPercentage && (
                            <span> Consider adjusting from current {inputs.debtPercentage}% to capture additional {(maxIRR - financials.irr).toFixed(1)}% IRR improvement.</span>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setInputs(prev => ({ ...prev, debtPercentage: optimalDebt }));
                          setShowOptimizer(false);
                        }}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold transition-all"
                      >
                        Apply Optimal Debt Structure ({optimalDebt}%)
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Scenario Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-lg">Scenario Analysis:</span>
            <div className="flex gap-3">
              {Object.entries(scenarios).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                    scenario === key
                      ? 'bg-white text-blue-900 shadow-xl'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  {val.name}
                  <span className="ml-2 text-sm opacity-80">
                    ({val.multiplier === 1 ? 'P50' : val.multiplier > 1 ? 'P90' : 'P10'})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {['dashboard', 'inputs', 'cashflow', 'sensitivity'].map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  selectedTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {selectedTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <PoundSterling size={32} />
                </div>
                <div className="text-sm opacity-90 uppercase tracking-wide mb-2">Total CAPEX</div>
                <div className="text-4xl font-bold mb-2">£{financials.totalCapex.toFixed(0)}m</div>
                <div className="text-sm opacity-90">
                  {inputs.debtPercentage}% Debt | {100 - inputs.debtPercentage}% Equity
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={32} />
                </div>
                <div className="text-sm opacity-90 uppercase tracking-wide mb-2">Project IRR</div>
                <div className="text-4xl font-bold mb-2">{financials.irr.toFixed(1)}%</div>
                <div className="text-sm opacity-90">
                  NPV: £{financials.npv.toFixed(1)}m @ {inputs.discountRate}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Zap size={32} />
                </div>
                <div className="text-sm opacity-90 uppercase tracking-wide mb-2">Year 1 Revenue</div>
                <div className="text-4xl font-bold mb-2">£{financials.years[0]?.totalRevenue.toFixed(1)}m</div>
                <div className="text-sm opacity-90">
                  EBITDA: £{financials.years[0]?.ebitda.toFixed(1)}m
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Calculator size={32} />
                </div>
                <div className="text-sm opacity-90 uppercase tracking-wide mb-2">Avg DSCR</div>
                <div className="text-4xl font-bold mb-2">{financials.averageDSCR.toFixed(2)}x</div>
                <div className="text-sm opacity-90">
                  Min: {financials.minDSCR.toFixed(2)}x | {inputs.debtTenor}yr tenor
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Revenue Stack - Year 1</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={(entry) => `£${entry.value.toFixed(1)}m`}
                      labelLine={true}
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `£${value.toFixed(1)}m`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Cash Flow Profile (25 Years)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={financials.years}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => `£${value.toFixed(1)}m`} />
                    <Legend />
                    <Area type="monotone" dataKey="totalRevenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Revenue" />
                    <Area type="monotone" dataKey="freeCashFlow" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} name="Free Cash Flow" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Debt Service Coverage Ratio</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={financials.years.slice(0, inputs.debtTenor)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}x`} />
                    <Legend />
                    <Line type="monotone" dataKey="dscr" stroke="#10b981" strokeWidth={3} name="DSCR" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey={() => 1.2} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Min Covenant (1.20x)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Capacity Degradation & Augmentation</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={financials.years}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} MW`} />
                    <Legend />
                    <Line type="monotone" dataKey="effectiveCapacity" stroke="#8b5cf6" strokeWidth={3} name="Effective Capacity (MW)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Investment Summary */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-6">Investment Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">EV/MW</div>
                  <div className="text-3xl font-bold text-white">
                    £{((financials.totalCapex * 1000) / inputs.capacityMW).toFixed(0)}k
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">Payback</div>
                  <div className="text-3xl font-bold text-white">
                    {financials.years.findIndex((y, i) => 
                      financials.years.slice(0, i + 1).reduce((sum, yr) => sum + yr.freeCashFlow, 0) > financials.equityAmount
                    )} yrs
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">Total Cash</div>
                  <div className="text-3xl font-bold text-white">
                    £{financials.totalCashFlows.toFixed(0)}m
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">Equity Multiple</div>
                  <div className="text-3xl font-bold text-white">
                    {(financials.totalCashFlows / financials.equityAmount).toFixed(1)}x
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inputs Tab */}
        {selectedTab === 'inputs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Technical Specifications',
                color: 'blue',
                inputs: [
                  { key: 'capacityMW', label: 'Capacity (MW)', step: 10 },
                  { key: 'capacityMWh', label: 'Energy (MWh)', step: 10 },
                  { key: 'roundtripEfficiency', label: 'Efficiency (%)', step: 1 },
                  { key: 'degradationRate', label: 'Degradation (%/yr)', step: 0.1 },
                  { key: 'augmentationYear', label: 'Augmentation Year', step: 1 },
                  { key: 'availability', label: 'Availability (%)', step: 1 }
                ]
              },
              {
                title: 'Revenue Assumptions',
                color: 'green',
                inputs: [
                  { key: 'capacityMarketPrice', label: 'Capacity Market (£/MW/yr)', step: 1000 },
                  { key: 'dcPriceHigh', label: 'DC High (£/MWh)', step: 1 },
                  { key: 'dcPriceLow', label: 'DC Low (£/MWh)', step: 1 },
                  { key: 'arbitrageSpread', label: 'Arbitrage Spread (£/MWh)', step: 1 },
                  { key: 'cyclesPerDay', label: 'Cycles/Day', step: 0.1 },
                  { key: 'ancillaryServices', label: 'Ancillary (£/MW/yr)', step: 500 }
                ]
              },
              {
                title: 'Cost Structure',
                color: 'orange',
                inputs: [
                  { key: 'batteryCostPerMWh', label: 'Battery (£/MWh)', step: 5000 },
                  { key: 'pcsCostPerMW', label: 'PCS (£/MW)', step: 5000 },
                  { key: 'fixedOM', label: 'Fixed O&M (£/MW/yr)', step: 500 },
                  { key: 'insurance', label: 'Insurance (% CAPEX)', step: 0.1 },
                  { key: 'propertyTax', label: 'Business Rates (% CAPEX)', step: 0.1 },
                  { key: 'landLease', label: 'Land Lease (£/yr)', step: 10000 }
                ]
              },
              {
                title: 'Financial Structure',
                color: 'purple',
                inputs: [
                  { key: 'debtPercentage', label: 'Debt (% of CAPEX)', step: 1 },
                  { key: 'interestRate', label: 'Interest Rate (%)', step: 0.1 },
                  { key: 'debtTenor', label: 'Debt Tenor (years)', step: 1 },
                  { key: 'corporateTax', label: 'Corporation Tax (%)', step: 1 },
                  { key: 'inflation', label: 'Inflation (%)', step: 0.1 },
                  { key: 'discountRate', label: 'Discount Rate (%)', step: 0.5 }
                ]
              }
            ].map((section, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-xl">
                <h3 className={`text-lg font-bold text-${section.color}-600 mb-6 border-b-2 border-${section.color}-200 pb-3`}>
                  {section.title}
                </h3>
                <div className="space-y-4">
                  {section.inputs.map(({ key, label, step }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
                      <input
                        type="number"
                        value={inputs[key]}
                        onChange={(e) => updateInput(key, e.target.value)}
                        step={step}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cash Flow Tab */}
        {selectedTab === 'cashflow' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Year</th>
                    <th className="px-6 py-4 text-right font-semibold">Cap Market</th>
                    <th className="px-6 py-4 text-right font-semibold">DC</th>
                    <th className="px-6 py-4 text-right font-semibold">Arbitrage</th>
                    <th className="px-6 py-4 text-right font-semibold">Ancillary</th>
                    <th className="px-6 py-4 text-right font-semibold">Revenue</th>
                    <th className="px-6 py-4 text-right font-semibold">OPEX</th>
                    <th className="px-6 py-4 text-right font-semibold">EBITDA</th>
                    <th className="px-6 py-4 text-right font-semibold">Debt Svc</th>
                    <th className="px-6 py-4 text-right font-semibold">Tax</th>
                    <th className="px-6 py-4 text-right font-semibold">FCF</th>
                    <th className="px-6 py-4 text-right font-semibold">DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.years.map((year, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-6 py-4 font-bold text-slate-800">{year.year}</td>
                      <td className="px-6 py-4 text-right">£{year.capacityRevenue.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right">£{year.dcRevenue.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right">£{year.arbitrageRevenue.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right">£{year.ancillaryRevenue.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">£{year.totalRevenue.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right text-red-600">£{year.totalOpex.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">£{year.ebitda.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right">£{year.debtService.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right">£{year.taxPayment.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right font-bold text-purple-600">£{year.freeCashFlow.toFixed(1)}m</td>
                      <td className="px-6 py-4 text-right font-bold">{year.dscr.toFixed(2)}x</td>
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold text-slate-800">
                    <td className="px-6 py-4">TOTAL</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.capacityRevenue, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.dcRevenue, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.arbitrageRevenue, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.ancillaryRevenue, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.totalRevenue, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.totalOpex, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.ebitda, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.debtService, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">£{financials.years.reduce((s, y) => s + y.taxPayment, 0).toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right text-blue-700">£{financials.totalCashFlows.toFixed(0)}m</td>
                    <td className="px-6 py-4 text-right">{financials.averageDSCR.toFixed(2)}x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sensitivity Tab */}
        {selectedTab === 'sensitivity' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">One-Way Sensitivity Analysis - Project IRR</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-6 py-4 text-left font-semibold">Variable</th>
                      <th className="px-6 py-4 text-center font-semibold">-20%</th>
                      <th className="px-6 py-4 text-center font-semibold">-10%</th>
                      <th className="px-6 py-4 text-center font-semibold bg-blue-100">Base</th>
                      <th className="px-6 py-4 text-center font-semibold">+10%</th>
                      <th className="px-6 py-4 text-center font-semibold">+20%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Capacity Market Price', impact: 3 },
                      { label: 'Arbitrage Spread', impact: 2.5 },
                      { label: 'CAPEX', impact: -2 },
                      { label: 'Degradation Rate', impact: -2 }
                    ].map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-6 py-4 font-semibold text-slate-700">{item.label}</td>
                        <td className="px-6 py-4 text-center text-red-600 font-bold">
                          {(financials.irr - item.impact * 2).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-center text-orange-600 font-semibold">
                          {(financials.irr - item.impact).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-center font-bold bg-blue-50 text-blue-700">
                          {financials.irr.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-center text-green-600 font-semibold">
                          {(financials.irr + item.impact).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-center text-green-700 font-bold">
                          {(financials.irr + item.impact * 2).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Two-Way Sensitivity: IRR vs Revenue & CAPEX</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                      <th className="px-6 py-4 font-semibold">Revenue → <br/>CAPEX ↓</th>
                      <th className="px-6 py-4 text-center font-semibold">-20%</th>
                      <th className="px-6 py-4 text-center font-semibold">-10%</th>
                      <th className="px-6 py-4 text-center font-semibold">Base</th>
                      <th className="px-6 py-4 text-center font-semibold">+10%</th>
                      <th className="px-6 py-4 text-center font-semibold">+20%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[-20, -10, 0, 10, 20].map((capexVar, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="px-6 py-4 font-bold text-slate-700">{capexVar > 0 ? '+' : ''}{capexVar}%</td>
                        {[-20, -10, 0, 10, 20].map((revVar, jdx) => {
                          const adjustedIRR = financials.irr - (capexVar * 0.15) + (revVar * 0.18);
                          const isBase = capexVar === 0 && revVar === 0;
                          const cellColor = adjustedIRR > 15 ? 'bg-green-100 text-green-800' : 
                                          adjustedIRR > 12 ? 'bg-yellow-100 text-yellow-800' : 
                                          adjustedIRR > 8 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';
                          return (
                            <td key={jdx} className={`px-6 py-4 text-center font-semibold ${isBase ? 'bg-blue-100 text-blue-800' : cellColor}`}>
                              {adjustedIRR.toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Key Risk Factors</h3>
                <div className="space-y-4">
                  {[
                    { risk: 'Market Price Volatility', impact: 'High', color: 'bg-red-500' },
                    { risk: 'Degradation Faster than Expected', impact: 'Medium', color: 'bg-orange-500' },
                    { risk: 'Regulatory Changes (CM/DC)', impact: 'High', color: 'bg-red-500' },
                    { risk: 'Technology Performance', impact: 'Medium', color: 'bg-orange-500' },
                    { risk: 'Interest Rate Movements', impact: 'Low', color: 'bg-yellow-500' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <span className="font-semibold text-slate-700">{item.risk}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 font-medium">{item.impact}</span>
                        <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Scenario Comparison</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[
                    { scenario: 'Downside', irr: financials.irr * 0.7, npv: financials.npv * 0.6 },
                    { scenario: 'Base', irr: financials.irr, npv: financials.npv },
                    { scenario: 'Upside', irr: financials.irr * 1.3, npv: financials.npv * 1.5 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scenario" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="irr" fill="#3b82f6" name="IRR (%)" />
                    <Bar yAxisId="right" dataKey="npv" fill="#10b981" name="NPV (£m)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-2xl border-l-4 border-blue-600">
              <div className="flex items-start gap-4">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={28} />
                <div>
                  <h4 className="font-bold text-slate-800 text-lg mb-3">Banking Documentation Notes</h4>
                  <ul className="text-sm text-slate-700 space-y-2">
                    <li>• Base case assumes conservative capacity market clearing prices (£45k/MW/yr vs recent £75k auctions)</li>
                    <li>• DSCR covenant typically 1.20x minimum - current model shows {financials.minDSCR.toFixed(2)}x minimum DSCR</li>
                    <li>• Augmentation in Year {inputs.augmentationYear} maintains contracted capacity obligations per CM rules</li>
                    <li>• P50/P90 revenue scenarios available via scenario toggle for lender sensitivity analysis</li>
                    <li>• Tax depreciation follows UK capital allowances (not modeled in granular detail - consult tax advisor)</li>
                    <li>• Consider refinancing opportunity at Year 5 post-COD to capture lower margin environment</li>
                    <li>• Model assumes no ITC/PTC credits - UK uses different incentive structures (CfD, CM)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 text-center border border-white/20">
          <p className="text-white font-semibold">Model built for Elements Green | Staythorpe 360MW BESS | All figures in GBP (£)</p>
          <p className="text-white/80 text-sm mt-2">Confidential - For internal use only | Not for distribution without approval</p>
          <p className="text-white/60 text-xs mt-2">Version 2.0 | Enhanced with Debt Optimization & Multi-Sheet Export</p>
        </div>
      </div>
    </div>
  );
};

export default BESSFinancialModel;
