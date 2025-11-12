'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@smartduka/ui';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      title={`Switch to ${i18n.language === 'en' ? 'Kiswahili' : 'English'}`}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {i18n.language === 'en' ? 'English' : 'Kiswahili'}
      </span>
      <span className="sm:hidden">{i18n.language.toUpperCase()}</span>
    </Button>
  );
}
