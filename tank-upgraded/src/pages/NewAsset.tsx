import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ArrowLeft, Upload, X, Check, Info, ChevronRight, Tag
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetFormData {
  tankId: string;
  tankName: string;
  assetType: string;
  assetCategory: string;
  status: string;
  description: string;
  capacity: string;
  capacityUnit: string;
  diameter: string;
  diameterUnit: string;
  height: string;
  heightUnit: string;
  material: string;
  constructionType: string;
  bottomType: string;
  roofType: string;
  shellType: string;
  insulation: string;
  designCode: string;
  designPressure: string;
  designPressureUnit: string;
  designTempMin: string;
  designTempMax: string;
  location: string;
  site: string;
  service: string;
  installationDate: string;
  lastModifiedDate: string;
  commissioningDate: string;
  coatingSystem: string;
  corrosionAllowance: string;
  notes: string;
  tags: string[];
  diagramType: 'vertical' | 'horizontal' | 'spherical' | 'other';
  imageFile?: File;
}

const INITIAL_FORM: AssetFormData = {
  tankId: '', tankName: '', assetType: 'Storage Tank', assetCategory: '',
  status: 'Active', description: '',
  capacity: '', capacityUnit: 'm³', diameter: '', diameterUnit: 'm',
  height: '', heightUnit: 'm', material: '', constructionType: '',
  bottomType: '', roofType: '', shellType: '', insulation: '',
  designCode: '', designPressure: '', designPressureUnit: 'barg',
  designTempMin: '', designTempMax: '',
  location: '', site: '', service: '',
  installationDate: '', lastModifiedDate: '', commissioningDate: '',
  coatingSystem: '', corrosionAllowance: '', notes: '',
  tags: [], diagramType: 'vertical',
};

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(form: AssetFormData, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (!form.tankId.trim()) errors.tankId = 'Tank ID is required';
    if (!form.tankName.trim()) errors.tankName = 'Tank Name is required';
    if (!form.assetType) errors.assetType = 'Asset Type is required';
    if (!form.status) errors.status = 'Status is required';
  }
  if (step === 1) {
    if (!form.capacity) errors.capacity = 'Capacity is required';
    if (!form.diameter) errors.diameter = 'Diameter is required';
    if (!form.height) errors.height = 'Height is required';
    if (!form.material) errors.material = 'Material is required';
    if (!form.constructionType) errors.constructionType = 'Construction Type is required';
    if (!form.bottomType) errors.bottomType = 'Bottom Type is required';
    if (!form.roofType) errors.roofType = 'Roof Type is required';
    if (!form.shellType) errors.shellType = 'Shell Type is required';
  }
  if (step === 2) {
    if (!form.location) errors.location = 'Location is required';
    if (!form.service) errors.service = 'Service is required';
  }
  return errors;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, error, type = 'text', ...rest }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  error?: string; type?: string; [k: string]: unknown;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        error ? 'border-red-400' : 'border-slate-300'
      }`}
      {...rest}
    />
  );
}

function Select({ value, onChange, options, placeholder, error }: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; error?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
        error ? 'border-red-400' : 'border-slate-300'
      }`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function WithUnit({ input, unit, units, onUnitChange }: {
  input: React.ReactNode; unit: string; units: string[]; onUnitChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">{input}</div>
      <select
        value={unit}
        onChange={e => onUnitChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {units.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

const STEPS = [
  { label: 'Basic Information', sub: 'Provide asset details' },
  { label: 'Specifications', sub: 'Define tank specifications' },
  { label: 'Location & Service', sub: 'Set location and service' },
  { label: 'Review & Save', sub: 'Review and create asset' },
];

// ── Diagram types ─────────────────────────────────────────────────────────────

const DIAGRAM_TYPES = [
  { id: 'vertical', label: 'Vertical Tank', icon: '🛢️' },
  { id: 'horizontal', label: 'Horizontal Tank', icon: '⬛' },
  { id: 'spherical', label: 'Spherical Tank', icon: '⚽' },
  { id: 'other', label: 'Other', icon: '···' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function NewAsset() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AssetFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // ── Reference data ────────────────────────────────────────────────────────

  const locationsQ = useQuery({
    queryKey: ['assets', 'locations'],
    queryFn: () => api.get<string[]>('/assets/locations').catch(() => [] as string[]),
    staleTime: 5 * 60_000,
  });

  const categoriesQ = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => api.get<string[]>('/assets/categories').catch(() => [] as string[]),
    staleTime: 5 * 60_000,
  });

  const servicesQ = useQuery({
    queryKey: ['assets', 'services'],
    queryFn: () => api.get<string[]>('/assets/services').catch(() => [] as string[]),
    staleTime: 5 * 60_000,
  });

  const locations: string[] = locationsQ.data ?? [];
  const categories: string[] = categoriesQ.data ?? [];
  const services: string[] = servicesQ.data ?? [];

  // ── Mutation ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const payload = {
        tankId: data.tankId,
        tankName: data.tankName,
        assetType: data.assetType,
        assetCategory: data.assetCategory,
        status: data.status,
        description: data.description,
        capacity: parseFloat(data.capacity) || undefined,
        capacityUnit: data.capacityUnit,
        diameter: parseFloat(data.diameter) || undefined,
        diameterUnit: data.diameterUnit,
        height: parseFloat(data.height) || undefined,
        heightUnit: data.heightUnit,
        material: data.material,
        constructionType: data.constructionType,
        bottomType: data.bottomType,
        roofType: data.roofType,
        shellType: data.shellType,
        insulation: data.insulation,
        designCode: data.designCode,
        designPressure: parseFloat(data.designPressure) || undefined,
        designPressureUnit: data.designPressureUnit,
        designTempMin: parseFloat(data.designTempMin) || undefined,
        designTempMax: parseFloat(data.designTempMax) || undefined,
        location: data.location,
        site: data.site,
        service: data.service,
        installationDate: data.installationDate || undefined,
        commissioningDate: data.commissioningDate || undefined,
        coatingSystem: data.coatingSystem,
        corrosionAllowance: parseFloat(data.corrosionAllowance) || undefined,
        notes: data.notes,
        tags: data.tags,
        diagramType: data.diagramType,
      };
      return api.post<{ id: string }>('/assets', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      navigate('/assets');
    },
  });

  const set = <K extends keyof AssetFormData>(key: K, value: AssetFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const nextStep = () => {
    const errs = validateStep(form, step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => {
    const errs = validateStep(form, step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    createMutation.mutate(form);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', form.tags.filter(t => t !== tag));

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) set('imageFile', file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) set('imageFile', file);
  };

  return (
    <div className="p-6 animate-page">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assets')} className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Asset</h1>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Assets</span>
              <ChevronRight className="w-3 h-3" />
              <span>New Asset</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/assets')} className="btn-secondary text-sm">Cancel</button>
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-primary text-sm"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Asset'}
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-3 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
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

      {/* Content */}
      <div className="grid grid-cols-3 gap-5">

        {/* Main Form */}
        <div className="col-span-2 space-y-5">

          {/* Step 0: Basic Information */}
          {step === 0 && (
            <>
              <Section title="Asset Information">
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Tank ID" required error={errors.tankId}>
                    <Input value={form.tankId} onChange={v => set('tankId', v)} placeholder="e.g., T-101" error={errors.tankId} />
                  </FormField>
                  <FormField label="Tank Name" required error={errors.tankName}>
                    <Input value={form.tankName} onChange={v => set('tankName', v)} placeholder="e.g., Crude Oil Tank" error={errors.tankName} />
                  </FormField>
                  <FormField label="Asset Type" required error={errors.assetType}>
                    <Select value={form.assetType} onChange={v => set('assetType', v)}
                      options={['Storage Tank', 'Process Tank', 'Pressure Vessel', 'Day Tank', 'Surge Tank']}
                      error={errors.assetType}
                    />
                  </FormField>
                  <FormField label="Description">
                    <textarea
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Enter asset description"
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FormField>
                  <FormField label="Asset Category">
                    <Select value={form.assetCategory} onChange={v => set('assetCategory', v)}
                      placeholder="Select category"
                      options={categories.length > 0 ? categories : ['Crude Oil', 'Refined Products', 'Chemicals', 'Water', 'Gas']}
                    />
                  </FormField>
                  <FormField label="Status" required error={errors.status}>
                    <Select value={form.status} onChange={v => set('status', v)}
                      options={['Active', 'Inactive', 'Under Maintenance', 'Decommissioned']}
                      error={errors.status}
                    />
                  </FormField>
                </div>
              </Section>

              <Section title="Tank Specifications">
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Capacity" required error={errors.capacity}>
                    <WithUnit
                      input={<Input value={form.capacity} onChange={v => set('capacity', v)} placeholder="e.g., 5000" error={errors.capacity} />}
                      unit={form.capacityUnit}
                      units={['m³', 'bbl', 'L', 'gal']}
                      onUnitChange={v => set('capacityUnit', v)}
                    />
                  </FormField>
                  <FormField label="Diameter" required error={errors.diameter}>
                    <WithUnit
                      input={<Input value={form.diameter} onChange={v => set('diameter', v)} placeholder="e.g., 20.5" error={errors.diameter} />}
                      unit={form.diameterUnit} units={['m', 'ft', 'mm']}
                      onUnitChange={v => set('diameterUnit', v)}
                    />
                  </FormField>
                  <FormField label="Height" required error={errors.height}>
                    <WithUnit
                      input={<Input value={form.height} onChange={v => set('height', v)} placeholder="e.g., 15.0" error={errors.height} />}
                      unit={form.heightUnit} units={['m', 'ft', 'mm']}
                      onUnitChange={v => set('heightUnit', v)}
                    />
                  </FormField>
                  <FormField label="Material" required error={errors.material}>
                    <Select value={form.material} onChange={v => set('material', v)}
                      placeholder="Select material"
                      options={['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Duplex SS', 'GRP/FRP', 'Aluminium', 'Lined Carbon Steel']}
                      error={errors.material}
                    />
                  </FormField>
                  <FormField label="Construction Type" required error={errors.constructionType}>
                    <Select value={form.constructionType} onChange={v => set('constructionType', v)}
                      placeholder="Select type"
                      options={['Welded', 'Bolted', 'Riveted', 'Cast']}
                      error={errors.constructionType}
                    />
                  </FormField>
                  <FormField label="Bottom Type" required error={errors.bottomType}>
                    <Select value={form.bottomType} onChange={v => set('bottomType', v)}
                      placeholder="Select type"
                      options={['Flat', 'Cone Down', 'Cone Up', 'Dome', 'Hemispherical']}
                      error={errors.bottomType}
                    />
                  </FormField>
                  <FormField label="Roof Type" required error={errors.roofType}>
                    <Select value={form.roofType} onChange={v => set('roofType', v)}
                      placeholder="Select roof type"
                      options={['Cone Roof', 'Floating Roof', 'External Floating Roof', 'Dome Roof', 'Open Top']}
                      error={errors.roofType}
                    />
                  </FormField>
                  <FormField label="Shell Type" required error={errors.shellType}>
                    <Select value={form.shellType} onChange={v => set('shellType', v)}
                      placeholder="Select shell type"
                      options={['Cylindrical', 'Rectangular', 'Spherical', 'Conical']}
                      error={errors.shellType}
                    />
                  </FormField>
                  <FormField label="Insulation">
                    <Select value={form.insulation} onChange={v => set('insulation', v)}
                      placeholder="Select insulation"
                      options={['None', 'Mineral Wool', 'Foam Glass', 'Polyurethane', 'Calcium Silicate']}
                    />
                  </FormField>
                  <FormField label="Design Code / Standard">
                    <Input value={form.designCode} onChange={v => set('designCode', v)} placeholder="e.g., API 650" />
                  </FormField>
                  <FormField label="Design Pressure">
                    <WithUnit
                      input={<Input value={form.designPressure} onChange={v => set('designPressure', v)} placeholder="e.g., 0.5" />}
                      unit={form.designPressureUnit} units={['barg', 'psig', 'kPa', 'MPa']}
                      onUnitChange={v => set('designPressureUnit', v)}
                    />
                  </FormField>
                  <FormField label="Design Temperature">
                    <div className="flex items-center gap-2">
                      <Input value={form.designTempMin} onChange={v => set('designTempMin', v)} placeholder="Min" />
                      <span className="text-sm text-slate-500">°C</span>
                      <Input value={form.designTempMax} onChange={v => set('designTempMax', v)} placeholder="Max" />
                      <span className="text-sm text-slate-500">°C</span>
                    </div>
                  </FormField>
                </div>
              </Section>

              <Section title="Location & Service">
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Location" required error={errors.location}>
                    <Select value={form.location} onChange={v => set('location', v)}
                      placeholder="Select location"
                      options={locations.length > 0 ? locations : ['Rotterdam Terminal A', 'Amsterdam Terminal B', 'Site C']}
                      error={errors.location}
                    />
                  </FormField>
                  <FormField label="Site / Plant">
                    <Input value={form.site} onChange={v => set('site', v)} placeholder="e.g., Refinery Plant 1" />
                  </FormField>
                  <FormField label="Service / Product" required error={errors.service}>
                    <Select value={form.service} onChange={v => set('service', v)}
                      placeholder="Select service"
                      options={services.length > 0 ? services : ['Crude Oil', 'Diesel', 'Gasoline', 'Jet Fuel', 'Water', 'Chemicals']}
                      error={errors.service}
                    />
                  </FormField>
                  <FormField label="Installation Date">
                    <Input type="date" value={form.installationDate} onChange={v => set('installationDate', v)} />
                  </FormField>
                  <FormField label="Last Modified Date">
                    <Input type="date" value={form.lastModifiedDate} onChange={v => set('lastModifiedDate', v)} />
                  </FormField>
                  <FormField label="Commissioning Date">
                    <Input type="date" value={form.commissioningDate} onChange={v => set('commissioningDate', v)} />
                  </FormField>
                </div>
              </Section>

              <Section title="Additional Information" optional>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Coating System">
                    <textarea
                      value={form.coatingSystem}
                      onChange={e => set('coatingSystem', e.target.value)}
                      placeholder="Enter coating details"
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FormField>
                  <FormField label="Corrosion Allowance (mm)">
                    <Input value={form.corrosionAllowance} onChange={v => set('corrosionAllowance', v)} placeholder="e.g., 2.0" />
                  </FormField>
                  <FormField label="Notes">
                    <textarea
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Add any additional notes"
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FormField>
                </div>

                {/* Tags */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="add-tags"
                      checked={true}
                      readOnly
                      className="w-3.5 h-3.5"
                    />
                    <label htmlFor="add-tags" className="text-xs text-slate-600 font-medium">Add Tags</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Enter tags and press enter"
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    />
                    <button onClick={addTag} className="p-1.5 text-blue-600 hover:text-blue-800">
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <Section title="Review Asset Information">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Tank ID', form.tankId], ['Tank Name', form.tankName],
                  ['Asset Type', form.assetType], ['Status', form.status],
                  ['Capacity', form.capacity ? `${form.capacity} ${form.capacityUnit}` : '—'],
                  ['Diameter', form.diameter ? `${form.diameter} ${form.diameterUnit}` : '—'],
                  ['Height', form.height ? `${form.height} ${form.heightUnit}` : '—'],
                  ['Material', form.material || '—'],
                  ['Location', form.location || '—'],
                  ['Service', form.service || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <p className="text-xs text-slate-400 w-32 shrink-0">{k}</p>
                    <p className="text-sm font-medium text-slate-800">{v}</p>
                  </div>
                ))}
              </div>
              {createMutation.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {(createMutation.error as Error).message}
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">

          {/* Image Upload */}
          <div className="tims-card p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Tank Image / Diagram <span className="text-xs text-slate-400 font-normal">(Optional)</span>
            </h3>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300'
              }`}
            >
              {form.imageFile ? (
                <div className="flex items-center gap-2 justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-slate-700">{form.imageFile.name}</p>
                  <button onClick={() => set('imageFile', undefined)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-3">Drag and drop image here<br />or</p>
                  <label className="cursor-pointer px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                    Browse Files
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelect} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-2">Supported formats: JPG, PNG, PDF (Max 10MB)</p>
                </>
              )}
            </div>

            {/* Diagram selector */}
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Quick Add Diagram</p>
              <div className="grid grid-cols-4 gap-2">
                {DIAGRAM_TYPES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => set('diagramType', d.id as AssetFormData['diagramType'])}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center ${
                      form.diagramType === d.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{d.icon}</span>
                    <span className="text-[10px] text-slate-600 leading-tight">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="tims-card p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Summary</h3>
            <div className="space-y-2">
              {[
                ['Tank ID', form.tankId || '—'],
                ['Tank Name', form.tankName || '—'],
                ['Asset Type', form.assetType || '—'],
                ['Capacity', form.capacity ? `${form.capacity} ${form.capacityUnit}` : '—'],
                ['Location', form.location || '—'],
                ['Service', form.service || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-medium text-slate-800 text-right max-w-28 truncate">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {form.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Save the asset to make it available for inspections and analyses.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-200">
        <button
          onClick={() => navigate('/assets')}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={prevStep} className="btn-secondary text-sm">Back</button>
          )}
          {step < 3 ? (
            <button onClick={nextStep} className="btn-primary text-sm">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-primary text-sm"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Asset'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, optional, children }: {
  title: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="tims-card p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">
        {title} {optional && <span className="text-xs text-slate-400 font-normal">(Optional)</span>}
      </h3>
      {children}
    </div>
  );
}
