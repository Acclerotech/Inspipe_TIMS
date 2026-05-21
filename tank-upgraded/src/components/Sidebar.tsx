import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, FileText,
  BarChart2, FlaskConical, BookOpen, Shield, Bell, Activity,
  Database, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../auth/permissions';

interface NavItemDef {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  children?: { to: string; label: string; isAction?: boolean }[];
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },

  {
    to: '/assets',
    icon: Package,
    label: 'Assets',
    children: [
      { to: '/assets', label: 'Asset List' },
      { to: '/assets/new', label: 'New Asset', isAction: true },
    ]
  },

  {
    to: '/inspections',
    icon: ClipboardList,
    label: 'Inspections',
    children: [
      { to: '/inspections', label: 'Inspection List' },
      { to: '/inspections/new', label: 'New Inspection', isAction: true },
    ]
  },

  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/heatmap', icon: BarChart2, label: 'Visualizations' },
  { to: '/planner', icon: FlaskConical, label: 'Analysis' },
  { to: '/report', icon: BookOpen, label: 'Reports' },
  { to: '/dashboard', icon: Shield, label: 'Compliance' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  
  // 🔥 UPDATED: Converted to a nested menu for the new Job workflow
  { 
    to: '/jobs', 
    icon: Database, 
    label: 'Data Ingestion',
    children: [
      { to: '/jobs', label: 'Job Dashboard' },
      { to: '/upload', label: 'New Upload', isAction: true },
    ]
  },
  
  { to: '/admin', icon: Settings, label: 'Admin' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>('Assets');

  const role = user?.role;

  const toggleExpand = (label: string) => {
    setExpandedItem(prev => (prev === label ? null : label));
  };

  // 🔥 FILTER NAV ITEMS BASED ON ROLE
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS
      .filter(item => canAccess(role, item.to))
      .map(item => {
        if (!item.children) return item;

        const filteredChildren = item.children.filter(child =>
          canAccess(role, child.to)
        );

        return {
          ...item,
          children: filteredChildren
        };
      });
  }, [role]);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } shrink-0 bg-[#0f1729] flex flex-col h-screen sticky top-0 z-20 transition-all duration-200`}
    >

      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-700/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>

        {!collapsed && (
          <div>
            <p className="text-white font-bold text-[12px] tracking-wider">
              INLINE TANK
            </p>
            <p className="text-white font-bold text-[12px] tracking-wider">
              INSPECTION
            </p>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map(({ to, icon: Icon, label, badge, children }) => {
          const isExpanded = expandedItem === label;
          const hasChildren = !!children?.length;

          // CHILD MENU
          if (hasChildren && !collapsed) {
            return (
              <div key={label}>
                <button
                  onClick={() => toggleExpand(label)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded text-slate-300 hover:text-white hover:bg-slate-700/40 transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 text-xs text-left">{label}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
                            isActive
                              ? 'text-white bg-blue-600/80 font-medium'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                          }`
                        }
                      >
                        {child.isAction && <Plus className="w-3 h-3" />}
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // SINGLE ITEM
          return (
            <NavLink
              key={to + label}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded transition-colors relative ${
                  isActive
                    ? 'text-white bg-blue-600 font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />

              {!collapsed && (
                <span className="text-xs flex-1">{label}</span>
              )}

              {!collapsed && badge !== undefined && (
                <span className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {badge}
                </span>
              )}

              {collapsed && badge !== undefined && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-3 border-t border-slate-700/40">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs py-1"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}