import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PieChart as PieIcon, BarChart2, ShieldCheck, Users, Shield, Code, Eye, Crown } from 'lucide-react';

export interface TeamMemberRoleItem {
  id: string;
  userId: number;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';
  createdAt?: string;
  name?: string;
  email?: string;
}

interface TeamRoleDistributionChartProps {
  members: TeamMemberRoleItem[];
}

interface RoleStat {
  role: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  icon: typeof ShieldCheck;
  description: string;
}

const ROLE_CONFIGS = [
  {
    role: 'OWNER',
    label: 'Owner',
    color: '#14b8a6', // Teal
    icon: Crown,
    description: 'Full workspace authority & sovereign governance',
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    color: '#38bdf8', // Sky Cyan
    icon: Shield,
    description: 'Member management & security configuration',
  },
  {
    role: 'DEVELOPER',
    label: 'Developer',
    color: '#818cf8', // Indigo
    icon: Code,
    description: 'Workspace engineering & model pipeline access',
  },
  {
    role: 'VIEWER',
    label: 'Viewer',
    color: '#94a3b8', // Slate
    icon: Eye,
    description: 'Read-only audit & observability inspection',
  },
] as const;

export function TeamRoleDistributionChart({ members }: TeamRoleDistributionChartProps) {
  const [chartMode, setChartMode] = useState<'donut' | 'bar'>('donut');

  const roleStats = useMemo<RoleStat[]>(() => {
    const total = members.length;
    const counts: Record<string, number> = {
      OWNER: 0,
      ADMIN: 0,
      DEVELOPER: 0,
      VIEWER: 0,
    };

    members.forEach((m) => {
      const normalizedRole = m.role?.toUpperCase();
      if (normalizedRole === 'OWNER') counts.OWNER++;
      else if (normalizedRole === 'ADMIN') counts.ADMIN++;
      else if (normalizedRole === 'DEVELOPER' || normalizedRole === 'MEMBER') counts.DEVELOPER++;
      else if (normalizedRole === 'VIEWER') counts.VIEWER++;
    });

    return ROLE_CONFIGS.map((cfg) => {
      const count = counts[cfg.role] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        role: cfg.role,
        label: cfg.label,
        count,
        percentage,
        color: cfg.color,
        icon: cfg.icon,
        description: cfg.description,
      };
    });
  }, [members]);

  // Data formatted for Recharts
  const chartData = useMemo(() => {
    return roleStats.map((stat) => ({
      name: stat.label,
      role: stat.role,
      count: stat.count,
      percentage: stat.percentage,
      color: stat.color,
    }));
  }, [roleStats]);

  const activeMembersWithRoles = useMemo(() => {
    return chartData.filter((d) => d.count > 0);
  }, [chartData]);

  if (members.length === 0) {
    return (
      <div className="team-chart-card empty">
        <Users size={20} className="empty-icon" />
        <span>ยังไม่มีข้อมูลสมาชิกสำหรับวิเคราะห์การกระจายบทบาท (Role Distribution)</span>
      </div>
    );
  }

  return (
    <div className="team-chart-card">
      <div className="team-chart-header">
        <div className="team-chart-title-wrap">
          <div className="team-chart-badge">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3>การกระจายบทบาทสมาชิก (Member Role Distribution)</h3>
            <p>สถิติการจัดสรรสิทธิ์และบทบาท (Owner, Admin, Developer, Viewer) ใน Workspace ปัจจุบัน</p>
          </div>
        </div>

        <div className="team-chart-controls">
          <div className="chart-mode-toggle">
            <button
              type="button"
              className={chartMode === 'donut' ? 'active' : ''}
              onClick={() => setChartMode('donut')}
              title="แสดงกราฟวงกลมแบบโดนัท"
              aria-label="Donut Chart"
            >
              <PieIcon size={14} />
              <span>Donut</span>
            </button>
            <button
              type="button"
              className={chartMode === 'bar' ? 'active' : ''}
              onClick={() => setChartMode('bar')}
              title="แสดงกราฟแท่งเปรียบเทียบ"
              aria-label="Bar Chart"
            >
              <BarChart2 size={14} />
              <span>Bar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="team-chart-body">
        {/* Visual Chart Panel */}
        <div className="team-chart-canvas-wrapper">
          <ResponsiveContainer width="100%" height={210}>
            {chartMode === 'donut' ? (
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="team-chart-tooltip">
                        <div className="tooltip-title" style={{ color: data.color }}>
                          <b>{data.name}</b>
                          <span>{data.percentage}%</span>
                        </div>
                        <div className="tooltip-body">
                          <span>จำนวน: {data.count} คน</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={activeMembersWithRoles}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={activeMembersWithRoles.length > 1 ? 4 : 0}
                  dataKey="count"
                  animationDuration={600}
                >
                  {activeMembersWithRoles.map((entry) => (
                    <Cell key={`cell-${entry.role}`} fill={entry.color} stroke="rgba(13, 24, 40, 0.8)" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="team-chart-tooltip">
                        <div className="tooltip-title" style={{ color: data.color }}>
                          <b>{data.name}</b>
                          <span>{data.percentage}%</span>
                        </div>
                        <div className="tooltip-body">
                          <span>จำนวน: {data.count} สมาชิก</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={46}>
                  {chartData.map((entry) => (
                    <Cell key={`bar-${entry.role}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Roles Breakdown Cards Grid */}
        <div className="team-role-cards-grid">
          {roleStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.role}
                className={`team-role-stat-card ${stat.count > 0 ? 'active' : 'empty'}`}
                style={{ borderLeftColor: stat.color }}
              >
                <div className="stat-card-header">
                  <div className="stat-role-info">
                    <span className="stat-role-dot" style={{ backgroundColor: stat.color }} />
                    <Icon size={14} style={{ color: stat.color }} />
                    <b>{stat.label}</b>
                  </div>
                  <span className="stat-percentage" style={{ color: stat.color }}>
                    {stat.percentage}%
                  </span>
                </div>
                <div className="stat-card-value">
                  <span className="count-number">{stat.count}</span>
                  <span className="count-label">สมาชิก</span>
                </div>
                <div className="stat-card-desc">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TeamRoleDistributionChart;
