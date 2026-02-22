'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@smartduka/ui';
import { ImagePlus, X, Loader2, Upload } from 'lucide-react';
import { config } from '@/lib/config';

interface ProductImageUploadProps {
  value?: string; // current image URL
  onChange: (url: string) => void;
  onRemove?: () => void;
  token: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function ProductImageUpload({
  value,
  onChange,
  onRemove,
  token,
  disabled = false,
  size = 'md',
}: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === 'sm'
    ? 'w-20 h-20'
    : 'w-32 h-32';

  const uploadFile = useCallback(async (file: File) => {
    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or GIF');
      return;
    }
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${config.apiUrl}/inventory/products/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || '';
        // Provide user-friendly messages for common errors
        if (msg.includes('api_key') || msg.includes('API key') || msg.includes('Must supply')) {
          throw new Error('Image service not configured. Please contact support.');
        }
        if (res.status === 413) {
          throw new Error('Image too large. Max 5MB allowed.');
        }
        if (res.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        if (res.status === 403) {
          throw new Error('You don\'t have permission to upload images.');
        }
        throw new Error(msg || `Upload failed. Please try again.`);
      }

      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      const message = err.message || 'Upload failed';
      // Clean up technical Cloudinary errors for end users
      if (message.includes('api_key') || message.includes('API key') || message.includes('Must supply')) {
        setError('Image service not configured. Contact support.');
      } else if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
        setError('Network error. Check your connection.');
      } else {
        setError(message);
      }
    } finally {
      setIsUploading(false);
    }
  }, [token, onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = () => {
    onChange('');
    onRemove?.();
    setError('');
  };

  // Has an image
  if (value) {
    return (
      <div className={`relative ${sizeClasses} rounded-lg overflow-hidden border bg-muted group`}>
        <img
          src={value}
          alt="Product"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!disabled && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              className="h-7 w-7 p-0 text-white hover:text-white hover:bg-white/20"
              title="Replace image"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="h-7 w-7 p-0 text-white hover:text-red-300 hover:bg-white/20"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Upload area (no image yet)
  return (
    <div className="space-y-1">
      <div
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`${sizeClasses} rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
              {size === 'sm' ? 'Add image' : 'Click or drop image'}
            </span>
          </>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-500">{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
