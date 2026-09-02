import { Accrual } from '@/components/plates/accrual';
import { Hero } from '@/components/plates/hero';
import { NotThis } from '@/components/plates/not-this';
import { Start } from '@/components/plates/start';
import { TheAgent } from '@/components/plates/the-agent';
import { TheReturn } from '@/components/plates/the-return';

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
