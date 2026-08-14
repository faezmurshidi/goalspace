import { Hero } from '@/components/plates/hero';
import { TheReturn } from '@/components/plates/the-return';
import { Accrual } from '@/components/plates/accrual';
import { NotThis } from '@/components/plates/not-this';
import { TheAgent } from '@/components/plates/the-agent';
import { Start } from '@/components/plates/start';

export default function LocalizedHome() {
  return (
    <main>
      <Hero />
      <TheReturn />
      <Accrual />
      <NotThis />
      <TheAgent />
      <Start />
    </main>
  );
}
