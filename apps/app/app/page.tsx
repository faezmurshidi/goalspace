import { redirect } from 'next/navigation';

// Temporary redirect target. The Phase 1 plan builds the real `/projects`
// surface, which will replace this redirect once it exists.
export default function Home() {
  redirect('/login');
}
