"use client";

import { useEffect, useState } from "react";

interface Props {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  label?: string;
}

export default function CategorySelect({ categories, value, onChange, label = "Catégorie" }: Props) {
  const [selected, setSelected] = useState(() => (categories.includes(value) || !value ? value : "Autre"));
  const [customText, setCustomText] = useState(() => (categories.includes(value) || !value ? "" : value));

  // Se resynchronise quand la liste de catégories change (ex: bascule dépense/revenu)
  useEffect(() => {
    setSelected(categories.includes(value) || !value ? value : "Autre");
    setCustomText(categories.includes(value) || !value ? "" : value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleSelectChange = (next: string) => {
    setSelected(next);
    onChange(next === "Autre" ? (customText.trim() || "Autre") : next);
  };

  const handleCustomChange = (next: string) => {
    setCustomText(next);
    onChange(next.trim() || "Autre");
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <select
        value={selected}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <option value="">Sélectionner...</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      {selected === "Autre" && (
        <input
          type="text"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 mt-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          placeholder="Préciser la catégorie (optionnel)"
        />
      )}
    </div>
  );
}
