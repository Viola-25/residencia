/// <reference types="vite/client" />

declare module 'lucide-react' {
  import type { FC, SVGAttributes } from 'react'

  interface LucideProps extends SVGAttributes<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }

  export type Icon = FC<LucideProps>
  export type LucideIcon = FC<LucideProps>

  export const Activity: Icon
  export const AlertCircle: Icon
  export const AlertTriangle: Icon
  export const Award: Icon
  export const BarChart3: Icon
  export const BookOpen: Icon
  export const Bookmark: Icon
  export const Brain: Icon
  export const Calendar: Icon
  export const CalendarCheck: Icon
  export const CalendarDays: Icon
  export const CheckCircle2: Icon
  export const CheckSquare: Icon
  export const ChevronLeft: Icon
  export const ChevronRight: Icon
  export const ClipboardList: Icon
  export const Clock: Icon
  export const Database: Icon
  export const FileText: Icon
  export const Filter: Icon
  export const Flag: Icon
  export const Globe: Icon
  export const GraduationCap: Icon
  export const Grid: Icon
  export const HelpCircle: Icon
  export const Home: Icon
  export const Info: Icon
  export const Layout: Icon
  export const LayoutDashboard: Icon
  export const Lightbulb: Icon
  export const LineChart: Icon
  export const List: Icon
  export const Loader: Icon
  export const Loader2: Icon
  export const LogOut: Icon
  export const Menu: Icon
  export const Minus: Icon
  export const Moon: Icon
  export const MoreHorizontal: Icon
  export const PieChart: Icon
  export const Plus: Icon
  export const Radio: Icon
  export const RefreshCw: Icon
  export const Save: Icon
  export const Search: Icon
  export const Settings: Icon
  export const Share2: Icon
  export const Shield: Icon
  export const Sliders: Icon
  export const Sparkles: Icon
  export const Star: Icon
  export const Sun: Icon
  export const Target: Icon
  export const Trash2: Icon
  export const TrendingDown: Icon
  export const TrendingUp: Icon
  export const Trophy: Icon
  export const Tv: Icon
  export const User: Icon
  export const Users: Icon
  export const Video: Icon
  export const Volume2: Icon
  export const Watch: Icon
  export const XCircle: Icon
  export const Zap: Icon
}
