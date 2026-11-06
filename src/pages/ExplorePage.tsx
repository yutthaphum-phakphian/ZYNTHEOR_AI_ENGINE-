// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  PenLine,
  Brain,
  BarChart3,
  Wrench,
  Search,
  Sparkles,
  ChevronRight,
  ArrowRight,
  FileText,
  Lightbulb,
  GraduationCap,
  Database,
  Layers,
  Compass,
  Menu
} from 'lucide-react';
import { type CapabilityId } from '../lib/capabilityEngine';
import { ExploreCapabilitiesSkeleton } from '../components/ExploreCapabilitiesSkeleton';

export interface CapabilityGroup {
  id: string;
  title: string;
  titleThai: string;
  icon: any;
  color: string;
  description: string;
  capabilities: CapabilityId[];
  presetPrompts: string[];
}

export const EXPLORE_CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    id: 'research',
    title: 'Research & Discovery',
    titleThai: 'การค้นคว้าและสืบค้นเชิงลึก',
    icon: Search,
    color: '#38bdf8',
    description: 'ค้นคว้าข้อมูลเชิงลึก ตรวจสอบข้อเท็จจริง และสังเคราะห์องค์ความรู้จากแหล่งข้อมูลจริงที่ตรวจสอบความถูกต้องได้',
    capabilities: ['KNOWLEDGE_RESEARCH'] as CapabilityId[],
    presetPrompts: [
      'ค้นคว้าและสรุปแนวโน้มสถาปัตยกรรม Sovereign AI Platform ปี 2026',
      'สืบค้นข้อมูลมาตรฐานความมั่นคงปลอดภัยไซเบอร์และหลักฐานดิจิทัล',
      'เปรียบเทียบมาตรฐานการเข้ารหัสต้านทานควอนตัม (Post-Quantum Cryptography)'
    ]
  },
  {
    id: 'reasoning',
    title: 'Reasoning & Analysis',
    titleThai: 'การคิดเชิงเหตุผลและการวิเคราะห์ตรรกะ',
    icon: Brain,
    color: '#a78bfa',
    description: 'การคิดเชิงตรรกะแบบเป็นขั้นตอน วิเคราะห์ความสัมพันธ์ เปรียบเทียบข้อดีข้อเสีย และสนับสนุนการตัดสินใจเชิงระบบ',
    capabilities: ['REASONING'] as CapabilityId[],
    presetPrompts: [
      'วิเคราะห์ Trade-offs สถาปัตยกรรมแยกระหว่าง Shared Core กับ Multi-Client App',
      'ประเมินความเสี่ยงและมาตรการควบคุมความปลอดภัยในการอนุมานโมเดล',
      'แก้โจทย์ปัญหาเชิงตรรกะและโครงสร้างขั้นตอนการทำงานที่ซับซ้อน'
    ]
  },
  {
    id: 'creative',
    title: 'Creative Intelligence',
    titleThai: 'ปัญญาประดิษฐ์เชิงสร้างสรรค์',
    icon: Lightbulb,
    color: '#fb923c',
    description: 'ระดมความคิดและคิดคอนเซปต์ใหม่ ออกแบบกลยุทธ์ และค้นหาแนวทางแก้ไขปัญหาที่สร้างสรรค์และไม่ซ้ำแบบใคร',
    capabilities: ['CREATIVITY'] as CapabilityId[],
    presetPrompts: [
      'ช่วยคิดคอนเซปต์ผลิตภัณฑ์ใหม่ที่เน้น First-Party Intelligence Ownership',
      'ระดมไอเดียการจัดแคมเปญเปิดตัว Universal Intelligence Workspace',
      'ออกแบบแนวทางการสื่อสารคุณค่าของ Sovereign AI ให้เข้าใจง่าย'
    ]
  },
  {
    id: 'writing',
    title: 'Writing & Communication',
    titleThai: 'การเขียนและการสื่อสาร',
    icon: PenLine,
    color: '#fb7185',
    description: 'เรียบเรียงบทความ เขียนเอกสารทางการ รายงานวิชาการ จดหมายธุรกิจ และการแปลภาษาอย่างประณีตและสละสลวย',
    capabilities: ['WRITING_TRANSLATION'] as CapabilityId[],
    presetPrompts: [
      'เขียนบทความวิชาการอธิบายสถาปัตยกรรม Microservices และ Fail-Closed',
      'แปลข้อความภาษาอังกฤษเป็นภาษาไทยอย่างเป็นทางการและถูกต้องตามบริบท',
      'ร่างข้อเสนอโครงการและบันทึกข้อตกลงความร่วมมือทางเทคโนโลยี'
    ]
  },
  {
    id: 'learning',
    title: 'Knowledge & Learning',
    titleThai: 'องค์ความรู้และการเรียนรู้',
    icon: GraduationCap,
    color: '#34d399',
    description: 'อธิบายแนวคิดยากๆ ให้เข้าใจง่าย จัดทำโครงร่างการเรียนรู้ (Curriculum) สรุปใจความสำคัญ และทดสอบความเข้าใจ',
    capabilities: ['EDUCATION'] as CapabilityId[],
    presetPrompts: [
      'อธิบายหลักการทำงานของ Transformer Model และ Attention Mechanism',
      'สร้างแผนการเรียนรู้ 4 สัปดาห์สำหรับความเข้าใจ System Architecture',
      'สรุปและตอบคำถามเชิงลึกเกี่ยวกับวิทยาการคอมพิวเตอร์และคณิตศาสตร์'
    ]
  },
  {
    id: 'technical',
    title: 'Technical Intelligence',
    titleThai: 'ปัญญาประดิษฐ์เชิงเทคนิคและวิศวกรรม',
    icon: Wrench,
    color: '#00D9A3',
    description: 'ออกแบบระบบ สถาปัตยกรรมคลาวด์ ตรวจสอบโค้ด ค้นหาและแก้ไขบั๊ก พร้อมคำแนะนำด้านความปลอดภัยและการทดสอบ',
    capabilities: ['TECHNICAL_ASSISTANCE'] as CapabilityId[],
    presetPrompts: [
      'เขียน TypeScript React Custom Hook พร้อม AbortSignal cancellation',
      'ตรวจสอบข้อผิดพลาดด้าน Path Traversal และ Symlink Protection',
      'ออกแบบโครงสร้าง RESTful API และ Authorization Boundary'
    ]
  },
  {
    id: 'data',
    title: 'Data Intelligence',
    titleThai: 'การประมวลผลและการวิเคราะห์ข้อมูล',
    icon: BarChart3,
    color: '#60a5fa',
    description: 'วิเคราะห์โครงสร้างข้อมูล ตัวเลข สถิติ แนวโน้ม และออกแบบ Schema ฐานข้อมูลเชิงสัมพันธ์ให้เหมาะสมกับงาน',
    capabilities: ['DATA_ANALYSIS'] as CapabilityId[],
    presetPrompts: [
      'วิเคราะห์แนวโน้มและสรุปตัวชี้วัดสำคัญ (Key Metrics) จากข้อมูล',
      'ออกแบบ Schema ฐานข้อมูลเชิงสัมพันธ์ PostgreSQL สำหรับระบบองค์กร',
      'ตรวจสอบความสอดคล้องของข้อมูลและการกระจายตัวของค่าสถิติ'
    ]
  },
  {
    id: 'document',
    title: 'Document Intelligence',
    titleThai: 'การจัดการและการสกัดข้อมูลเอกสาร',
    icon: FileText,
    color: '#e879f9',
    description: 'สรุปใจความสำคัญของเอกสาร สกัดข้อกำหนดทางเทคนิค วิเคราะห์สัญญา และจัดโครงสร้างข้อมูลจากไฟล์เอกสาร',
    capabilities: ['PRODUCTIVITY'] as CapabilityId[],
    presetPrompts: [
      'สรุปใจความสำคัญและข้อกำหนดบังคับจากเอกสารข้อกำหนดทางเทคนิค',
      'สกัดรายการงานที่ต้องปฏิบัติ (Action Items) และกำหนดเวลาจากบันทึกการประชุม',
      'ตรวจสอบและเปรียบเทียบข้อแตกต่างระหว่างเอกสารฉบับร่างกับฉบับจริง'
    ]
  }
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Simulated content loading effect for smooth perceived performance
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    return EXPLORE_CAPABILITY_GROUPS.filter(group => {
      const matchFilter = selectedGroup === 'all' || group.id === selectedGroup;
      const matchSearch =
        searchQuery === '' ||
        group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.titleThai.includes(searchQuery) ||
        group.description.includes(searchQuery);
      return matchFilter && matchSearch;
    });
  }, [selectedGroup, searchQuery]);

  const handleLaunch = (promptText: string, capabilityId?: string) => {
    const params = new URLSearchParams();
    params.set('q', promptText);
    if (capabilityId) params.set('capability', capabilityId);
    navigate(`/chat?${params.toString()}`);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050810] text-white">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('zyntheor:toggle-sidebar'))}
              title="Toggle Sidebar Navigation (⌘B)"
              aria-label="Toggle Navigation Menu"
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-200 hover:text-white transition grid place-items-center cursor-pointer shadow-sm shrink-0"
            >
              <Menu size={16} className="text-[#00D9A3]" />
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-bold text-white/60">
              <Compass size={12} className="text-[#00D9A3]" />
              INTELLIGENCE CAPABILITIES
            </div>
          </div>
          <h1 className="text-fluid-h1 font-black tracking-tight text-white">
            Explore Capabilities
          </h1>
          <p className="text-fluid-body text-white/50 max-w-2xl leading-relaxed">
            ศูนย์รวม 8 ความสามารถหลักของ ZYNTHEOR Universal Intelligence Platform ทำงานบน Intelligence Core และ Model Engine เดียวกันอย่างไร้รอยต่อ
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาความสามารถ เช่น ค้นคว้า, วิเคราะห์ตรรกะ, สร้างสรรค์, เขียนงาน, งานเทคนิค, เอกสาร..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-[#0b1020] border border-white/10 text-sm placeholder:text-white/30 focus:border-[#00D9A3]/50 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                selectedGroup === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              ทั้งหมด (8 ความสามารถ)
            </button>
            {EXPLORE_CAPABILITY_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 cursor-pointer ${
                  selectedGroup === g.id
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <g.icon size={13} style={{ color: selectedGroup === g.id ? '#000' : g.color }} />
                <span>{g.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Capability Group Cards (Skeleton Loading State or Real Cards Grid) */}
        {isLoading ? (
          <ExploreCapabilitiesSkeleton count={8} />
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
          {filteredGroups.map(group => {
            const GroupIcon = group.icon;
            return (
              <div
                key={group.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0b1020]/90 p-5 md:p-6 space-y-4 flex flex-col justify-between hover:border-white/20 transition shadow-lg"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl grid place-items-center border"
                        style={{
                          backgroundColor: `${group.color}15`,
                          borderColor: `${group.color}35`,
                          color: group.color
                        }}
                      >
                        <GroupIcon size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          {group.titleThai}
                        </h2>
                        <span className="text-xs text-white/40 font-mono">
                          {group.title}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunch(group.presetPrompts[0], group.capabilities[0])}
                      className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      style={{
                        backgroundColor: `${group.color}20`,
                        color: group.color
                      }}
                    >
                      <span>เปิดใช้งาน</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed">
                    {group.description}
                  </p>

                  {/* Preset prompts */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] tracking-wider font-bold text-white/30 uppercase">
                      คำสั่งแนะนำ
                    </div>
                    <div className="space-y-1">
                      {group.presetPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleLaunch(prompt, group.capabilities[0])}
                          className="w-full text-left p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-xs text-white/80 transition flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <ChevronRight size={12} className="text-white/30 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40">
                  <span>Engine: ZYNTHEOR INTELLIGENCE</span>
                  <button
                    onClick={() => handleLaunch(group.presetPrompts[0], group.capabilities[0])}
                    className="text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
                    style={{ color: group.color }}
                  >
                    <span>Start {group.title.split(' ')[0]}</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
