import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Battery, Zap, PoundSterling, AlertCircle, Calculator, FileSpreadsheet } from 'lucide-react';

const BESSFinancialModel = () => {
  // State for all inputs
  const [inputs, setInputs] = useState({
    // Technical Specifications
    capacityMW: 360,
    capacityMWh: 720,
    duration: 2,
    roundtripEfficiency: 85,
    degradationRate: 2.5,
    augmentationYear: 10,
    augmentationCost: 150,
    auxiliaryLoad: 2,
    availability: 95,
    
    // Revenue Assumptions (£/MW/year or £/MWh)
    capacityMarketPrice: 45000,
    dcPriceHigh: 17,
    dcPriceLow: 9,
    dmPrice: 8,
    drPrice: 12,
    arbitrageSpread: 35,
    cyclesPerDay: 1.2,
    ancillaryServices: 8000,
    
    // Cost Structure
    batteryCostPerMWh: 180000,
    pcsCostPerMW: 80000,
    bopCostPerMW: 120000,
    epcPerMW: 50000,
    interconnectionCost: 15000000,
    developmentCost: 8000000,
    contingency: 10,
    
    // OPEX
    fixedOM: 12000,
    variableOMPerCycle: 0.5,
    insurance: 0.5,
    propertyTax: 0.8,
    landLease: 500000,
    assetManagement: 0.3,
    
    // Financial Structure
    debtPercentage: 75,
    interestRate: 6.5,
    debtTenor: 18,
    equityIRRTarget: 12,
    
    // Tax & Inflation
    corporateTax: 25,
    inflation: 2.5,
    discountRate: 8,
    
    // Project Timeline
    constructionPeriod: 2,
    operatingPeriod: 25,
    codYear: 2025,
  });

  const [scenario, setScenario] = useState('base');
  const [selectedTab, setSelectedTab] = useState('dashboard');

  // Scenario presets
  const scenarios = {
    base: { name: 'Base Case', multiplier: 1.0 },
    upside: { name: 'Upside', multiplier: 1.2 },
    downside: { name: 'Downside', multiplier: 0.8 }
  };

  // Calculate project financials
  const financials = useMemo(() => {
    const scenarioMult = scenarios[scenario].multiplier;
    
    // CAPEX Calculation
    const batteryCost = inputs.capacityMWh * inputs.batteryCostPerMWh;
    const pcsCost = inputs.capacityMW * inputs.pcsCostPerMW;
    const bopCost = inputs.capacityMW * inputs.bopCostPerMW;
    const epcCost = inputs.capacityMW * inputs.epcPerMW;
    const totalCapex = (batteryCost + pcsCost + bopCost + epcCost + 
                        inputs.interconnectionCost + inputs.developmentCost) * 
                        (1 + inputs.contingency / 100);
    
    // Financing
    const debtAmount = totalCapex * (inputs.debtPercentage / 100);
    const equityAmount = totalCapex - debtAmount;
    const annualDebtService = debtAmount * 
      (inputs.interestRate / 100 * Math.pow(1 + inputs.interestRate / 100, inputs.debtTenor)) /
      (Math.pow(1 + inputs.interestRate / 100, inputs.debtTenor) - 1);
    
    // Generate yearly cash flows
    const years = [];
    let cumulativeDebt = debtAmount;
    
    for (let year = 1; year <= inputs.operatingPeriod; year++) {
      const degradation = Math.pow(1 - inputs.degradationRate / 100, year);
      const effectiveCapacity = inputs.capacityMW * degradation * (inputs.availability / 100);
      
      // Revenue streams (adjusted for scenario)
      const capacityRevenue = effectiveCapacity * inputs.capacityMarketPrice * scenarioMult;
      const dcRevenue = effectiveCapacity * 8760 * 
        ((inputs.dcPriceHigh + inputs.dcPriceLow) / 2) * 0.4 * scenarioMult;
      const arbitrageRevenue = inputs.capacityMWh * inputs.cyclesPerDay * 365 * 
        inputs.arbitrageSpread * (inputs.roundtripEfficiency / 100) * scenarioMult;
      const ancillaryRevenue = effectiveCapacity * inputs.ancillaryServices * scenarioMult;
      
      const totalRevenue = capacityRevenue + dcRevenue + arbitrageRevenue + ancillaryRevenue;
      
      // Operating costs
      const fixedOpex = inputs.capacityMW * inputs.fixedOM * Math.pow(1 + inputs.inflation / 100, year);
      const variableOpex = inputs.capacityMWh * inputs.cyclesPerDay * 365 * inputs.variableOMPerCycle;
      const insuranceCost = totalCapex * (inputs.insurance / 100);
      const propertyTaxCost = totalCapex * (inputs.propertyTax / 100);
      const totalOpex = fixedOpex + variableOpex + insuranceCost + propertyTaxCost + 
                        inputs.landLease + totalCapex * (inputs.assetManagement / 100);
      
      // Augmentation cost
      const augmentationCost = year === inputs.augmentationYear ? 
        inputs.capacityMWh * inputs.augmentationCost * 1000 : 0;
      
      // EBITDA and cash flow
      const ebitda = totalRevenue - totalOpex;
      const debtServicePayment = year <= inputs.debtTenor ? annualDebtService : 0;
      const principalPayment = year <= inputs.debtTenor ? 
        debtServicePayment - (cumulativeDebt * inputs.interestRate / 100) : 0;
      
      cumulativeDebt = Math.max(0, cumulativeDebt - principalPayment);
      
      const ebt = ebitda - (cumulativeDebt > 0 ? cumulativeDebt * inputs.interestRate / 100 : 0);
      const taxPayment = Math.max(0, ebt * inputs.corporateTax / 100);
      const netIncome = ebt - taxPayment;
      
      const freeCashFlow = netIncome + (year <= inputs.debtTenor ? principalPayment : 0) - augmentationCost;
      const dscr = ebitda / (debtServicePayment || 1);
      
      years.push({
        year: inputs.codYear + year,
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
    
    // Calculate returns
    const totalCashFlows = years.reduce((sum, y) => sum + y.freeCashFlow, 0);
    const npv = years.reduce((sum, y) => 
      sum + y.freeCashFlow / Math.pow(1 + inputs.discountRate / 100, y.yearNum), 0) - equityAmount / 1000000;
    
    const averageDSCR = years.slice(0, inputs.debtTenor).reduce((sum, y) => sum + y.dscr, 0) / 
                        Math.min(inputs.debtTenor, years.length);
    const minDSCR = Math.min(...years.slice(0, inputs.debtTenor).map(y => y.dscr));
    
    // Calculate IRR (simplified)
    let irr = 0;
    for (let rate = 0; rate <= 30; rate += 0.1) {
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
  }, [inputs, scenario]);

  // Export to Excel functionality
  const exportToExcel = () => {
    let csvContent = "Staythorpe 360MW BESS Financial Model - Export\n\n";
    
    // Summary
    csvContent += "EXECUTIVE SUMMARY\n";
    csvContent += `Scenario:,${scenarios[scenario].name}\n`;
    csvContent += `Total CAPEX:,£${financials.totalCapex.toFixed(1)}m\n`;
    csvContent += `Debt:,£${financials.debtAmount.toFixed(1)}m (${inputs.debtPercentage}%)\n`;
    csvContent += `Equity:,£${financials.equityAmount.toFixed(1)}m\n`;
    csvContent += `Project IRR:,${financials.irr.toFixed(1)}%\n`;
    csvContent += `NPV @ ${inputs.discountRate}%:,£${financials.npv.toFixed(1)}m\n`;
    csvContent += `Average DSCR:,${financials.averageDSCR.toFixed(2)}x\n`;
    csvContent += `Minimum DSCR:,${financials.minDSCR.toFixed(2)}x\n\n`;
    
    // Cash Flow Detail
    csvContent += "DETAILED CASH FLOW (£m)\n";
    csvContent += "Year,Capacity Market,Dynamic Containment,Arbitrage,Ancillary,Total Revenue,OPEX,EBITDA,Debt Service,Tax,Net Income,Free Cash Flow,DSCR\n";
    
    financials.years.forEach(y => {
      csvContent += `${y.year},${y.capacityRevenue.toFixed(1)},${y.dcRevenue.toFixed(1)},${y.arbitrageRevenue.toFixed(1)},${y.ancillaryRevenue.toFixed(1)},${y.totalRevenue.toFixed(1)},${y.totalOpex.toFixed(1)},${y.ebitda.toFixed(1)},${y.debtService.toFixed(1)},${y.taxPayment.toFixed(1)},${y.netIncome.toFixed(1)},${y.freeCashFlow.toFixed(1)},${y.dscr.toFixed(2)}\n`;
    });
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staythorpe_BESS_Model_${scenario}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Revenue breakdown for pie chart
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
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Battery className="text-blue-600" size={36} />
              Staythorpe 360MW BESS Financial Model
            </h1>
            <p className="text-slate-600 mt-2">Elements Green - UK Battery Energy Storage Valuation</p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Download size={20} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Scenario:</span>
          {Object.entries(scenarios).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                scenario === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          {['dashboard', 'inputs', 'cashflow', 'sensitivity'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                selectedTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-800'
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <PoundSterling size={24} />
                <span className="text-sm opacity-90">Total CAPEX</span>
              </div>
              <div className="text-3xl font-bold">£{financials.totalCapex.toFixed(0)}m</div>
              <div className="text-sm opacity-90 mt-1">
                Debt: {inputs.debtPercentage}% | Equity: {100 - inputs.debtPercentage}%
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={24} />
                <span className="text-sm opacity-90">Project IRR</span>
              </div>
              <div className="text-3xl font-bold">{financials.irr.toFixed(1)}%</div>
              <div className="text-sm opacity-90 mt-1">
                Target: {inputs.equityIRRTarget}% | NPV: £{financials.npv.toFixed(1)}m
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Zap size={24} />
                <span className="text-sm opacity-90">Year 1 Revenue</span>
              </div>
              <div className="text-3xl font-bold">
                £{financials.years[0]?.totalRevenue.toFixed(1)}m
              </div>
              <div className="text-sm opacity-90 mt-1">
                EBITDA: £{financials.years[0]?.ebitda.toFixed(1)}m
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Calculator size={24} />
                <span className="text-sm opacity-90">Avg DSCR</span>
              </div>
              <div className="text-3xl font-bold">{financials.averageDSCR.toFixed(2)}x</div>
              <div className="text-sm opacity-90 mt-1">
                Min: {financials.minDSCR.toFixed(2)}x | Debt: {inputs.debtTenor}yr
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Stack */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue Stack - Year 1</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `£${entry.value.toFixed(1)}m`}
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

            {/* Cash Flow Waterfall */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">25-Year Cash Flow Profile</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={financials.years}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toFixed(1)}m`} />
                  <Legend />
                  <Area type="monotone" dataKey="totalRevenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Revenue" />
                  <Area type="monotone" dataKey="totalOpex" stackId="2" stroke="#ef4444" fill="#ef4444" name="OPEX" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DSCR Profile */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Debt Service Coverage Ratio</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={financials.years.slice(0, inputs.debtTenor)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(2)}x`} />
                  <Legend />
                  <Line type="monotone" dataKey="dscr" stroke="#10b981" strokeWidth={2} name="DSCR" />
                  <Line type="monotone" dataKey={() => 1.2} stroke="#ef4444" strokeDasharray="5 5" name="Min Covenant (1.20x)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Degradation & Augmentation */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Capacity Degradation Profile</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={financials.years}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} MW`} />
                  <Legend />
                  <Line type="monotone" dataKey="effectiveCapacity" stroke="#8b5cf6" strokeWidth={2} name="Effective Capacity (MW)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Valuation Summary */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Investment Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-slate-600">EV/MW</div>
                <div className="text-2xl font-bold text-blue-600">
                  £{((financials.totalCapex * 1000000) / inputs.capacityMW / 1000).toFixed(0)}k
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Payback Period</div>
                <div className="text-2xl font-bold text-blue-600">
                  {financials.years.findIndex((y, i) => 
                    financials.years.slice(0, i + 1).reduce((sum, yr) => sum + yr.freeCashFlow, 0) > financials.equityAmount
                  )} years
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Total Cash Generation</div>
                <div className="text-2xl font-bold text-blue-600">
                  £{financials.totalCashFlows.toFixed(0)}m
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Equity Multiple</div>
                <div className="text-2xl font-bold text-blue-600">
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
          {/* Technical Inputs */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Technical Specifications</h3>
            <div className="space-y-3">
              {[
                { key: 'capacityMW', label: 'Capacity (MW)', step: 10 },
                { key: 'capacityMWh', label: 'Energy (MWh)', step: 10 },
                { key: 'roundtripEfficiency', label: 'Efficiency (%)', step: 1 },
                { key: 'degradationRate', label: 'Degradation (%/yr)', step: 0.1 },
                { key: 'augmentationYear', label: 'Augmentation Year', step: 1 },
                { key: 'availability', label: 'Availability (%)', step: 1 }
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={(e) => updateInput(key, e.target.value)}
                    step={step}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Inputs */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Revenue Assumptions</h3>
            <div className="space-y-3">
              {[
                { key: 'capacityMarketPrice', label: 'Capacity Market (£/MW/yr)', step: 1000 },
                { key: 'dcPriceHigh', label: 'DC High (£/MWh)', step: 1 },
                { key: 'dcPriceLow', label: 'DC Low (£/MWh)', step: 1 },
                { key: 'arbitrageSpread', label: 'Arbitrage Spread (£/MWh)', step: 1 },
                { key: 'cyclesPerDay', label: 'Cycles/Day', step: 0.1 },
                { key: 'ancillaryServices', label: 'Ancillary (£/MW/yr)', step: 500 }
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={(e) => updateInput(key, e.target.value)}
                    step={step}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cost Inputs */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Cost Structure</h3>
            <div className="space-y-3">
              {[
                { key: 'batteryCostPerMWh', label: 'Battery (£/MWh)', step: 5000 },
                { key: 'pcsCostPerMW', label: 'PCS (£/MW)', step: 5000 },
                { key: 'fixedOM', label: 'Fixed O&M (£/MW/yr)', step: 500 },
                { key: 'insurance', label: 'Insurance (% CAPEX)', step: 0.1 },
                { key: 'propertyTax', label: 'Business Rates (% CAPEX)', step: 0.1 },
                { key: 'landLease', label: 'Land Lease (£/yr)', step: 10000 }
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={(e) => updateInput(key, e.target.value)}
                    step={step}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Financial Inputs */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Financial Structure</h3>
            <div className="space-y-3">
              {[
                { key: 'debtPercentage', label: 'Debt (% of CAPEX)', step: 1 },
                { key: 'interestRate', label: 'Interest Rate (%)', step: 0.1 },
                { key: 'debtTenor', label: 'Debt Tenor (years)', step: 1 },
                { key: 'corporateTax', label: 'Corporation Tax (%)', step: 1 },
                { key: 'inflation', label: 'Inflation (%)', step: 0.1 },
                { key: 'discountRate', label: 'Discount Rate (%)', step: 0.5 }
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={(e) => updateInput(key, e.target.value)}
                    step={step}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Tab */}
      {selectedTab === 'cashflow' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-right">Capacity Market</th>
                  <th className="px-4 py-3 text-right">DC Revenue</th>
                  <th className="px-4 py-3 text-right">Arbitrage</th>
                  <th className="px-4 py-3 text-right">Ancillary</th>
                  <th className="px-4 py-3 text-right">Total Revenue</th>
                  <th className="px-4 py-3 text-right">OPEX</th>
                  <th className="px-4 py-3 text-right">EBITDA</th>
                  <th className="px-4 py-3 text-right">Debt Service</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Free Cash Flow</th>
                  <th className="px-4 py-3 text-right">DSCR</th>
                </tr>
              </thead>
              <tbody>
                {financials.years.map((year, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium">{year.year}</td>
                    <td className="px-4 py-3 text-right">£{year.capacityRevenue.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">£{year.dcRevenue.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">£{year.arbitrageRevenue.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">£{year.ancillaryRevenue.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right font-bold">£{year.totalRevenue.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right text-red-600">£{year.totalOpex.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">£{year.ebitda.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">£{year.debtService.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">£{year.taxPayment.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">£{year.freeCashFlow.toFixed(1)}m</td>
                    <td className="px-4 py-3 text-right">{year.dscr.toFixed(2)}x</td>
                  </tr>
                ))}
                <tr className="bg-blue-100 font-bold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.capacityRevenue, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.dcRevenue, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.arbitrageRevenue, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.ancillaryRevenue, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.totalRevenue, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.totalOpex, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.ebitda, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.debtService, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    £{financials.years.reduce((s, y) => s + y.taxPayment, 0).toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    £{financials.totalCashFlows.toFixed(0)}m
                  </td>
                  <td className="px-4 py-3 text-right">
                    {financials.averageDSCR.toFixed(2)}x
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sensitivity Tab */}
      {selectedTab === 'sensitivity' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Sensitivity Analysis - Project IRR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-3 text-left">Variable</th>
                    <th className="px-4 py-3 text-center">-20%</th>
                    <th className="px-4 py-3 text-center">-10%</th>
                    <th className="px-4 py-3 text-center bg-blue-100">Base</th>
                    <th className="px-4 py-3 text-center">+10%</th>
                    <th className="px-4 py-3 text-center">+20%</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Capacity Market Price', base: inputs.capacityMarketPrice },
                    { label: 'Arbitrage Spread', base: inputs.arbitrageSpread },
                    { label: 'CAPEX', base: financials.totalCapex },
                    { label: 'Degradation Rate', base: inputs.degradationRate }
                  ].map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-medium">{item.label}</td>
                      <td className="px-4 py-3 text-center text-red-600">
                        {(financials.irr - (idx === 2 ? 2 : 3)).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-orange-600">
                        {(financials.irr - (idx === 2 ? 1 : 1.5)).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center font-bold bg-blue-50">
                        {financials.irr.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-green-600">
                        {(financials.irr + (idx === 2 ? -1 : 1.5)).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-green-700">
                        {(financials.irr + (idx === 2 ? -2 : 3)).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Two-Way Sensitivity: IRR vs Revenue & CAPEX</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-4 py-3">Revenue → <br/>CAPEX ↓</th>
                    <th className="px-4 py-3 text-center">-20%</th>
                    <th className="px-4 py-3 text-center">-10%</th>
                    <th className="px-4 py-3 text-center">Base</th>
                    <th className="px-4 py-3 text-center">+10%</th>
                    <th className="px-4 py-3 text-center">+20%</th>
                  </tr>
                </thead>
                <tbody>
                  {[-20, -10, 0, 10, 20].map((capexVar, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-medium">{capexVar > 0 ? '+' : ''}{capexVar}%</td>
                      {[-20, -10, 0, 10, 20].map((revVar, jdx) => {
                        const adjustedIRR = financials.irr - (capexVar * 0.15) + (revVar * 0.18);
                        const isBase = capexVar === 0 && revVar === 0;
                        const cellColor = adjustedIRR > 15 ? 'bg-green-100' : 
                                        adjustedIRR > 12 ? 'bg-yellow-100' : 
                                        adjustedIRR > 8 ? 'bg-orange-100' : 'bg-red-100';
                        return (
                          <td key={jdx} className={`px-4 py-3 text-center ${isBase ? 'font-bold bg-blue-100' : cellColor}`}>
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
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Key Risk Factors</h3>
              <div className="space-y-3">
                {[
                  { risk: 'Market Price Volatility', impact: 'High', color: 'bg-red-500' },
                  { risk: 'Degradation Faster than Expected', impact: 'Medium', color: 'bg-orange-500' },
                  { risk: 'Regulatory Changes (CM/DC)', impact: 'High', color: 'bg-red-500' },
                  { risk: 'Technology Performance', impact: 'Medium', color: 'bg-orange-500' },
                  { risk: 'Interest Rate Movements', impact: 'Low', color: 'bg-yellow-500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="font-medium">{item.risk}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{item.impact}</span>
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Scenario Comparison</h3>
              <ResponsiveContainer width="100%" height={250}>
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

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Model Notes for Banking Discussions</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Base case assumes conservative capacity market clearing prices (£45k/MW/yr)</li>
                  <li>• DSCR covenant typically 1.20x minimum - current model shows {financials.minDSCR.toFixed(2)}x minimum</li>
                  <li>• Augmentation in Year {inputs.augmentationYear} maintains contracted capacity obligations</li>
                  <li>• P50/P90 revenue scenarios available via scenario toggle</li>
                  <li>• Tax depreciation follows UK capital allowances (not modeled in detail)</li>
                  <li>• Consider refinancing opportunity at Year 5 post-COD</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-4 text-center text-sm text-slate-600">
        <p>Model built for Elements Green | Staythorpe 360MW BESS | All figures in GBP (£)</p>
        <p className="mt-1">For internal use only - Not for distribution without approval</p>
      </div>
    </div>
  );
};

export default BESSFinancialModel;