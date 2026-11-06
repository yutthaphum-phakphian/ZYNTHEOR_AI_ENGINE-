// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  Files,
  FolderKanban,
  Search,
  Plus,
  Clock,
  ExternalLink,
  Trash2,
  Sparkles,
  ChevronRight,
  Database,
  FileText
} from 'lucide-react';
import MemoryCenterComponent from '../components/MemoryCenter';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'knowledge' | 'memory' | 'documents' | 'history'>('knowledge');
  const [searchFilter, setSearchFilter] = useState('');

  // Sample documents / knowledge items
  const [knowledgeItems, setKnowledgeItems] = useState([
    {
      id: 'k1',
      title: 'Sovereign AI Infrastructure Guidelines',
      category: 'Architecture',
      updatedAt: 'เมื่อ 2 ชั่วโมงที่แล้ว',
      snippet: 'ข้อกำหนดโครงสร้างอธิปไตยดิจิทัล การแยกส่วนระหว่าง Runtime, Model Provider และ Memory Isolation'
    },
    {
      id: 'k2',
      title: 'Quantum Resistant Cryptography (FIPS 203/204)',
      category: 'Security',
      updatedAt: 'เมื่อวานนี้',
      snippet: 'บันทึกการนำส่งหลักฐานดิจิทัลตามมาตรฐาน ML-DSA-87 และ ML-KEM เพื่อป้องกันภัยคุกคามทางควอนตัม'
    },
    {
      id: 'k3',
      title: 'Universal AI Workspace Product Principles',
      category: 'Product',
      updatedAt: '3 วันที่แล้ว',
      snippet: 'หลักการออกแบบแพลตฟอร์ม AI อเนกประสงค์: 1 Engine, 1 Intelligence, หลากหลาย Workspace เฉพาะด้าน'
    }
  ]);

  const [documentItems] = useState([
    {
      name: 'System_Architecture_Blueprint.pdf',
      size: '2.4 MB',
      type: 'PDF',
      updatedAt: '2026-11-04',
      pages: 14
    },
    {
      name: 'ETDA_Compliance_Review.docx',
      size: '840 KB',
      type: 'DOCX',
      updatedAt: '2026-11-03',
      pages: 8
    },
    {
      name: 'Dataset_Provenance_Manifest.json',
      size: '124 KB',
      type: 'JSON',
      updatedAt: '2026-11-01',
      pages: 1
    }
  ]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050810] text-white">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-bold text-white/60">
              <BookOpen size={12} className="text-[#38bdf8]" />
              ZYNTHEOR LIBRARY
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Library & Knowledge
            </h1>
            <p className="text-sm text-white/50">
              ศูนย์รวมข้อมูล ความรู้ ความจำส่วนบุคคล และเอกสารที่ใช้งานร่วมกับ Intelligence
            </p>
          </div>

          <button
            onClick={() => navigate('/chat')}
            className="h-10 px-5 rounded-full bg-[#00D9A3] text-black font-bold text-xs flex items-center gap-2 hover:bg-white transition cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            สร้างการสนทนาใหม่
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={15} />
            Knowledge & Notes
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'memory'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Brain size={15} />
            Memory Center
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Files size={15} />
            Documents & Files
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={15} />
            Recent History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ค้นหาในคลังความรู้..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-[#38bdf8]/50 focus:outline-none"
                />
              </div>

              <button
                onClick={() => navigate('/chat?q=ช่วยสรุปและบันทึกความรู้ใหม่เข้าสู่ Library')}
                className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition flex items-center gap-2 cursor-pointer"
              >
                <Plus size={14} className="text-[#38bdf8]" />
                เพิ่มบันทึกความรู้ใหม่
              </button>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {knowledgeItems
                .filter(item => item.title.toLowerCase().includes(searchFilter.toLowerCase()) || item.snippet.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(item => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1020] p-5 space-y-3 flex flex-col justify-between hover:border-[#38bdf8]/40 transition group cursor-pointer"
                    onClick={() => navigate(`/chat?q=ขอทบทวนหัวข้อ "${item.title}"`)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] font-bold">
                          {item.category}
                        </span>
                        <span className="text-white/30">{item.updatedAt}</span>
                      </div>
                      <h3 className="font-bold text-sm text-white group-hover:text-[#38bdf8] transition">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed line-clamp-3">
                        {item.snippet}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 text-[11px] text-[#38bdf8] flex items-center justify-between">
                      <span>เปิดศึกษาและถามต่อ</span>
                      <ChevronRight size={13} className="group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0b1020] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Brain className="text-[#00D9A3]" size={20} />
                  ZYNTHEOR Memory Center
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  ระบบความจำ บริบทของผู้ใช้ และบันทึกข้อเท็จจริงที่ระบบจัดเก็บไว้สำหรับตอบคำถาม
                </p>
              </div>
            </div>
            <MemoryCenterComponent />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1020] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    เอกสารที่เชื่อมโยงกับ AI Workspace
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    รองรับการอ้างอิงเนื้อหาเอกสารสำหรับการสรุป การวิเคราะห์ และการตอบคำถาม
                  </p>
                </div>

                <button
                  onClick={() => navigate('/chat?q=ช่วยวิเคราะห์เอกสารที่อัปโหลด')}
                  className="h-9 px-4 rounded-full bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/20 transition cursor-pointer"
                >
                  อัปโหลดเอกสารใหม่
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {documentItems.map((doc, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center text-white/60">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white hover:text-[#00D9A3] cursor-pointer transition">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-white/40">
                          {doc.type} · {doc.size} · {doc.pages} หน้า · อัปเดต {doc.updatedAt}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/chat?q=ช่วยสรุปสาระสำคัญของเอกสาร ${doc.name}`)}
                      className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white transition cursor-pointer"
                    >
                      ถามเกี่ยวกับไฟล์นี้
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1020] space-y-4">
            <h3 className="text-base font-bold text-white">
              ประวัติการทำงานล่าสุด
            </h3>
            <p className="text-xs text-white/50">
              เซสชันการสนทนาและงานที่ทำค้างไว้ล่าสุดใน ZYNTHEOR Workspace
            </p>

            <div className="space-y-2 pt-2">
              {[
                { title: 'การวิเคราะห์สถาปัตยกรรม Sovereign AI 2026', time: 'วันนี้ 10:14 น.', tag: 'Architecture' },
                { title: 'แปลร่างเอกสารสัญญาทางเทคนิค (ETDA Sec 9/26/28)', time: 'เมื่อวานนี้ 16:30 น.', tag: 'Legal' },
                { title: 'แก้ปัญหาการจัดเรียง Tailwind CSS v4 Responsive', time: 'เมื่อวานนี้ 11:20 น.', tag: 'Technical' }
              ].map((h, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/chat')}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={15} className="text-white/40" />
                    <div>
                      <div className="text-xs font-bold text-white">{h.title}</div>
                      <div className="text-[10px] text-white/40">{h.time}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-mono">
                    {h.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
