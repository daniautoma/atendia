'use client';

import React, { useState } from 'react';
import { Search, MapPin, Briefcase, Filter, Loader2, RotateCcw } from 'lucide-react';
import { EL_SALVADOR_DEPARTMENTS, RADAR_NICHES } from '@/lib/radar/elSalvadorGeo';

interface SearchParams {
  department: string;
  municipality: string;
  niche: string;
  q: string;
}

interface RadarSearchBarProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  initialParams?: Partial<SearchParams>;
}

const ALL_PRESET_NICHES = RADAR_NICHES.flatMap((c) => c.items);

export function RadarSearchBar({ onSearch, isLoading, initialParams }: RadarSearchBarProps) {
  const resolveDeptId = (deptNameOrId?: string) => {
    if (!deptNameOrId) return 'san_salvador';
    const match = EL_SALVADOR_DEPARTMENTS.find(
      (d) => d.id === deptNameOrId || d.name.toLowerCase() === deptNameOrId.toLowerCase()
    );
    return match?.id || 'san_salvador';
  };

  const initialNicheVal = initialParams?.niche || 'Clínicas Dentales y Odontología';
  const isPresetNiche = ALL_PRESET_NICHES.includes(initialNicheVal);

  const [department, setDepartment] = useState(resolveDeptId(initialParams?.department));
  const [municipality, setMunicipality] = useState(
    initialParams?.municipality ?? 'San Salvador Centro'
  );
  const [niche, setNiche] = useState(
    isPresetNiche ? initialNicheVal : 'Clínicas Dentales y Odontología'
  );
  const [customNiche, setCustomNiche] = useState(isPresetNiche ? '' : initialNicheVal);
  const [q, setQ] = useState(initialParams?.q || '');

  // Encontrar municipios según el departamento seleccionado
  const currentDeptObj = EL_SALVADOR_DEPARTMENTS.find((d) => d.id === department);
  const municipalities = currentDeptObj?.municipalities || [];
  const effectiveMunicipality =
    !municipality || municipalities.includes(municipality)
      ? municipality
      : municipalities[0] || '';

  const handleDepartmentChange = (nextDeptId: string) => {
    setDepartment(nextDeptId);
    const nextMunicipalities =
      EL_SALVADOR_DEPARTMENTS.find((d) => d.id === nextDeptId)?.municipalities || [];
    if (municipality && nextMunicipalities.length > 0 && !nextMunicipalities.includes(municipality)) {
      setMunicipality(nextMunicipalities[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveNiche = customNiche.trim() ? customNiche.trim() : niche;
    onSearch({
      department: currentDeptObj?.name || 'San Salvador',
      municipality: effectiveMunicipality || '',
      niche: effectiveNiche,
      q: q.trim(),
    });
  };

  const handleReset = () => {
    setDepartment('san_salvador');
    setMunicipality('San Salvador Centro');
    setNiche('Clínicas Dentales y Odontología');
    setCustomNiche('');
    setQ('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl backdrop-blur-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Departamento */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Departamento (SV)
          </label>
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          >
            {EL_SALVADOR_DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Municipio */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Municipio / Zona
          </label>
          <select
            value={effectiveMunicipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          >
            <option value="">Todo el departamento</option>
            {municipalities.map((mun) => (
              <option key={mun} value={mun}>
                {mun}
              </option>
            ))}
          </select>
        </div>

        {/* Nicho comercial */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-violet-400" />
            Sector / Nicho
          </label>
          <select
            value={niche}
            onChange={(e) => {
              setNiche(e.target.value);
              setCustomNiche('');
            }}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          >
            {RADAR_NICHES.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="text"
            placeholder="O escribe un nicho personalizado..."
            value={customNiche}
            onChange={(e) => setCustomNiche(e.target.value)}
            className="mt-1.5 w-full px-2.5 py-1 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Búsqueda libre o nombre específico */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            Nombre o palabra clave (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Clínica Dental Escalón..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Google Places API (New) · Región: El Salvador (SV)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Explorando radar...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Escanear Negocios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

