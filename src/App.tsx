import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  Filter,
  Calendar,
  MapPin,
  Tag,
  Check,
  X,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_CSV_DATA, FestivalEvent } from './constants';
import { 
  parseInitialCSV, 
  getConflictingEventIds, 
  exportToCSV, 
  parseTimeToMinutes,
  getTimeRange
} from './utils';

export default function App() {
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterVenue, setFilterVenue] = useState('All');
  const [venues, setVenues] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isVenueManagerOpen, setIsVenueManagerOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [editForm, setEditForm] = useState<Partial<FestivalEvent>>({});

  // Initialize data
  useEffect(() => {
    const parsed = parseInitialCSV(INITIAL_CSV_DATA);
    setEvents(parsed);
    // Extract initial unique venues for the master list
    const initialVenues = [...new Set(parsed.map(e => e.venue))].sort();
    setVenues(initialVenues);
  }, []);

  // Derived data
  const days = useMemo(() => ['All', ...new Set(events.map(e => e.day))].sort(), [events]);
  const categories = useMemo(() => ['All', ...new Set(events.map(e => e.category))].sort(), [events]);
  
  // Combine custom venues with any new ones that might appear in events
  const allVenues = useMemo(() => {
    const eventVenues = events.map(e => e.venue);
    return ['All', ...new Set([...venues, ...eventVenues])].sort();
  }, [events, venues]);

  const conflicts = useMemo(() => getConflictingEventIds(events), [events]);
  const conflictingIds = conflicts.locationConflicts;
  const violationIds = conflicts.ceremonyViolations;

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.description.toLowerCase().includes(search.toLowerCase());
      const matchDay = filterDay === 'All' || e.day === filterDay;
      const matchCat = filterCategory === 'All' || e.category === filterCategory;
      const matchVenue = filterVenue === 'All' || e.venue === filterVenue;
      return matchSearch && matchDay && matchCat && matchVenue;
    }).sort((a, b) => {
      const dayA = parseInt(a.day.replace(/\D/g, '') || '0');
      const dayB = parseInt(b.day.replace(/\D/g, '') || '0');
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  }, [events, search, filterDay, filterCategory, filterVenue]);

  // Handlers
  const handleEdit = (event: FestivalEvent) => {
    setEditingId(event.id);
    setEditForm(event);
  };

  const handleSave = () => {
    if (!editForm.name || !editForm.day || !editForm.time) return;
    
    if (editingId === 'new') {
      const newEvent = { ...editForm, id: crypto.randomUUID() } as FestivalEvent;
      setEvents([...events, newEvent]);
    } else {
      setEvents(events.map(e => e.id === editingId ? { ...e, ...editForm } as FestivalEvent : e));
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      day: days[1] !== 'All' ? days[1] : 'Day 1',
      time: '10:00 AM - 11:00 AM',
      category: categories[1] !== 'All' ? categories[1] : 'Other',
      venue: venues[1] !== 'All' ? venues[1] : 'Unknown',
      name: '',
      description: ''
    });
  };

  return (
    <div className="min-h-screen bg-brand-parchment flex flex-col">
      {/* Top Header Navigation */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-mint rounded-lg"></div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">Paradox Schedule Manager</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${(conflictingIds.size > 0 || violationIds.size > 0) ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              {(conflictingIds.size > 0 || violationIds.size > 0) ? 'Conflict Found' : 'Synced'}
            </span>
          </div>
          <button 
            onClick={() => setIsVenueManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <MapPin size={16} /> Manage Venues
          </button>
          <button 
            onClick={() => exportToCSV(events)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-sage hover:bg-[#c9d4cd] border border-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
          <button 
            onClick={handleAddNew}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-lg shadow-slate-200"
          >
            Add Event
          </button>
        </div>
      </header>

      {/* Toolbar / Filters Section */}
      <div className="p-6 flex flex-col md:flex-row items-center gap-4 bg-white border-b border-slate-50">
        <div className="relative flex-grow w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search events, venues, or descriptions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-mint"
          />
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="bg-pastel-purple border border-purple-100 px-4 py-2 rounded-xl text-sm font-medium text-purple-700 outline-none cursor-pointer flex-1 md:flex-none"
          >
            {days.map(d => <option key={d} value={d}>{d === 'All' ? 'All Days' : d}</option>)}
          </select>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-pastel-green border border-green-100 px-4 py-2 rounded-xl text-sm font-medium text-green-700 outline-none cursor-pointer flex-1 md:flex-none"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <select 
            value={filterVenue}
            onChange={(e) => setFilterVenue(e.target.value)}
            className="bg-pastel-blue border border-blue-100 px-4 py-2 rounded-xl text-sm font-medium text-blue-700 outline-none cursor-pointer flex-1 md:flex-none"
          >
            {allVenues.map(v => <option key={v} value={v}>{v === 'All' ? 'All Venues' : v}</option>)}
          </select>
        </div>
      </div>

      {/* Schedule Editor Main Area */}
      <main className="flex-grow px-6 py-6 overflow-hidden flex flex-col">
        <div className="sleek-container flex-grow flex flex-col">
          {/* Grid Header */}
          <div className="grid-row-layout py-4 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:grid">
            <div className="text-center">Status</div>
            <div>Time & Day</div>
            <div>Event Title</div>
            <div>Venue</div>
            <div>Category</div>
            <div className="text-right px-4">Actions</div>
          </div>

          {/* Table Body */}
          <div className="flex-grow overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`grid-row-layout py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group ${conflictingIds.has(event.id) || violationIds.has(event.id) ? 'conflict-row' : ''}`}
                >
                  <div className="flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${conflictingIds.has(event.id) || violationIds.has(event.id) ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`}></div>
                  </div>
                  
                  <div className="text-sm font-medium flex flex-col">
                    <span className="text-slate-900">{event.time}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{event.day}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 event-title">{event.name}</span>
                    {conflictingIds.has(event.id) && (
                      <span className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-tighter">
                        Conflict Detected: Venue Double Booked
                      </span>
                    )}
                    {violationIds.has(event.id) && (
                      <span className="text-[10px] text-red-600 font-bold uppercase mt-1 tracking-tighter flex items-center gap-1">
                        <AlertCircle size={10} /> Ceremony Violation: No events allowed 1h before/during Opening Ceremony
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-slate-500 flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-300" />
                    {event.venue}
                  </div>

                  <div>
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${getCategoryStyle(event.category)}`}>
                      {event.category}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 px-2">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Calendar size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">No events matches your filter</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredEvents.length} of {events.length} Events 
              {(conflictingIds.size > 0 || violationIds.size > 0) && (
                <span className="ml-2 text-red-500 font-bold">• {Math.ceil(conflictingIds.size / 2) + violationIds.size} Schedule issues found</span>
              )}
            </div>
            <div className="flex gap-4 items-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-mint"></span> System Online
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Meta */}
      <footer className="px-8 py-3 bg-[#FAF9F6] border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
        <div className="flex gap-6">
          <span>Schedule Editor v3.0</span>
          <span>Sorting: Day → Time</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-peach"></span> Layout Balanced</span>
        </div>
      </footer>

      {/* Edit Modal remains similar but styled with theme */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingId(null); setEditForm({}); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId === 'new' ? 'New Festival Event' : 'Modify Event Details'}
                </h2>
                <button 
                  onClick={() => { setEditingId(null); setEditForm({}); }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Event Name</label>
                    <input 
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-mint outline-none transition-all text-sm font-medium"
                      placeholder="e.g. Closing Plenary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Schedule Day</label>
                      <input 
                        type="text"
                        list="day-options"
                        value={editForm.day || ''}
                        onChange={e => setEditForm({ ...editForm, day: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                      <input 
                        type="text"
                        list="cat-options"
                        value={editForm.category || ''}
                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time Range</label>
                      <input 
                        type="text"
                        value={editForm.time || ''}
                        onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        placeholder="09:00 AM - 10:30 AM"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Venue</label>
                      <input 
                        type="text"
                        list="venue-options"
                        value={editForm.venue || ''}
                        onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea 
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button 
                  onClick={() => { setEditingId(null); setEditForm({}); }}
                  className="px-6 py-2 text-slate-500 text-sm font-bold uppercase tracking-widest hover:text-slate-700"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center gap-2 hover:bg-slate-700"
                >
                  <Check size={16} /> Update Schedule
                </button>
              </div>

              <datalist id="day-options">
                {days.filter(d => d !== 'All').map(d => <option key={d} value={d} />)}
              </datalist>
              <datalist id="cat-options">
                {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
              </datalist>
              <datalist id="venue-options">
                {allVenues.filter(v => v !== 'All').map(v => <option key={v} value={v} />)}
              </datalist>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Venue Management Modal */}
      <AnimatePresence>
        {isVenueManagerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVenueManagerOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Manage Festival Venues</h2>
                <button 
                  onClick={() => setIsVenueManagerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Add New Venue</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newVenueName}
                      onChange={e => setNewVenueName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (newVenueName && !venues.includes(newVenueName) && (setVenues([...venues, newVenueName].sort()), setNewVenueName('')))}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-mint"
                      placeholder="e.g. Main Auditorium"
                    />
                    <button 
                      onClick={() => {
                        if (newVenueName && !venues.includes(newVenueName)) {
                          setVenues([...venues, newVenueName].sort());
                          setNewVenueName('');
                        }
                      }}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-100"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Existing Venues</label>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                    {venues.map((venue) => {
                      const usageCount = events.filter(e => e.venue === venue).length;
                      return (
                        <div key={venue} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{venue}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                              {usageCount} {usageCount === 1 ? 'Event' : 'Events'} Assigned
                            </span>
                          </div>
                          <button 
                            onClick={() => {
                              if (usageCount > 0) {
                                if (confirm(`This venue is being used by ${usageCount} event(s). Removing it from the master list will not change those events, but it will be removed from your venue suggestions. Proceed?`)) {
                                  setVenues(venues.filter(v => v !== venue));
                                }
                              } else {
                                setVenues(venues.filter(v => v !== venue));
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove from master list"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                <button 
                  onClick={() => setIsVenueManagerOpen(false)}
                  className="px-8 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-200"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getCategoryStyle(category: string) {
  const c = category.toLowerCase();
  if (c.includes('sports')) return 'bg-pastel-blue text-blue-700 border border-blue-100';
  if (c.includes('technical')) return 'bg-pastel-green text-green-700 border border-green-100';
  if (c.includes('cultural')) return 'bg-pastel-purple text-purple-700 border border-purple-100';
  if (c.includes('central')) return 'bg-brand-peach text-[#d67e5e] border border-orange-100';
  return 'bg-slate-100 text-slate-500 border border-slate-200';
}
