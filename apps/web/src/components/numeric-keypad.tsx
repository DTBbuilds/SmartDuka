'use client';

import { Button } from '@smartduka/ui';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  onInput: (digit: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  onInput,
  onClear,
  disabled = false,
}: NumericKeypadProps) {
  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', ''],
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {digits.map((row, rowIdx) => (
        <div key={rowIdx} className="contents">
          {row.map((digit, colIdx) => (
            <div key={`${rowIdx}-${colIdx}`}>
              {digit === '' ? (
                <div />
              ) : (
                <Button
                  type="button"
                  onClick={() => onInput(digit)}
                  disabled={disabled}
                  className="w-full h-12 text-lg font-semibold"
                  variant="outline"
                >
                  {digit}
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        onClick={onClear}
        disabled={disabled}
        variant="outline"
        className="col-span-3 h-12"
      >
        <Delete className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
}
