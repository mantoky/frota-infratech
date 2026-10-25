'use client';

import { FilterType } from '@/types';

interface FilterButton {
  value: FilterType;
  label: string;
  count: number;
}

interface FilterBarsProps {
  counts: {
    all: number;
    disp: number;
    uso: number;
    lav: number;
    man: number;
    atencao: number;
  };
  active: FilterType;
  currentLang: string;
  label: (key: string, lang: string) => string;
  onSelect: (value: FilterType) => void;
}

const BARRA_1: {
  value: FilterType;
  labelKey: string;
  countKey: keyof FilterBarsProps['counts'];
}[] = [
  { value: 'all', labelKey: 'statAll', countKey: 'all' },
  { value: 'disp', labelKey: 'statAvailable', countKey: 'disp' },
  { value: 'uso', labelKey: 'statInUse', countKey: 'uso' },
];

const BARRA_2: {
  value: FilterType;
  labelKey: string;
  countKey: keyof FilterBarsProps['counts'];
}[] = [
  { value: 'lav', labelKey: 'statWash', countKey: 'lav' },
  { value: 'man', labelKey: 'statMaintenance', countKey: 'man' },
  { value: 'atencao', labelKey: 'statAttention', countKey: 'atencao' },
];

function Botao({
  item,
  active,
  onSelect,
}: {
  item: FilterButton;
  active: boolean;
  onSelect: (value: FilterType) => void;
}) {
  return (
    <label className={`filter-bars__btn filter-bars__btn--${item.value}`}>
      <input
        type="radio"
        name="frota-situacao"
        value={item.value}
        checked={active}
        onChange={() => onSelect(item.value)}
      />
      <span className="filter-bars__name">{item.label}</span>
      <span className="filter-bars__count">{item.count}</span>
    </label>
  );
}

export default function FilterBars({
  counts,
  active,
  currentLang,
  label,
  onSelect,
}: FilterBarsProps) {
  const montar = (
    linha: { value: FilterType; labelKey: string; countKey: keyof FilterBarsProps['counts'] }[]
  ): FilterButton[] =>
    linha.map((item) => ({
      value: item.value,
      label: label(item.labelKey, currentLang),
      count: counts[item.countKey],
    }));

  return (
    <div className="filter-bars" role="radiogroup" aria-label="Filtrar frota por situação">
      <div className="filter-bars__rail">
        {montar(BARRA_1).map((item) => (
          <Botao key={item.value} item={item} active={active === item.value} onSelect={onSelect} />
        ))}
      </div>
      <div className="filter-bars__rail">
        {montar(BARRA_2).map((item) => (
          <Botao key={item.value} item={item} active={active === item.value} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
