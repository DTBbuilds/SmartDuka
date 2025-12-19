"use client";

import { useEffect, useState } from "react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
}

interface CategorySelectorProps {
  token: string;
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
}

export function CategorySelector({ token, value, onChange, placeholder = "Select category (optional)" }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/inventory/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [token]);

  const renderCategoryOptions = (cats: Category[], level = 0) => {
    return cats.map((cat) => (
      <option key={cat._id} value={cat._id}>
        {level > 0 && '  '.repeat(level)}
        {cat.name}
      </option>
    ));
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-950 disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      <option value="">None (No category)</option>
      {renderCategoryOptions(categories)}
    </select>
  );
}
