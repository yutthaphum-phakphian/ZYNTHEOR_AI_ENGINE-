import React, { useEffect, useState } from 'react';
import { Search, Database, RefreshCw, FileCode, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';

interface CodebaseStatus {
  indexedFiles: number;
  lastIndexedAt: string | null;
  model: string;
  dimensions: number;
  status: 'IDLE' | 'INDEXING' | 'READY' | 'ERROR' | 'UNCONFIGURED';
  error?: string;
}

interface SearchResult {
  filepath: string;
  relativePath: string;
  score: number;
  snippet: string;
}

export const CodebaseIndexPanel: React.FC = () => {
  const [status, setStatus] = useState<CodebaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/codebase/status');
      const data = await res.json();
      if (data.ok && data.status) {
        setStatus(data.status);
      }
    } catch (e: any) {
      console.error('Failed to load codebase index status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleIndexNow = async () => {
    setIndexing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/codebase/index', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Successfully indexed ${data.indexedCount} files into vector memory.`);
        fetchStatus();
      } else {
        setMessage(`Indexing failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setMessage(`Network error: ${e.message}`);
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setMessage(null);
    try {
      const res = await fetch('/api/codebase/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 5 }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.matches)) {
        setResults(data.matches);
      } else {
        setResults([]);
        if (data.error) setMessage(`Search error: ${data.error}`);
      }
    } catch (e: any) {
      setResults([]);
      setMessage(`Search error: ${e.message}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Index Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${
              status?.status === 'READY' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' :
              status?.status === 'UNCONFIGURED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-lg">Codebase Semantic Memory (RAG)</h3>
                <span className={`px-2 py-0.5 text-xs font-mono rounded uppercase tracking-wider ${
                  status?.status === 'READY' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
                  status?.status === 'UNCONFIGURED' ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' :
                  status?.status === 'INDEXING' ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {status?.status || 'IDLE'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {status?.status === 'UNCONFIGURED'
                  ? 'Gemini API key is unconfigured. Vector embeddings require GEMINI_API_KEY to index the codebase.'
                  : `Indexed ${status?.indexedFiles || 0} source files using model ${status?.model || 'text-embedding-004'} (${status?.dimensions || 768} dim).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleIndexNow}
              disabled={indexing || status?.status === 'UNCONFIGURED'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Sparkles className={`w-4 h-4 ${indexing ? 'animate-spin' : ''}`} />
              {indexing ? 'Indexing Repository...' : 'Index Codebase'}
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
            {message}
          </div>
        )}
      </div>

      {/* Semantic Search Query Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h4 className="font-semibold text-slate-200 text-base mb-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          Semantic Code Search
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Query codebase using natural language intent. Real cosine similarity ranks the most relevant components and logic.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Find authentication middleware and token validation..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim() || status?.status === 'UNCONFIGURED'}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg transition"
          >
            <Search className="w-4 h-4" />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Search Results Display */}
      {searched && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-200 text-sm">
              Search Results ({results.length} matches)
            </h4>
            <span className="text-xs text-slate-500 font-mono">Cosine Similarity Metric</span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No matching files found. Ensure the repository has been indexed.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-mono text-indigo-300">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      <span>{res.relativePath}</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-mono rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                      Similarity: {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <pre className="text-xs font-mono bg-slate-900/80 text-slate-300 p-3 rounded overflow-x-auto border border-slate-800/60 leading-relaxed">
                    {res.snippet}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
