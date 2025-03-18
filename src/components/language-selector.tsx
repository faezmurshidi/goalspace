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
import { useAppTranslations } from '@/lib/hooks/use-translations';

export default function LanguageSelector() {
  const { currentLocale, changeLanguage, t } = useAppTranslations();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('navigation.switchLanguage', 'Switch language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={currentLocale === 'en' ? 'bg-accent' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('ms')}
          className={currentLocale === 'ms' ? 'bg-accent' : ''}
        >
          Bahasa Melayu
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('zh')}
          className={currentLocale === 'zh' ? 'bg-accent' : ''}
        >
          简体中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 