import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import BESSFinancialModel, { defaultInputs } from "./BESSFinancialModel.jsx";
import React, { useEffect, useMemo, useState } from 'react';

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
          <h1>Projects</h1>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add Project</button>
        </div>
      </div>
      <div className="panel">
        {projects.length === 0 ? (
          <div style={{padding:24}}>No projects yet. Click Add Project.</div>
        ) : (
          <table style={{width:'100%'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left'}}>Project</th>
                <th>MW</th>
                <th>IRR</th>
                <th>NPV (£m)</th>
                <th>MOIC (x)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p: Project) => (
                <tr key={p.id} className="portfolio-row" onClick={() => openProject(p.id)}>
                  <td style={{textAlign:'left'}}><strong>{p.name}</strong></td>
                  <td>{p.capacity}MW</td>
                  <td>{Number(p.irr).toFixed(1)}%</td>
                  <td>{Number(p.npv).toFixed(1)}</td>
                  <td>{Number(p.moic).toFixed(2)}</td>
                  <td onClick={(e)=> e.stopPropagation()}>
                    <button className="btn" onClick={() => removeProject(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
