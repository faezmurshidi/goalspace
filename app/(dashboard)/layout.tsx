type DashboardLayoutProps = {
  children: React.ReactNode;
  stats: React.ReactNode;
}

export default function DashboardLayout({
  children,
  stats
}: DashboardLayoutProps) {
  return children;
}