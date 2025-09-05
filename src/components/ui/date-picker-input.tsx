'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, parse, isValid } from 'date-fns';
import { cs } from 'date-fns/locale';

interface DatePickerInputProps {
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'd. M. yyyy',
  className = ''
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  // Convert value to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const [inputValue, setInputValue] = React.useState(
    dateValue ? format(dateValue, 'd. M. yyyy', { locale: cs }) : ''
  );

  React.useEffect(() => {
    setInputValue(dateValue ? format(dateValue, 'd. M. yyyy', { locale: cs }) : '');
  }, [dateValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse the date as user types
    if (val) {
      // Try different formats
      const formats = ['d. M. yyyy', 'd.M.yyyy', 'd/M/yyyy', 'd-M-yyyy'];
      for (const fmt of formats) {
        const parsed = parse(val, fmt, new Date(), { locale: cs });
        if (isValid(parsed)) {
          onChange(parsed);
          break;
        }
      }
    } else {
      onChange(null);
    }
  };

  return (
    <div className={`relative flex ${className}`}>
      <Input
        value={inputValue}
        placeholder={placeholder}
        className="bg-background pr-7"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="absolute top-1/2 right-2.5 size-5 -translate-y-1/2 p-0 hover:bg-transparent"
          >
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Vybrat datum</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onChange(date || null);
              setInputValue(date ? format(date, 'd. M. yyyy', { locale: cs }) : '');
              setOpen(false);
            }}
            locale={cs}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}