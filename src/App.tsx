import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import BESSFinancialModel, { defaultInputs } from "./BESSFinancialModel.jsx";
import React, { useEffect, useMemo, useState } from 'react';
import { Battery, PoundSterling, TrendingUp, Zap, Calculator, Target, Clock, DollarSign } from 'lucide-react';

type Project = {
  id: number;
  name: string;
  capacity: number;
  duration: number;
  capex: number;
  irr: number;
  npv: number;
  moic: number;
  avgDSCR: number;
  minDSCR: number;
  payback: number;
  inputs: any;
};

function useProjectsStorage() {
  const key = 'projects_v1';
  const [projects, setProjects] = useState<Project[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]') as Project[]; } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(projects)); } catch {}
  }, [projects]);
  const saveProject = (proj: Project) => setProjects((prev: Project[]) => {
    const existingIdx = prev.findIndex((p: Project) => p.id === proj.id);
    if (existingIdx >= 0) {
      const next = [...prev]; next[existingIdx] = proj; return next;
    }
    return [proj, ...prev];
  });
  const removeProject = (id: number) => setProjects((prev: Project[]) => prev.filter((p: Project) => p.id !== id));
  return { projects, saveProject, removeProject };
}

function ProjectsDashboard() {
  const { projects, saveProject, removeProject } = useProjectsStorage();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [quick, setQuick] = useState({
    name: 'New Project',
    capacityMW: 100,
    durationHours: 2,
    codDate: '2027-01-01'
  });
  const openProject = (id: number) => navigate(`/projects/${id}`);

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <Battery size={28} color="#2563eb" />
          <div>
            <h1>Projects Dashboard</h1>
            <div className="sub">Portfolio overview and quick actions</div>
          </div>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add Project</button>
        </div>
      </div>

      {/* Summary cards aggregated across projects */}
      <div className="grid">
        <div className="card blue">
          <div className="k">
            <PoundSterling size={24} />
            <div>
              <div className="title">Projects</div>
              <div className="val">{projects.length}</div>
              <div className="sub">Saved in portfolio</div>
            </div>
          </div>
        </div>

        <div className="card green">
          <div className="k">
            <TrendingUp size={24} />
            <div>
              <div className="title">Best IRR</div>
              <div className="val">{projects.length ? Math.max(...projects.map(p=> p.irr||0)).toFixed(1) : '—'}%</div>
              <div className="sub">Across portfolio</div>
            </div>
          </div>
        </div>

        <div className="card purple">
          <div className="k">
            <Zap size={24} />
            <div>
              <div className="title">Total MW</div>
              <div className="val">{projects.reduce((s,p)=> s + (p.capacity||0), 0)} MW</div>
              <div className="sub">Nameplate</div>
            </div>
          </div>
        </div>

        <div className="card orange">
          <div className="k">
            <Calculator size={24} />
            <div>
              <div className="title">Avg IRR</div>
              <div className="val">{projects.length ? (projects.reduce((s,p)=> s + (p.irr||0),0)/projects.length).toFixed(1): '—'}%</div>
              <div className="sub">Simple average</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table of projects */}
      <div className="panel" style={{marginTop:16}}>
        {projects.length === 0 ? (
          <div style={{padding:24}}>No projects yet. Click Add Project.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{textAlign:'left'}}>Project</th>
                  <th>Capacity</th>
                  <th>IRR</th>
                  <th>NPV (£m)</th>
                  <th>MOIC (x)</th>
                  <th style={{textAlign:'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: Project) => (
                  <tr key={p.id} className="portfolio-row" onClick={() => openProject(p.id)}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.capacity}MW / {(p.capacity * (p.duration||0)).toFixed(0)}MWh</td>
                    <td style={{fontWeight:700}}>{Number(p.irr||0).toFixed(1)}%</td>
                    <td>{Number(p.npv||0).toFixed(1)}</td>
                    <td>{Number(p.moic||0).toFixed(2)}</td>
                    <td onClick={(e)=> e.stopPropagation()} style={{textAlign:'center'}}>
                      <button className="btn" onClick={() => removeProject(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={()=> setShowAdd(false)}>
          <div className="panel" style={{maxWidth:700, width:'100%'}} onClick={(e)=> e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>Quick Create Project</div>
              <button className="btn" onClick={()=> setShowAdd(false)}>Close</button>
            </div>
            <div className="grid" style={{marginTop:12}}>
              <div style={{gridColumn:'span 6'}}>
                <label>Name</label>
                <input value={quick.name} onChange={e=> setQuick(q=> ({...q, name:e.target.value}))} />
              </div>
              <div style={{gridColumn:'span 3'}}>
                <label>MW</label>
                <input type="number" value={quick.capacityMW} onChange={e=> setQuick(q=> ({...q, capacityMW:Number(e.target.value)}))} />
              </div>
              <div style={{gridColumn:'span 3'}}>
                <label>Duration (h)</label>
                <input type="number" value={quick.durationHours} onChange={e=> setQuick(q=> ({...q, durationHours:Number(e.target.value)}))} />
              </div>
              <div style={{gridColumn:'span 3'}}>
                <label>COD</label>
                <input type="date" value={quick.codDate} onChange={e=> setQuick(q=> ({...q, codDate:e.target.value}))} />
              </div>
            </div>
            <div style={{marginTop:16}}>
              <button className="btn primary" onClick={() => {
                const inputs = { ...defaultInputs, projectName: quick.name, capacityMW: quick.capacityMW, durationHours: quick.durationHours, codDate: quick.codDate };
                // Let the model compute metrics, then save via callback on detail page
                const tempId = Date.now();
                saveProject({ id: tempId, name: inputs.projectName, capacity: inputs.capacityMW, duration: inputs.durationHours, capex: 0, irr: 0, npv: 0, moic: 0, avgDSCR: 0, minDSCR: 0, payback: 0, inputs});
                setShowAdd(false);
                openProject(tempId);
              }}>Create & Open</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectDetail() {
  const { id } = useParams();
  const { projects, saveProject } = useProjectsStorage();
  const project: Project | undefined = projects.find((p: Project) => String(p.id) === String(id));
  const initial = project?.inputs || defaultInputs;
  const Model = BESSFinancialModel as unknown as React.FC<any>;
  return (
    <Model
      initialInputs={initial}
      hideAddToPortfolio
      enableExcel
      onSaveProject={(p: Project) => saveProject({ ...(p as any), id: project?.id || (p as any).id })}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsDashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
