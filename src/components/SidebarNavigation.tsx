/**
 * ZYNTHEOR AI ENGINE — Premium Adaptive Intelligence Navigation Sidebar
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * STEP 5 — INTELLIGENT CONVERSATION MANAGEMENT
 * Primary 4-Hub Structure + Search & Time-Grouped Conversations + Swipe-to-Dismiss + Thread Actions
 * Mobile-First, Accessible, Responsive, Single Source of Truth Navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Sparkles,
  Search,
  Archive,
  Edit2,
  Check,
  AlertTriangle,
  FolderArchive,
  MoreVertical
} from 'lucide-react';
import {
  getRecentConversations,
  deleteConversationThread,
  renameConversationThread,
  archiveConversationThread,
  groupConversationsByDate,
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Kebab dropdown context menu state
  const [activeKebabThreadId, setActiveKebabThreadId] = useState<string | null>(null);

  // Thread editing state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  // Delete confirmation modal state
  const [deleteModalThreadId, setDeleteModalThreadId] = useState<string | null>(null);

  // Touch Swipe Gesture State per thread ID
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const touchStartRef = useRef<{ id: string; x: number } | null>(null);

  // Debounce search query and query backend if permitted by workspace isolation policy
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim()) {
        fetch(`/api/workspace/conversations?q=${encodeURIComponent(searchQuery.trim())}`)
          .then(res => res.json())
          .then(data => {
            if (data.ok && Array.isArray(data.conversations) && data.conversations.length > 0) {
              setConversations(prev => {
                const map = new Map<string, ConversationThread>();
                prev.forEach(t => map.set(t.id, t));
                data.conversations.forEach((t: any) => map.set(t.id, t));
                return Array.from(map.values());
              });
            }
          })
          .catch(() => {});
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load persistent recent conversations
  const loadConversations = useCallback(() => {
    setIsLoadingConversations(true);
    try {
      const list = getRecentConversations(true);
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

  // Handle ESC key to close mobile drawer or modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModalThreadId) setDeleteModalThreadId(null);
        else if (editingThreadId) setEditingThreadId(null);
        else if (isMobileOpen) onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, deleteModalThreadId, editingThreadId, onCloseMobile]);

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
  const searchParams = new URLSearchParams(location.search);
  const activeThreadId = searchParams.get('thread');

  const isChatActive = currentPath === '/' || currentPath.startsWith('/chat') || currentPath.startsWith('/workspace');
  const isExploreActive = currentPath.startsWith('/explore');
  const isLibraryActive = currentPath.startsWith('/library') || currentPath.startsWith('/knowledge') || currentPath.startsWith('/memory');
  const isAgentsActive = currentPath.startsWith('/agents') || currentPath.startsWith('/agent');
  const isSettingsActive = currentPath.startsWith('/settings');

  // Primary 4 Hub Navigation items
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
    window.dispatchEvent(new CustomEvent('zyntheor:new-chat'));
    navigate('/chat');
  };

  const handleSelectThread = (threadId: string) => {
    if (isMobileOpen) onCloseMobile();
    navigate(`/chat?thread=${threadId}`);
  };

  const handleStartRename = (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitleText(thread.title);
  };

  const handleConfirmRename = (threadId: string) => {
    if (editingTitleText.trim()) {
      renameConversationThread(threadId, editingTitleText.trim());
    }
    setEditingThreadId(null);
  };

  const handleToggleArchive = (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    archiveConversationThread(thread.id, !thread.archived);
  };

  const handlePromptDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setDeleteModalThreadId(threadId);
  };

  const handleConfirmDelete = () => {
    if (deleteModalThreadId) {
      deleteConversationThread(deleteModalThreadId);
      setDeleteModalThreadId(null);
    }
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (threadId: string, clientX: number) => {
    touchStartRef.current = { id: threadId, x: clientX };
  };

  const handleTouchMove = (threadId: string, clientX: number) => {
    if (!touchStartRef.current || touchStartRef.current.id !== threadId) return;
    const diffX = clientX - touchStartRef.current.x;
    if (diffX < 0 && diffX > -120) {
      setSwipeOffsets(prev => ({ ...prev, [threadId]: diffX }));
    }
  };

  const handleTouchEnd = (threadId: string) => {
    if (!touchStartRef.current || touchStartRef.current.id !== threadId) return;
    const currentOffset = swipeOffsets[threadId] || 0;
    if (currentOffset < -65) {
      // Swiped far left -> open delete modal or trigger delete directly
      setDeleteModalThreadId(threadId);
    }
    setSwipeOffsets(prev => ({ ...prev, [threadId]: 0 }));
    touchStartRef.current = null;
  };

  // Filter conversations by search query
  const filteredThreads = conversations.filter(t => {
    if (!showArchived && t.archived) return false;
    if (showArchived && !t.archived) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.previewText || '').toLowerCase().includes(q)
    );
  });

  const grouped = groupConversationsByDate(filteredThreads);

  // Helper to render grouped thread list
  const renderGroupSection = (title: string, threads: ConversationThread[]) => {
    if (threads.length === 0) return null;

    return (
      <div key={title} className="mb-3 space-y-1">
        <div className="px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {title} ({threads.length})
        </div>
        {threads.map(thread => {
          const isActive = activeThreadId === thread.id;
          const isEditing = editingThreadId === thread.id;
          const swipeOffset = swipeOffsets[thread.id] || 0;

          return (
            <div
              key={thread.id}
              className="relative overflow-hidden rounded-xl group"
              onTouchStart={e => handleTouchStart(thread.id, e.touches[0].clientX)}
              onTouchMove={e => handleTouchMove(thread.id, e.touches[0].clientX)}
              onTouchEnd={() => handleTouchEnd(thread.id)}
            >
              {/* Swipe Background Delete Action Reveal */}
              <div
                className="absolute inset-y-0 right-0 bg-red-600/90 text-white flex items-center justify-end px-4 font-bold text-xs rounded-xl cursor-pointer transition-opacity"
                style={{ opacity: swipeOffset < -15 ? 1 : 0 }}
                onClick={e => handlePromptDelete(e, thread.id)}
              >
                <Trash2 size={15} />
              </div>

              {/* Foreground Thread Card */}
              <div
                onClick={() => !isEditing && handleSelectThread(thread.id)}
                style={{
                  transform: `translateX(${swipeOffset}px)`,
                  transition: swipeOffset === 0 ? 'transform 200ms ease' : 'none',
                }}
                className={`relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border text-xs ${
                  isActive
                    ? 'bg-[#00D9A3]/15 border-[#00D9A3]/40 text-[#00D9A3]'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sparkles
                    size={13}
                    className={isActive ? 'text-[#00D9A3] shrink-0' : 'text-slate-400 shrink-0 group-hover:text-slate-200'}
                  />

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitleText}
                        onChange={e => setEditingTitleText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConfirmRename(thread.id)}
                        autoFocus
                        className="flex-1 bg-slate-950 text-white text-xs px-2 py-1 rounded border border-cyan-500/50 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmRename(thread.id)}
                        className="p-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 rounded"
                        title="Save"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingThreadId(null)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-medium text-[11px] ${isActive ? 'text-[#00D9A3]' : 'text-slate-200 group-hover:text-white'}`}>
                        {thread.title || 'คำสั่งการประมวลผล ZYNTHEOR'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>{formatThreadTime(thread.lastUpdated)}</span>
                        {thread.previewText && (
                          <span className="truncate max-w-[90px] text-slate-400 ml-1">
                            {thread.previewText}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kebab Context Menu Icon & Dropdown */}
                {!isEditing && (
                  <div className="relative flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKebabThreadId(prev => prev === thread.id ? null : thread.id);
                      }}
                      className="p-1 text-slate-400 hover:text-white transition cursor-pointer rounded hover:bg-slate-800"
                      title="ตัวเลือกบทสนทนา (Conversation Options)"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* Kebab Dropdown Popover */}
                    {activeKebabThreadId === thread.id && (
                      <div className="absolute right-0 top-6 z-50 w-36 py-1 bg-[#091120] border border-slate-700/80 rounded-xl shadow-2xl text-xs space-y-0.5 animate-fade-in">
                        <button
                          type="button"
                          onClick={(e) => {
                            setActiveKebabThreadId(null);
                            handleStartRename(e, thread);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2 text-slate-200 transition"
                        >
                          <Edit2 size={12} className="text-cyan-400" />
                          <span>Rename</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            setActiveKebabThreadId(null);
                            handleToggleArchive(e, thread);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center gap-2 text-slate-200 transition"
                        >
                          <Archive size={12} className="text-amber-400" />
                          <span>{thread.archived ? 'Unarchive' : 'Archive'}</span>
                        </button>

                        <div className="h-px bg-slate-800 my-0.5" />

                        <button
                          type="button"
                          onClick={(e) => {
                            setActiveKebabThreadId(null);
                            handlePromptDelete(e, thread.id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2 text-red-400 transition font-medium"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Sidebar Content Layout
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

            {/* Mobile Drawer Close or Desktop Toggle Button */}
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
            3. CONVERSATION AREA (SEARCH & GROUPED THREADS)
        ========================================================= */}
        {showFull && (
          <div className="flex-1 min-h-0 px-3.5 py-2 flex flex-col overflow-hidden">
            {/* Header & Search Bar */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-cyan-400" />
                  <span>Conversations</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                    showArchived ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={showArchived ? 'Show active threads' : 'Show archived threads'}
                >
                  <FolderArchive size={10} />
                  <span>{showArchived ? 'Archived' : 'Active'}</span>
                </button>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Grouped Recent Conversations List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {isLoadingConversations ? (
                <div className="p-3 text-center text-xs text-slate-400 font-mono animate-pulse">
                  กำลังโหลดประวัติ...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-1">
                  <MessageSquare size={16} className="mx-auto text-slate-400" />
                  <div className="text-xs text-slate-400 font-medium">
                    {searchQuery ? 'ไม่พบบทสนทนาที่ค้นหา' : showArchived ? 'ไม่มีรายการจัดเก็บ' : 'ยังไม่มีประวัติการสนทนา'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {searchQuery ? 'ลองใช้คำค้นอื่น' : 'เริ่มต้นสนทนาใหม่เพื่อบันทึกประวัติ'}
                  </div>
                </div>
              ) : showArchived ? (
                renderGroupSection('Archived Conversations', grouped.archived)
              ) : (
                <>
                  {renderGroupSection('Today', grouped.today)}
                  {renderGroupSection('Yesterday', grouped.yesterday)}
                  {renderGroupSection('Previous 7 Days', grouped.previous7Days)}
                  {renderGroupSection('Older', grouped.older)}
                </>
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
      {/* Delete Confirmation Modal */}
      {deleteModalThreadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0D1627] border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 grid place-items-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">ยืนยันการลบบทสนทนา</h3>
                <p className="text-xs text-slate-400">Delete Conversation Thread</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              คุณต้องการลบประวัติการสนทนานี้ถาวรใช่หรือไม่? การดำเนินการนี้จะลบข้อมูลจากระบบและไม่สามารถกู้คืนได้
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalThreadId(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/20"
              >
                ลบข้อมูล (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

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
