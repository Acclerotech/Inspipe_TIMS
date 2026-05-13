import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Check, ChevronRight, X, Info, Lightbulb, ExternalLink
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  code: 'WSE' | 'FFS' | 'ILS';
  name: string;
  description: string;
  outputs: string[];
  icon: string;
  color: string;
}

interface InspectionFormData {
  templateId: string;
  templateCode: string;
  assetId: string;
  inspectionName: string;
  scope: string;
  inspectionDate: string;
  inspectorId: string;
  notes: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

interface ComparisonCapability {
  name: string;
  wse: boolean;
  ffs: boolean;
  ils: boolean;
}

const COMPARISON_CAPABILITIES: ComparisonCapability[] = [
  { name: 'Wall Thickness Analysis', wse: true, ffs: false, ils: true },
  { name: 'Corrosion Rate & RL', wse: true, ffs: false, ils: true },
  { name: 'API 579 Assessment', wse: false, ffs: true, ils: true },
  { name: 'MAWP / Pressure Check', wse: false, ffs: true, ils: true },
  { name: 'Damage Mechanism Review', wse: false, ffs: true, ils: true },
  { name: 'Risk Based Prioritization', wse: false, ffs: false, ils: true },
  { name: 'Inspection Planning', wse: false, ffs: false, ils: true },
];

const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 'wse', code: 'WSE', name: 'WSE – Wall Thickness Evaluation',
    description: 'Assess remaining wall thickness and predict remaining life based on corrosion data.',
    outputs: ['Corrosion rate calculation', 'Remaining life prediction', 'Thickness heatmaps', 'Defect mapping'],
    icon: '📡', color: 'blue',
  },
  {
    id: 'ffs', code: 'FFS', name: 'Fitness for Service (FFS)',
    description: 'Evaluate structural integrity and fitness for continued safe operation per API 579 / ASME standards.',
    outputs: ['FFS assessments (API 579)', 'MAWP / Design pressure checks', 'Damage mechanism evaluation', 'Repair recommendations'],
    icon: '🛡️', color: 'green',
  },
  {
    id: 'ils', code: 'ILS', name: 'Inline Service (ILS) Evaluation',
    description: 'Comprehensive integrity evaluation for in-service tanks combining thickness, FFS and risk.',
    outputs: ['Integrated corrosion & FFS', 'Risk-based prioritization', 'Inspection planning', 'Action tracking'],
    icon: '📊', color: 'purple',
  },
];

const STEPS = [
  { label: 'Select Template', sub: 'Choose inspection type' },
  { label: 'Inspection Details', sub: 'Provide inspection information' },
  { label: 'Data & Scope', sub: 'Define data and coverage' },
  { label: 'Review & Confirm', sub: 'Confirm and create' },
];

function templateColor(color: string) {
  if (color === 'blue') return { border: 'border-blue-500 bg-blue-50', icon: 'bg-blue-100', check: 'bg-blue-600' };
  if (color === 'green') return { border: 'border-green-500 bg-green-50', icon: 'bg-green-100', check: 'bg-green-600' };
  if (color === 'purple') return { border: 'border-purple-500 bg-purple-50', icon: 'bg-purple-100', check: 'bg-purple-600' };
  return { border: 'border-slate-300', icon: 'bg-slate-100', check: 'bg-slate-600' };
}

function Spinner() {
  return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export default function NewInspection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState<InspectionFormData>({
    templateId: '', templateCode: '', assetId: '', inspectionName: '',
    scope: '', inspectionDate: '', inspectorId: '', notes: '',
    plannedStartDate: '', plannedEndDate: '',
  });

  // ── Data ──────────────────────────────────────────────────────────────────

  const templatesQ = useQuery({
    queryKey: ['inspection', 'templates'],
    queryFn: () => api.get<Template[]>('/inspection-templates').catch(() => FALLBACK_TEMPLATES),
    staleTime: 5 * 60_000,
  });

  const assetsQ = useQuery({
    queryKey: ['assets', 'list'],
    queryFn: () => api.get<any>('/assets?page=0&size=200').then((r: any) => r?.content ?? r ?? []),
    staleTime: 60_000,
  });

  const inspectorsQ = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/users?role=INSPECTOR').catch(() => []),
    staleTime: 5 * 60_000,
  });

  const templates: Template[] = templatesQ.data ?? FALLBACK_TEMPLATES;
  const assets: any[] = assetsQ.data ?? [];
  const inspectors: { id: string; name: string }[] = inspectorsQ.data ?? [];

  // ── Mutation ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => api.post<{ id: string }>('/inspections', {
      templateId: form.templateId,
      assetId: form.assetId,
      inspectionName: form.inspectionName,
      scope: form.scope,
      inspectionDate: form.inspectionDate || undefined,
      inspectorId: form.inspectorId || undefined,
      notes: form.notes,
      plannedStartDate: form.plannedStartDate || undefined,
      plannedEndDate: form.plannedEndDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/inspections');
    },
  });

  const recommendMutation = useMutation({
    mutationFn: () => api.post<{ templateCode: string; reason: string }>('/inspection-templates/recommend', {
      assetId: form.assetId,
    }),
  });

  const set = <K extends keyof InspectionFormData>(k: K, v: InspectionFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const selectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    set('templateId', t.id);
    set('templateCode', t.code);
  };

  const handleNext = () => {
    if (step === 0 && !selectedTemplate) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const handleRecommend = async () => {
    const result = await recommendMutation.mutateAsync();
    const found = templates.find(t => t.code === result.templateCode);
    if (found) selectTemplate(found);
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] animate-page">

      {/* Main content */}
      <div className="flex-1 p-6 space-y-5 overflow-auto">

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${i <= step ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</p>
                  <p className="text-[10px] text-slate-400">{s.sub}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Select Template */}
        {step === 0 && (
          <>
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 1: Select Inspection Template</h2>
              <p className="text-sm text-slate-500 mt-0.5">Choose the inspection methodology/template that best fits your inspection objective.</p>
            </div>

            {templatesQ.isLoading ? <Spinner /> : (
              <div className="grid grid-cols-3 gap-4">
                {templates.map(t => {
                  const colors = templateColor(t.color);
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={`border-2 rounded-xl p-5 text-left transition-all ${
                        isSelected ? colors.border : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                        </div>
                      </div>

                      <div className={`w-14 h-14 rounded-full ${colors.icon} flex items-center justify-center text-2xl mb-4 mx-auto`}>
                        {t.icon}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 text-center mb-2">{t.name}</h3>
                      <p className="text-xs text-slate-500 text-center mb-4">{t.description}</p>

                      <div className={`rounded-lg p-3 ${isSelected ? 'bg-white/60' : 'bg-slate-50'}`}>
                        <p className="text-xs font-semibold text-slate-700 mb-2">Key Outputs</p>
                        <ul className="space-y-1">
                          {t.outputs.map(o => (
                            <li key={o} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-600">{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Help banner */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-700">Not sure which template to choose?</p>
                <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                  View comparison guide <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={handleNext}
                disabled={!selectedTemplate}
                className="btn-primary text-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* About the Templates */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">About the Templates</h3>
              <div className="grid grid-cols-3 gap-4">
                {templates.map(t => (
                  <div key={t.id} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                      <button className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                        Learn more <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 1: Inspection Details */}
        {step === 1 && (
          <div className="tims-card p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 2: Inspection Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Asset / Tank <span className="text-red-500">*</span></label>
                <Select
                  value={form.assetId}
                  onChange={v => set('assetId', v)}
                  placeholder="Select asset..."
                  options={assets.map((a: any) => ({ id: a.tankId ?? a.id, label: `${a.tankId ?? a.id} – ${a.service ?? a.tankName ?? ''}` }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Name <span className="text-red-500">*</span></label>
                <Input value={form.inspectionName} onChange={v => set('inspectionName', v)} placeholder="e.g., Annual UT Inspection 2024" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Date</label>
                <Input type="date" value={form.inspectionDate} onChange={v => set('inspectionDate', v)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Inspector</label>
                <Select
                  value={form.inspectorId}
                  onChange={v => set('inspectorId', v)}
                  placeholder="Select inspector..."
                  options={inspectors.map(i => ({ id: i.id, label: i.name }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Planned Start Date</label>
                <Input type="date" value={form.plannedStartDate} onChange={v => set('plannedStartDate', v)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Planned End Date</label>
                <Input type="date" value={form.plannedEndDate} onChange={v => set('plannedEndDate', v)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Data & Scope */}
        {step === 2 && (
          <div className="tims-card p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 3: Data & Scope</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Scope <span className="text-red-500">*</span></label>
                <textarea
                  value={form.scope}
                  onChange={e => set('scope', e.target.value)}
                  rows={4}
                  placeholder="Describe the scope of this inspection (e.g., Shell courses 1-5, floor, roof)..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="tims-card p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4">Step 4: Review & Confirm</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Template', selectedTemplate?.name ?? '—'],
                ['Asset', form.assetId || '—'],
                ['Inspection Name', form.inspectionName || '—'],
                ['Inspection Date', form.inspectionDate || '—'],
                ['Planned Start', form.plannedStartDate || '—'],
                ['Planned End', form.plannedEndDate || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-400 mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-slate-800">{v}</p>
                </div>
              ))}
              {form.scope && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Scope</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{form.scope}</p>
                </div>
              )}
            </div>
            {createMutation.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {(createMutation.error as Error).message}
              </div>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-sm">Cancel</button>
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-sm">Back</button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 0 && !selectedTemplate}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn-primary text-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Inspection'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0 border-l border-slate-200 bg-white p-5 space-y-5 overflow-auto">

        {/* Inspection Summary */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Inspection Summary</h3>
          <div className="space-y-2.5">
            {[
              ['Template', selectedTemplate?.name ?? '—'],
              ['Asset', form.assetId || '—'],
              ['Inspection Name', form.inspectionName || '—'],
              ['Scope', form.scope || '—'],
              ['Inspection Date', form.inspectionDate || '—'],
              ['Created By', '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-2">
                <span className="text-xs text-slate-500 shrink-0">{k}</span>
                <span className="text-xs font-medium text-slate-800 text-right">{v === '—' ? <span className="text-slate-400">—</span> : v}</span>
              </div>
            ))}
          </div>

          {!selectedTemplate && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Select a template to get started</p>
            </div>
          )}
        </div>

        {/* Template Comparison */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Template Comparison</h3>
            <button className="text-xs text-blue-600 hover:underline">View Details</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 font-medium pb-2 pr-2">Capability</th>
                  <th className="text-center text-slate-500 font-medium pb-2 px-1">WSE</th>
                  <th className="text-center text-slate-500 font-medium pb-2 px-1">FFS</th>
                  <th className="text-center text-slate-500 font-medium pb-2 px-1">ILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COMPARISON_CAPABILITIES.map(cap => (
                  <tr key={cap.name}>
                    <td className="text-slate-700 py-1.5 pr-2 text-[11px]">{cap.name}</td>
                    <td className="text-center py-1.5 px-1">{cap.wse ? <Check className="w-3.5 h-3.5 text-blue-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="text-center py-1.5 px-1">{cap.ffs ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="text-center py-1.5 px-1">{cap.ils ? <Check className="w-3.5 h-3.5 text-purple-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {[['WSE', 'blue'], ['FFS', 'green'], ['ILS', 'purple']].map(([code, c]) => (
              <div key={code} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full bg-${c}-500`} />
                <span className="text-[10px] text-slate-500">{code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Need Help */}
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Need Help Choosing?</h3>
          <p className="text-xs text-slate-500 mb-3">Our recommendation engine can suggest the best template based on your asset and inspection goals.</p>
          <button
            onClick={handleRecommend}
            disabled={recommendMutation.isPending || !form.assetId}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Lightbulb className="w-4 h-4" />
            {recommendMutation.isPending ? 'Analyzing...' : 'Get Recommendation'}
          </button>
          {!form.assetId && (
            <p className="text-[10px] text-slate-400 mt-1 text-center">Select an asset first</p>
          )}
          {recommendMutation.data && (
            <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
              Recommended: {recommendMutation.data.templateCode} — {recommendMutation.data.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
