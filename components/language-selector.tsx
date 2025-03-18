import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { setCookie } from 'cookies-next';

export default function LanguageSelector() {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  // Get the pathname without the locale prefix
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '');

  const handleLanguageChange = (newLocale: string) => {
    // Set cookie for middleware to use
    setCookie('NEXT_LOCALE', newLocale, { maxAge: 60 * 60 * 24 * 365 });
    
    // Navigate to the same page with the new locale
    const newPath = `/${newLocale}${pathnameWithoutLocale || ''}`;
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('navigation.switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={locale === 'en' ? 'bg-accent' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('ms')}
          className={locale === 'ms' ? 'bg-accent' : ''}
        >
          Bahasa Melayu
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('zh')}
          className={locale === 'zh' ? 'bg-accent' : ''}
        >
          简体中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 