// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  PenLine,
  Brain,
  BarChart3,
  Wrench,
  Zap,
  Search,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Globe,
  FileText,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { CAPABILITIES, type CapabilityId } from '../lib/capabilityEngine';

export const MAJOR_CAPABILITY_GROUPS = [
  {
    id: 'knowledge',
    title: 'Knowledge & Research',
    titleThai: 'ความรู้และการค้นคว้า',
    icon: BookOpen,
    color: '#38bdf8',
    gradient: 'from-[#38bdf8]/20 to-[#38bdf8]/5',
    border: 'border-[#38bdf8]/30',
    description: 'ค้นคว้าข้อมูลเชิงลึก สืบค้นเว็บแบบเรียลไทม์ และสังเคราะห์ความรู้ที่ตรวจสอบได้',
    capabilities: ['KNOWLEDGE_RESEARCH', 'EDUCATION'] as CapabilityId[],
    presetPrompts: [
      'ค้นคว้าและสรุปแนวโน้มเทคโนโลยี Sovereign AI ปี 2026',
      'อธิบายทฤษฎีควอนตัมคอมพิวติ้งให้คนทั่วไปเข้าใจง่าย',
      'เปรียบเทียบมาตรฐานการรักษาความปลอดภัยข้อมูล FIPS 140-3'
    ]
  },
  {
    id: 'creation',
    title: 'Creation & Language',
    titleThai: 'การสร้างสรรค์และภาษา',
    icon: PenLine,
    color: '#fb7185',
    gradient: 'from-[#fb7185]/20 to-[#fb7185]/5',
    border: 'border-[#fb7185]/30',
    description: 'เรียบเรียงบทความ เขียนเอกสารทางการ แปลภาษาไทย-อังกฤษ และระดมไอเดียสร้างสรรค์',
    capabilities: ['WRITING_TRANSLATION', 'CREATIVITY'] as CapabilityId[],
    presetPrompts: [
      'เขียนบทความวิชาการเกี่ยวกับสถาปัตยกรรม Microservices',
      'แปลข้อความภาษาอังกฤษเป็นภาษาไทยอย่างเป็นทางการและสละสลวย',
      'ช่วยตั้งชื่อและออกแบบคอนเซปต์ผลิตภัณฑ์ AI ตัวใหม่'
    ]
  },
  {
    id: 'intelligence',
    title: 'Intelligence & Reasoning',
    titleThai: 'การคิดเชิงเหตุผลและการตัดสินใจ',
    icon: Brain,
    color: '#a78bfa',
    gradient: 'from-[#a78bfa]/20 to-[#a78bfa]/5',
    border: 'border-[#a78bfa]/30',
    description: 'การคิดเชิงตรรกะแบบขั้นตอน วิเคราะห์ข้อดีข้อเสีย และสนับสนุนการตัดสินใจเชิงกลยุทธ์',
    capabilities: ['REASONING', 'GENERAL_CONVERSATION'] as CapabilityId[],
    presetPrompts: [
      'ช่วยวิเคราะห์ Trade-offs ระหว่าง SQL vs NoSQL สำหรับระบบขนาดใหญ่',
      'ประเมินความเสี่ยงและแผนรับมือสำหรับการเปิดตัวระบบระดับองค์กร',
      'แก้โจทย์ปัญหาเชิงตรรกะและโครงสร้างขั้นตอนการทำงาน'
    ]
  },
  {
    id: 'analysis',
    title: 'Analysis & Data',
    titleThai: 'การวิเคราะห์ข้อมูลและตัวเลข',
    icon: BarChart3,
    color: '#34d399',
    gradient: 'from-[#34d399]/20 to-[#34d399]/5',
    border: 'border-[#34d399]/30',
    description: 'ประมวลผลข้อมูล ตัวเลข สถิติ สรุปสาระสำคัญ และออกแบบแนวทางการจัดเก็บข้อมูล',
    capabilities: ['DATA_ANALYSIS'] as CapabilityId[],
    presetPrompts: [
      'วิเคราะห์แนวโน้มยอดขายและจุดที่ต้องปรับปรุงจากชุดข้อมูล',
      'ช่วยออกแบบ Schema ฐานข้อมูลเชิงสัมพันธ์สำหรับระบบ E-commerce',
      'สรุปตัวชี้วัดสำคัญ (KPIs) จากรายงานผลการดำเนินงาน'
    ]
  },
  {
    id: 'technical',
    title: 'Technical & Engineering',
    titleThai: 'งานเทคนิคและวิศวกรรม',
    icon: Wrench,
    color: '#fb923c',
    gradient: 'from-[#fb923c]/20 to-[#fb923c]/5',
    border: 'border-[#fb923c]/30',
    description: 'พัฒนาซอฟต์แวร์ ตรวจสอบบั๊ก ออกแบบ API ระบบเครือข่าย และสถาปัตยกรรมคลาวด์',
    capabilities: ['TECHNICAL_ASSISTANCE'] as CapabilityId[],
    presetPrompts: [
      'เขียน TypeScript React Custom Hook สำหรับจัดการ Real-time WebSocket',
      'ตรวจสอบและแนะนำวิธีแก้ Performance Bottleneck ใน Node.js',
      'ออกแบบ RESTful API และ Authentication Middleware แบบปลอดภัย'
    ]
  },
  {
    id: 'productivity',
    title: 'Productivity & Planning',
    titleThai: 'การทำงานและเพิ่มผลผลิต',
    icon: Zap,
    color: '#facc15',
    gradient: 'from-[#facc15]/20 to-[#facc15]/5',
    border: 'border-[#facc15]/30',
    description: 'วางแผนโปรเจกต์ ลำดับความสำคัญของงาน จัดการกระบวนการ และสรุปขั้นตอนปฏิบัติ',
    capabilities: ['PRODUCTIVITY'] as CapabilityId[],
    presetPrompts: [
      'ช่วยวางแผน Roadmap 30 วันสำหรับการส่งมอบซอฟต์แวร์',
      'สร้าง Action Plan และ Checklist สำหรับการทดสอบระบบก่อนเปิดตัว',
      'สรุปและจัดระเบียบข้อตกลงจากการประชุมเป็นงานที่ปฏิบัติได้จริง'
    ]
  }
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const filteredGroups = useMemo(() => {
    return MAJOR_CAPABILITY_GROUPS.filter(group => {
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
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-10">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-bold text-white/60">
            <Sparkles size={12} className="text-[#00D9A3]" />
            CAPABILITY EXPLORER
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Explore Capabilities
          </h1>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed">
            เข้าถึงพื้นที่ความสามารถเฉพาะด้านของ ZYNTHEOR โดยแต่ละหมวดหมู่ออกแบบมาเพื่อสนับสนุนงานแต่ละประเภทอย่างแม่นยำ ภายใต้ Intelligence Core และ Model Engine เดียวกัน
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
              placeholder="ค้นหาความสามารถ เช่น ค้นคว้า, เขียนบทความ, ตรวจโค้ด, วิเคราะห์ข้อมูล..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-[#0b1020] border border-white/10 text-sm placeholder:text-white/30 focus:border-[#00D9A3]/50 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedGroup === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              ทั้งหมด (All)
            </button>
            {MAJOR_CAPABILITY_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
                  selectedGroup === g.id
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <g.icon size={14} style={{ color: selectedGroup === g.id ? '#000' : g.color }} />
                {g.titleThai}
              </button>
            ))}
          </div>
        </div>

        {/* Capability Group Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredGroups.map(group => {
            const GroupIcon = group.icon;

            return (
              <div
                key={group.id}
                className={`rounded-3xl border ${group.border} bg-[#0b1020]/90 p-6 space-y-5 flex flex-col justify-between hover:border-white/20 transition`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl grid place-items-center border"
                        style={{
                          backgroundColor: `${group.color}15`,
                          borderColor: `${group.color}35`,
                          color: group.color
                        }}
                      >
                        <GroupIcon size={22} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {group.titleThai}
                        </h2>
                        <span className="text-xs text-white/40 font-mono">
                          {group.title}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunch(group.presetPrompts[0], group.capabilities[0])}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      style={{
                        backgroundColor: `${group.color}20`,
                        color: group.color
                      }}
                    >
                      <span>เปิดใช้งาน</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed">
                    {group.description}
                  </p>

                  {/* Preset prompts */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[10px] tracking-wider font-bold text-white/30 uppercase">
                      ตัวอย่างคำสั่งที่แนะนำ
                    </div>
                    <div className="space-y-1.5">
                      {group.presetPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleLaunch(prompt, group.capabilities[0])}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs text-white/80 transition flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <ChevronRight size={13} className="text-white/30 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40">
                  <span>Engine: ZYNTHEOR INTELLIGENCE</span>
                  <button
                    onClick={() => handleLaunch(group.presetPrompts[0], group.capabilities[0])}
                    className="text-xs font-bold hover:underline cursor-pointer"
                    style={{ color: group.color }}
                  >
                    Start {group.title.split(' ')[0]} Workspace →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
