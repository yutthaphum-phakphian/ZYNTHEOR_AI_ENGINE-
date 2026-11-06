/**
 * ZYNTHEOR AI ENGINE — Premium Adaptive Intelligence Navigation Sidebar
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Primary 4-Hub Structure + Recent Conversations + User Settings
 * Mobile-First, Accessible, Responsive, Single Source of Truth Navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Compass,
  BookOpen,
  Brain,
  Settings,
  Plus,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  getRecentConversations,
  deleteConversationThread,
  formatThreadTime,
  type ConversationThread
} from '../services/conversationHistory';

export interface SidebarNavigationProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarNavigation({
  isExpanded,
  onToggleExpand,
  isMobileOpen,
  onCloseMobile,
}: SidebarNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);

  // Load persistent recent conversations
  const loadConversations = useCallback(() => {
    setIsLoadingConversations(true);
    try {
      const list = getRecentConversations();
      setConversations(list);
    } catch (err) {
      console.error('[SidebarNavigation] Failed to load threads:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

    const handleConversationsChanged = (e: CustomEvent<ConversationThread[]>) => {
      if (e.detail && Array.isArray(e.detail)) {
        setConversations(e.detail);
      } else {
        loadConversations();
      }
    };

    window.addEventListener('zyntheor:conversations-changed' as any, handleConversationsChanged);
    return () => {
      window.removeEventListener('zyntheor:conversations-changed' as any, handleConversationsChanged);
    };
  }, [loadConversations]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Active Hub matching logic
  const currentPath = location.pathname;
  const isChatActive = currentPath === '/' || currentPath.startsWith('/chat') || currentPath.startsWith('/workspace');
  const isExploreActive = currentPath.startsWith('/explore');
  const isLibraryActive = currentPath.startsWith('/library') || currentPath.startsWith('/knowledge') || currentPath.startsWith('/memory');
  const isAgentsActive = currentPath.startsWith('/agents') || currentPath.startsWith('/agent');
  const isSettingsActive = currentPath.startsWith('/settings');

  // Primary 4 Hub Navigation items as specified
  const primaryNavItems = [
    {
      id: 'chat',
      path: '/chat',
      icon: MessageSquare,
      label: 'Chat',
      labelTh: 'สนทนาและใช้งาน AI',
      active: isChatActive,
    },
    {
      id: 'explore',
      path: '/explore',
      icon: Compass,
      label: 'Explore',
      labelTh: 'สำรวจความสามารถ',
      active: isExploreActive,
    },
    {
      id: 'library',
      path: '/library',
      icon: BookOpen,
      label: 'Library',
      labelTh: 'ไฟล์ ความรู้ และประวัติ',
      active: isLibraryActive,
    },
    {
      id: 'agents',
      path: '/agents',
      icon: Brain,
      label: 'Agents',
      labelTh: 'งานอัตโนมัติ & AI',
      active: isAgentsActive,
    },
  ];

  const handleStartNewConversation = () => {
    if (isMobileOpen) onCloseMobile();
    // Dispatch new chat event and navigate to /chat
    window.dispatchEvent(new CustomEvent('zyntheor:new-chat'));
    navigate('/chat');
  };

  const handleSelectThread = (threadId: string) => {
    if (isMobileOpen) onCloseMobile();
    navigate(`/chat?thread=${threadId}`);
  };

  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    deleteConversationThread(threadId);
  };

  // Shared Sidebar Content Render Component
  const renderSidebarContent = (mobileView: boolean) => {
    const showFull = mobileView || isExpanded;

    return (
      <div className="flex flex-col justify-between h-full bg-[#0D1424] text-white select-none border-r border-slate-800/80">
        {/* =========================================================
            1. BRAND HEADER & NEW CONVERSATION BUTTON
        ========================================================= */}
        <div className="p-3.5 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between h-10 px-1">
            {showFull ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <NavLink
                  to="/"
                  onClick={() => mobileView && onCloseMobile()}
                  className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-slate-950 font-black text-sm shadow-md shadow-[#00D9A3]/20 shrink-0 transition hover:scale-105"
                  title="ZYNTHEOR AI ENGINE Home"
                >
                  Z
                </NavLink>
                <div className="truncate">
                  <div className="font-bold text-xs tracking-tight text-slate-100 truncate">
                    ZYNTHEOR AI ENGINE
                  </div>
                  <div className="text-[10px] text-[#00D9A3] font-mono tracking-wider truncate">
                    ZYNTHEOR INTELLIGENCE
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                to="/"
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-slate-950 font-black text-base shadow-md shadow-[#00D9A3]/20 shrink-0 mx-auto transition hover:scale-105"
                title="ZYNTHEOR AI ENGINE"
              >
                Z
              </NavLink>
            )}

            {/* Close Button for Mobile Drawer or Toggle Button for Desktop */}
            {mobileView ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white grid place-items-center cursor-pointer transition"
                aria-label="Close Mobile Navigation Drawer"
                title="Close Drawer (ESC)"
              >
                <X size={16} />
              </button>
            ) : (
              showFull && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white grid place-items-center cursor-pointer transition shrink-0"
                  aria-label="Collapse Sidebar Navigation"
                  title="Collapse Sidebar (⌘B)"
                >
                  <Menu size={16} />
                </button>
              )
            )}
          </div>

          {!mobileView && !isExpanded && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onToggleExpand}
                className="w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-[#00D9A3] grid place-items-center cursor-pointer transition"
                aria-label="Expand Sidebar Navigation"
                title="Expand Sidebar (⌘B)"
              >
                <Menu size={16} />
              </button>
            </div>
          )}

          {/* New Conversation Button */}
          {showFull ? (
            <button
              type="button"
              onClick={handleStartNewConversation}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#00D9A3] hover:bg-[#00f5ff] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#00D9A3]/20 active:scale-[0.98] cursor-pointer"
              title="Start a new conversation thread"
            >
              <Plus size={16} className="text-slate-950 stroke-[3]" />
              <span>New Conversation</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartNewConversation}
              className="w-10 h-10 mx-auto rounded-xl bg-[#00D9A3] hover:bg-[#00f5ff] text-slate-950 grid place-items-center transition-all shadow-md shadow-[#00D9A3]/20 active:scale-95 cursor-pointer"
              title="New Conversation"
            >
              <Plus size={18} className="text-slate-950 stroke-[3]" />
            </button>
          )}

          <div className="w-full h-px bg-slate-800/80 my-2" />

          {/* =========================================================
              2. PRIMARY NAVIGATION (4 CORE HUBS)
          ========================================================= */}
          <nav className="space-y-1" aria-label="Primary Navigation">
            {primaryNavItems.map(item => {
              const IconComponent = item.icon;
              if (showFull) {
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => mobileView && onCloseMobile()}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer overflow-hidden ${
                      item.active
                        ? 'bg-[#00D9A3]/10 text-[#00D9A3] font-bold border-l-2 border-[#00D9A3]'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <IconComponent
                      size={18}
                      className={item.active ? 'text-[#00D9A3] shrink-0' : 'text-slate-400 shrink-0'}
                    />
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal truncate ml-1">
                        {item.labelTh}
                      </span>
                    </div>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  title={`${item.label} (${item.labelTh})`}
                  className={`relative w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition cursor-pointer ${
                    item.active
                      ? 'bg-[#00D9A3]/15 text-[#00D9A3] font-bold ring-1 ring-[#00D9A3]/40'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <IconComponent size={19} />
                  {item.active && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#00D9A3]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* =========================================================
            3. RECENT CONVERSATIONS AREA (EXPANDED ONLY)
        ========================================================= */}
        {showFull && (
          <div className="flex-1 min-h-0 px-3.5 py-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-cyan-400" />
                <span>Recent Conversations</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {conversations.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {isLoadingConversations ? (
                <div className="p-3 text-center text-xs text-slate-400 font-mono animate-pulse">
                  กำลังโหลดประวัติ...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-1">
                  <MessageSquare size={16} className="mx-auto text-slate-400" />
                  <div className="text-xs text-slate-400 font-medium">ยังไม่มีประวัติการสนทนา</div>
                  <div className="text-[10px] text-slate-400">เริ่มต้นสนทนาใหม่เพื่อบันทึกประวัติ</div>
                </div>
              ) : (
                conversations.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className="group relative flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Sparkles size={13} className="text-cyan-400 shrink-0 group-hover:text-[#00D9A3]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-slate-200 group-hover:text-white font-medium text-[11px]">
                          {thread.title || 'คำสั่งการประมวลผล ZYNTHEOR'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatThreadTime(thread.lastUpdated)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => handleDeleteThread(e, thread.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-400 transition cursor-pointer shrink-0"
                      title="ลบประวัติการสนทนานี้"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            4. USER PROFILE & SETTINGS AREA (BOTTOM)
        ========================================================= */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5 bg-[#0a101d]">
          {showFull ? (
            <div className="space-y-2">
              {/* User Profile Info Card */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 grid place-items-center text-cyan-300 font-bold text-xs shrink-0">
                  <User size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-200 truncate">
                    hugeplease66@gmail.com
                  </div>
                  <div className="text-[9px] font-mono text-emerald-400 truncate flex items-center gap-1">
                    <ShieldCheck size={10} />
                    <span>ZYNTHEOR Sovereign Identity</span>
                  </div>
                </div>
              </div>

              {/* Settings NavLink */}
              <NavLink
                to="/settings"
                onClick={() => mobileView && onCloseMobile()}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSettingsActive
                    ? 'bg-[#00D9A3]/10 text-[#00D9A3] font-bold border-l-2 border-[#00D9A3]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Settings size={16} className={isSettingsActive ? 'text-[#00D9A3]' : 'text-slate-400'} />
                <span className="flex-1">Settings &amp; Configuration</span>
              </NavLink>

              {/* Collapse Sidebar Button on Desktop */}
              {!mobileView && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between transition cursor-pointer"
                  title="Collapse Sidebar Navigation (⌘B)"
                >
                  <span className="font-mono">Collapse Sidebar</span>
                  <ChevronLeft size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-center">
              {/* Compact User Icon */}
              <NavLink
                to="/settings"
                title="User Profile & Settings (hugeplease66@gmail.com)"
                className="w-9 h-9 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/40 grid place-items-center text-cyan-300 transition hover:scale-105 cursor-pointer"
              >
                <User size={16} />
              </NavLink>

              {/* Compact Settings Icon */}
              <NavLink
                to="/settings"
                title="Settings & Configuration"
                className={`w-9 h-9 mx-auto rounded-xl grid place-items-center transition cursor-pointer ${
                  isSettingsActive
                    ? 'bg-[#00D9A3]/20 text-[#00D9A3] border border-[#00D9A3]/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Settings size={16} />
              </NavLink>

              {/* Expand Sidebar Button */}
              <button
                type="button"
                onClick={onToggleExpand}
                className="w-9 h-9 mx-auto rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-[#00D9A3] grid place-items-center transition cursor-pointer"
                title="Expand Sidebar (⌘B)"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* =========================================================
          DESKTOP SIDEBAR (Adaptive 272px / 72px)
      ========================================================= */}
      <aside
        style={{
          width: isExpanded ? '272px' : '72px',
          minWidth: isExpanded ? '272px' : '72px',
        }}
        className="hidden md:flex flex-col h-full z-20 transition-all duration-300 ease-in-out shrink-0 overflow-hidden"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* =========================================================
          MOBILE OVERLAY DRAWER
      ========================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dim Backdrop */}
          <div
            className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] h-full z-50 shadow-2xl safe-top safe-bottom overflow-hidden">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
