/**
 * NewAsset.tsx
 * FIXES APPLIED:
 * - API RESTORED: Reverted the createMutation back to a pure JSON payload (`api.post(..., payload)`) to fix the `@NotBlank` backend parsing errors caused by the multipart FormData wrapper.
 * - VALIDATION UPGRADE: `handleSubmit` now strictly validates ALL steps (0, 1, and 2) before allowing the payload to fire, redirecting the user to the exact step containing the missing field.
 * - DATA SAFETY: Fixed a bug where numeric fields (like temperatures) entered as `0` would be sent as `undefined`.
 * - UX: Retained the vertical sticky right panel, full Step 3 review breakdown, and visual image preview.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ArrowLeft, Upload, X, Check, Info, ChevronRight, Tag, Image as ImageIcon
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

const parseNum = (val: string) => {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
};

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
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
      className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm ${
        error ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'
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
      className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all ${
        error ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'
      }`}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
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
        className="border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors"
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    if (form.imageFile && form.imageFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(form.imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [form.imageFile]);

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
      // Reverted to pure JSON object mapping to satisfy backend @RequestBody
      const payload = {
        tankId: data.tankId.trim(),
        tankName: data.tankName.trim(),
        assetType: data.assetType,
        assetCategory: data.assetCategory,
        status: data.status,
        description: data.description,
        capacity: parseNum(data.capacity),
        capacityUnit: data.capacityUnit,
        diameter: parseNum(data.diameter),
        diameterUnit: data.diameterUnit,
        height: parseNum(data.height),
        heightUnit: data.heightUnit,
        material: data.material,
        constructionType: data.constructionType,
        bottomType: data.bottomType,
        roofType: data.roofType,
        shellType: data.shellType,
        insulation: data.insulation,
        designCode: data.designCode,
        designPressure: parseNum(data.designPressure),
        designPressureUnit: data.designPressureUnit,
        designTempMin: parseNum(data.designTempMin),
        designTempMax: parseNum(data.designTempMax),
        location: data.location,
        site: data.site,
        service: data.service,
        installationDate: data.installationDate || undefined,
        commissioningDate: data.commissioningDate || undefined,
        lastModifiedDate: data.lastModifiedDate || undefined,
        coatingSystem: data.coatingSystem,
        corrosionAllowance: parseNum(data.corrosionAllowance),
        notes: data.notes,
        tags: data.tags,
        diagramType: data.diagramType,
      };

      // Pure JSON post. (Images require a separate multipart endpoint in standard REST setups)
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
    if (Object.keys(errs).length > 0) { 
      setErrors(errs); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }
    setErrors({});
    setStep(s => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    // Failsafe: Validate all steps sequentially to ensure backend receives required data
    const errs0 = validateStep(form, 0);
    const errs1 = validateStep(form, 1);
    const errs2 = validateStep(form, 2);
    const allErrs = { ...errs0, ...errs1, ...errs2 };

    if (Object.keys(allErrs).length > 0) { 
      setErrors(allErrs); 
      if (Object.keys(errs0).length > 0) setStep(0);
      else if (Object.keys(errs1).length > 0) setStep(1);
      else if (Object.keys(errs2).length > 0) setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }

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
    <div className="p-6 animate-page max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/assets')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Create New Asset</h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/assets')}>Assets Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-700">Provision Asset</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/assets')} className="btn-secondary text-sm px-5">Cancel</button>
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-primary text-sm px-6"
            >
              {createMutation.isPending ? 'Provisioning...' : 'Confirm & Save Asset'}
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-3 shrink-0 transition-opacity ${i > step ? 'opacity-50' : 'opacity-100'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${
                i < step ? 'bg-emerald-500 text-white border-none' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100 border-none' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {i < step ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              <div>
                <p className={`text-sm font-bold ${i <= step ? 'text-slate-900' : 'text-slate-500'}`}>{s.label}</p>
                <p className="text-[11px] text-slate-400 font-medium">{s.sub}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-6 rounded-full transition-colors ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">

          {/* Step 0: Basic Information */}
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Section title="Asset Identification">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Tank ID" required error={errors.tankId}>
                    <Input value={form.tankId} onChange={v => set('tankId', v)} placeholder="e.g., T-101" error={errors.tankId} />
                  </FormField>
                  <FormField label="Tank Name" required error={errors.tankName}>
                    <Input value={form.tankName} onChange={v => set('tankName', v)} placeholder="e.g., Main Crude Storage" error={errors.tankName} />
                  </FormField>
                  <FormField label="Asset Type" required error={errors.assetType}>
                    <Select value={form.assetType} onChange={v => set('assetType', v)}
                      options={['Storage Tank', 'Process Tank', 'Pressure Vessel', 'Day Tank', 'Surge Tank']}
                      error={errors.assetType}
                    />
                  </FormField>
                  <FormField label="Asset Category">
                    <Select value={form.assetCategory} onChange={v => set('assetCategory', v)}
                      placeholder="Select a functional category"
                      options={categories.length > 0 ? categories : ['Crude Oil', 'Refined Products', 'Chemicals', 'Water', 'Gas']}
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Description">
                      <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Provide a brief description of the asset's function and location..."
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                      />
                    </FormField>
                  </div>
                </div>
              </Section>
              
              <Section title="Operational Context">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Operational Status" required error={errors.status}>
                    <Select value={form.status} onChange={v => set('status', v)}
                      options={['Active', 'Inactive', 'Under Maintenance', 'Decommissioned']}
                      error={errors.status}
                    />
                  </FormField>
                </div>
              </Section>
            </div>
          )}

          {/* Step 1: Specifications */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Section title="Dimensional Specifications">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField label="Nominal Capacity" required error={errors.capacity}>
                    <WithUnit
                      input={<Input value={form.capacity} onChange={v => set('capacity', v)} placeholder="e.g., 5000" type="number" error={errors.capacity} />}
                      unit={form.capacityUnit}
                      units={['m³', 'bbl', 'L', 'gal']}
                      onUnitChange={v => set('capacityUnit', v)}
                    />
                  </FormField>
                  <FormField label="Diameter" required error={errors.diameter}>
                    <WithUnit
                      input={<Input value={form.diameter} onChange={v => set('diameter', v)} placeholder="e.g., 20.5" type="number" error={errors.diameter} />}
                      unit={form.diameterUnit} units={['m', 'ft', 'mm']}
                      onUnitChange={v => set('diameterUnit', v)}
                    />
                  </FormField>
                  <FormField label="Height" required error={errors.height}>
                    <WithUnit
                      input={<Input value={form.height} onChange={v => set('height', v)} placeholder="e.g., 15.0" type="number" error={errors.height} />}
                      unit={form.heightUnit} units={['m', 'ft', 'mm']}
                      onUnitChange={v => set('heightUnit', v)}
                    />
                  </FormField>
                </div>
              </Section>

              <Section title="Structural & Material Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Primary Material" required error={errors.material}>
                    <Select value={form.material} onChange={v => set('material', v)}
                      placeholder="Select base material"
                      options={['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Duplex SS', 'GRP/FRP', 'Aluminium', 'Lined Carbon Steel']}
                      error={errors.material}
                    />
                  </FormField>
                  <FormField label="Construction Method" required error={errors.constructionType}>
                    <Select value={form.constructionType} onChange={v => set('constructionType', v)}
                      placeholder="Select construction type"
                      options={['Welded', 'Bolted', 'Riveted', 'Cast']}
                      error={errors.constructionType}
                    />
                  </FormField>
                  <FormField label="Shell Type" required error={errors.shellType}>
                    <Select value={form.shellType} onChange={v => set('shellType', v)}
                      placeholder="Select shell architecture"
                      options={['Cylindrical', 'Rectangular', 'Spherical', 'Conical']}
                      error={errors.shellType}
                    />
                  </FormField>
                  <FormField label="Roof Type" required error={errors.roofType}>
                    <Select value={form.roofType} onChange={v => set('roofType', v)}
                      placeholder="Select roof design"
                      options={['Cone Roof', 'Floating Roof', 'External Floating Roof', 'Dome Roof', 'Open Top']}
                      error={errors.roofType}
                    />
                  </FormField>
                  <FormField label="Bottom Type" required error={errors.bottomType}>
                    <Select value={form.bottomType} onChange={v => set('bottomType', v)}
                      placeholder="Select bottom plate design"
                      options={['Flat', 'Cone Down', 'Cone Up', 'Dome', 'Hemispherical']}
                      error={errors.bottomType}
                    />
                  </FormField>
                  <FormField label="External Insulation">
                    <Select value={form.insulation} onChange={v => set('insulation', v)}
                      placeholder="Select insulation type (if applicable)"
                      options={['None', 'Mineral Wool', 'Foam Glass', 'Polyurethane', 'Calcium Silicate']}
                    />
                  </FormField>
                </div>
              </Section>

              <Section title="Engineering & Design Limits">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Design Code / Standard">
                    <Input value={form.designCode} onChange={v => set('designCode', v)} placeholder="e.g., API 650, EN 14015" />
                  </FormField>
                  <FormField label="Design Pressure">
                    <WithUnit
                      input={<Input value={form.designPressure} onChange={v => set('designPressure', v)} placeholder="e.g., 0.5" type="number" />}
                      unit={form.designPressureUnit} units={['barg', 'psig', 'kPa', 'MPa']}
                      onUnitChange={v => set('designPressureUnit', v)}
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Operating Temperature Limits">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                          <Input value={form.designTempMin} onChange={v => set('designTempMin', v)} placeholder="Min Temp" type="number" />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">°C</span>
                        </div>
                        <span className="text-slate-400 font-medium">to</span>
                        <div className="flex-1 relative">
                          <Input value={form.designTempMax} onChange={v => set('designTempMax', v)} placeholder="Max Temp" type="number" />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">°C</span>
                        </div>
                      </div>
                    </FormField>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Step 2: Location & Service */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Section title="Location Context">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Facility Location" required error={errors.location}>
                    <Select value={form.location} onChange={v => set('location', v)}
                      placeholder="Select geographical location"
                      options={locations.length > 0 ? locations : ['Rotterdam Terminal A', 'Amsterdam Terminal B', 'Site C']}
                      error={errors.location}
                    />
                  </FormField>
                  <FormField label="Site / Plant Area">
                    <Input value={form.site} onChange={v => set('site', v)} placeholder="e.g., Refinery Area 4" />
                  </FormField>
                  <FormField label="Service / Product Stored" required error={errors.service}>
                    <Select value={form.service} onChange={v => set('service', v)}
                      placeholder="Select primary product"
                      options={services.length > 0 ? services : ['Crude Oil', 'Diesel', 'Gasoline', 'Jet Fuel', 'Water', 'Chemicals']}
                      error={errors.service}
                    />
                  </FormField>
                </div>
              </Section>

              <Section title="Lifecycle & Maintenance Dates">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Installation Date">
                    <Input type="date" value={form.installationDate} onChange={v => set('installationDate', v)} />
                  </FormField>
                  <FormField label="Commissioning Date">
                    <Input type="date" value={form.commissioningDate} onChange={v => set('commissioningDate', v)} />
                  </FormField>
                  <FormField label="Last Major Modification">
                    <Input type="date" value={form.lastModifiedDate} onChange={v => set('lastModifiedDate', v)} />
                  </FormField>
                </div>
              </Section>

              <Section title="Integrity Details" optional>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <FormField label="Coating / Lining System">
                      <textarea
                        value={form.coatingSystem}
                        onChange={e => set('coatingSystem', e.target.value)}
                        placeholder="Detail internal and external coating specifications..."
                        rows={2}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                      />
                    </FormField>
                  </div>
                  <FormField label="Corrosion Allowance (mm)">
                    <Input value={form.corrosionAllowance} onChange={v => set('corrosionAllowance', v)} placeholder="e.g., 2.0" type="number" />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Additional Notes">
                      <textarea
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Add any additional contextual notes for inspectors..."
                        rows={2}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Tags Engine */}
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <FormField label="Asset Search Tags">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        placeholder="Type tag and press enter..."
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 shadow-sm"
                      />
                      <button onClick={addTag} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Add Tag
                      </button>
                    </div>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        {form.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-md text-xs font-semibold shadow-sm">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </FormField>
                </div>
              </Section>
            </div>
          )}

          {/* Step 3: Complete Review */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <Section title="Final Review: Asset Provisioning Document">
                <p className="text-xs text-slate-500 mb-5 pb-4 border-b border-slate-100">
                  Please review all attributes carefully. Once committed, structural base dimensions require Engineering Manager approval to modify.
                </p>
                
                <div className="space-y-8">
                  {/* Category 1: ID & Status */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Identity & Status
                    </h4>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <ReviewRow label="Asset ID" value={form.tankId} />
                      <ReviewRow label="Asset Name" value={form.tankName} />
                      <ReviewRow label="Type & Category" value={`${form.assetType} ${form.assetCategory ? `(${form.assetCategory})` : ''}`} />
                      <ReviewRow label="Operational Status" value={form.status} highlight={form.status !== 'Active'} />
                      <div className="col-span-2">
                        <ReviewRow label="Description" value={form.description} />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Specifications */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Technical Specifications
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <ReviewRow label="Capacity" value={form.capacity ? `${form.capacity} ${form.capacityUnit}` : null} />
                      <ReviewRow label="Diameter" value={form.diameter ? `${form.diameter} ${form.diameterUnit}` : null} />
                      <ReviewRow label="Height" value={form.height ? `${form.height} ${form.heightUnit}` : null} />
                      <ReviewRow label="Material" value={form.material} />
                      <ReviewRow label="Construction" value={form.constructionType} />
                      <ReviewRow label="Insulation" value={form.insulation} />
                      <ReviewRow label="Roof Type" value={form.roofType} />
                      <ReviewRow label="Shell Type" value={form.shellType} />
                      <ReviewRow label="Bottom Type" value={form.bottomType} />
                    </div>
                  </div>

                  {/* Category 3: Design & Environment */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span> Engineering & Location
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <ReviewRow label="Design Code" value={form.designCode} />
                      <ReviewRow label="Pressure Limits" value={form.designPressure ? `${form.designPressure} ${form.designPressureUnit}` : null} />
                      <ReviewRow label="Temp Range" value={form.designTempMin || form.designTempMax ? `${form.designTempMin || '?'}°C to ${form.designTempMax || '?'}°C` : null} />
                      <ReviewRow label="Location" value={form.location} />
                      <ReviewRow label="Plant Site" value={form.site} />
                      <ReviewRow label="Stored Service" value={form.service} />
                      <ReviewRow label="Commissioned" value={form.commissioningDate} />
                      <ReviewRow label="Corrosion Allow." value={form.corrosionAllowance ? `${form.corrosionAllowance} mm` : null} />
                    </div>
                  </div>
                </div>

                {createMutation.error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-800">Submission Failed</h4>
                      <p className="text-xs text-red-700 mt-1">{(createMutation.error as Error).message}</p>
                    </div>
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>

        {/* Right Panel (Sticky Container) */}
        <div className="lg:col-span-1 relative">
          <div className="sticky top-6 space-y-6">

            {/* Image Upload */}
            <div className="tims-card p-5 border-t-4 border-t-blue-600">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Asset Diagram / Blueprint
              </h3>
              <p className="text-xs text-slate-500 mb-4">Upload structural schematics or photographs. <span className="italic">(Optional)</span></p>
              
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-1 relative overflow-hidden transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {form.imageFile ? (
                  <div className="relative group rounded-lg overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-slate-200">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <p className="text-xs font-bold text-white mb-2 px-2 text-center line-clamp-1">{form.imageFile.name}</p>
                      <button onClick={() => set('imageFile', undefined)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Upload className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                    <p className="text-xs font-medium text-slate-700 mb-1">Drag and drop file here</p>
                    <p className="text-[10px] text-slate-400 mb-4">Supported: JPG, PNG, PDF (Max 10MB)</p>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 shadow-sm text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                      Browse Files
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* Diagram selector */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-3">Quick Add Structural Template</p>
                <div className="grid grid-cols-2 gap-2">
                  {DIAGRAM_TYPES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => set('diagramType', d.id as AssetFormData['diagramType'])}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                        form.diagramType === d.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-lg shrink-0">{d.icon}</span>
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Summary Box */}
            <div className="tims-card p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Live Summary
              </h3>
              <div className="space-y-3">
                {[
                  ['Tank ID', form.tankId || '—'],
                  ['Type', form.assetType || '—'],
                  ['Capacity', form.capacity ? `${form.capacity} ${form.capacityUnit}` : '—'],
                  ['Location', form.location || '—'],
                  ['Service', form.service || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <span className="text-xs text-slate-500">{k}</span>
                    <span className="text-xs font-bold text-slate-800 text-right max-w-28 truncate">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    form.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {form.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
        <button onClick={() => navigate('/assets')} className="btn-secondary text-sm px-6 py-2.5 shadow-sm">
          Discard Draft
        </button>
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={prevStep} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={nextStep} className="btn-primary text-sm px-8 py-2.5 shadow-md flex items-center gap-2">
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-primary text-sm px-8 py-2.5 shadow-md bg-emerald-600 hover:bg-emerald-700 border-emerald-600 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                'Provisioning...'
              ) : (
                <><Check className="w-4 h-4" /> Confirm & Provision</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI Components ──────────────────────────────────────────────────────

function Section({ title, optional, children }: {
  title: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
      <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
        {title} 
        {optional && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded ml-2">Optional</span>}
      </h3>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, highlight = false }: { label: string, value: string | null, highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
      <span className={`text-sm font-semibold ${!value ? 'text-slate-300 italic font-normal' : highlight ? 'text-red-600' : 'text-slate-800'}`}>
        {value || 'Not provided'}
      </span>
    </div>
  );
}