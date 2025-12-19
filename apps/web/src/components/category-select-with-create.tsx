'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { Plus, Check, X, FolderPlus, ChevronDown, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface CategorySelectWithCreateProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string, categoryName?: string) => void;
  onCategoryCreated?: (category: Category) => void;
  token: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CategorySelectWithCreate({
  categories,
  value,
  onChange,
  onCategoryCreated,
  token,
  disabled = false,
  placeholder = 'Select or create category',
  className = '',
}: CategorySelectWithCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c._id === value);

  // Filter categories based on search term
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches an existing category
  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === searchTerm.toLowerCase()
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearchTerm('');
        setError('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }

    // Check for duplicate
    const duplicate = categories.find(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setError('Category already exists');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const res = await fetch(`${config.apiUrl}/inventory/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const text = await res.text();
      const newCategory = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(newCategory.message || `Failed to create category (${res.status})`);
      }
      
      // Notify parent of new category
      if (onCategoryCreated) {
        onCategoryCreated(newCategory);
      }

      // Select the new category
      onChange(newCategory._id, newCategory.name);

      // Reset state
      setNewCategoryName('');
      setIsCreating(false);
      setIsOpen(false);
      setSearchTerm('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCreate = async (name: string) => {
    setNewCategoryName(name);
    setIsCreating(true);
    
    // Auto-submit after setting the name
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      setIsSubmitting(true);
      setError('');

      const res = await fetch(`${config.apiUrl}/inventory/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const quickText = await res.text();
      const newCategory = quickText ? JSON.parse(quickText) : {};
      
      if (!res.ok) {
        throw new Error(newCategory.message || `Failed to create category (${res.status})`);
      }
      
      if (onCategoryCreated) {
        onCategoryCreated(newCategory);
      }

      onChange(newCategory._id, newCategory.name);
      setNewCategoryName('');
      setIsCreating(false);
      setIsOpen(false);
      setSearchTerm('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (categoryId: string) => {
    const cat = categories.find((c) => c._id === categoryId);
    onChange(categoryId, cat?.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('', undefined);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          border rounded-md bg-background
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-input'}
          transition-colors
        `}
      >
        <span className={selectedCategory ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              placeholder="Search or type to create..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Category List */}
          <div className="max-h-48 overflow-y-auto">
            {/* No Category Option */}
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            >
              <span className="text-muted-foreground italic">No category</span>
              {!value && <Check className="ml-auto h-4 w-4 text-primary" />}
            </button>

            {/* Existing Categories */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleSelect(cat._id)}
                  className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                >
                  <span>{cat.name}</span>
                  {value === cat._id && <Check className="ml-auto h-4 w-4 text-primary" />}
                </button>
              ))
            ) : categories.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <FolderPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No categories yet</p>
                <p className="text-xs text-muted-foreground">
                  Create your first category below
                </p>
              </div>
            ) : searchTerm && filteredCategories.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matching categories
              </div>
            ) : null}

            {/* Quick Create Option - shows when typing a new name */}
            {searchTerm && !exactMatch && (
              <button
                type="button"
                onClick={() => handleQuickCreate(searchTerm)}
                disabled={isSubmitting}
                className="flex items-center w-full px-3 py-2 text-sm text-left bg-primary/5 hover:bg-primary/10 text-primary border-t transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                <span>Create "{searchTerm}"</span>
              </button>
            )}
          </div>

          {/* Create New Category Section */}
          <div className="border-t">
            {isCreating ? (
              <div className="p-3 space-y-2">
                <Label className="text-xs font-medium">New Category Name</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="e.g., Electronics, Beverages..."
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      } else if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewCategoryName('');
                        setError('');
                      }
                    }}
                    disabled={isSubmitting}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={isSubmitting || !newCategoryName.trim()}
                    className="h-8 px-3"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false);
                      setNewCategoryName('');
                      setError('');
                    }}
                    disabled={isSubmitting}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center w-full px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>Create new category</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
