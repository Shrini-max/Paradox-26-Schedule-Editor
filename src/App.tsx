import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  Calendar,
  MapPin,
  Tag,
  Check,
  X,
  Clock,
  LayoutGrid,
  Trophy,
  Mic2,
  Cpu,
  Music,
  Tent,
  Gamepad2,
  Dribbble,
  Building,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_CSV_DATA, FestivalEvent } from './constants';
import { 
  parseInitialCSV, 
  getConflictingEventIds, 
  exportToCSV, 
  parseTimeToMinutes,
  getTimeRange,
  formatMinsToTime,
  TIME_OPTIONS
} from './utils';
import { auth, db, signInWithGoogle } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterVenue, setFilterVenue] = useState('All');
  const [filterTimeRange, setFilterTimeRange] = useState('All');
  const [venues, setVenues] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isVenueManagerOpen, setIsVenueManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FestivalEvent>>({});

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Sync with Firestore
  useEffect(() => {
    if (!user) return;

    const eventsRef = collection(db, 'events');
    const venuesRef = collection(db, 'venues');
    const categoriesRef = collection(db, 'categories');

    const unsubscribeEvents = onSnapshot(query(eventsRef), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FestivalEvent));
      setEvents(fetchedEvents);

      // Seed initial data if empty
      if (snapshot.empty) {
        const parsed = parseInitialCSV(INITIAL_CSV_DATA);
        const batch = writeBatch(db);
        parsed.forEach(event => {
          const docRef = doc(eventsRef, event.id);
          batch.set(docRef, { 
            ...event, 
            updatedBy: user.uid,
            updatedByEmail: user.email || 'system',
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
          });
        });
        batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'events'));
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'events'));

    const unsubscribeVenues = onSnapshot(venuesRef, (snapshot) => {
      const fetchedVenues = snapshot.docs.map(doc => doc.id).sort();
      setVenues(fetchedVenues);
    }, err => handleFirestoreError(err, OperationType.LIST, 'venues'));

    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => doc.id).sort();
      setCategories(fetchedCategories);
    }, err => handleFirestoreError(err, OperationType.LIST, 'categories'));

    return () => {
      unsubscribeEvents();
      unsubscribeVenues();
      unsubscribeCategories();
    };
  }, [user]);

  // Derived data
  const days = useMemo(() => ['All', ...new Set(events.map(e => e.day))].sort(), [events]);
  
  // Combine custom venues/categories with any new ones that might appear in events
  const allVenues = useMemo(() => {
    const eventVenues = events.map(e => e.venue);
    return ['All', ...new Set([...venues, ...eventVenues])].sort();
  }, [events, venues]);

  const allCategories = useMemo(() => {
    const eventCategories = events.map(e => e.category);
    return ['All', ...new Set([...categories, ...eventCategories])].sort();
  }, [events, categories]);

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
      
      let matchTime = true;
      if (filterTimeRange !== 'All') {
        const startMins = parseTimeToMinutes(e.time);
        if (filterTimeRange === 'Morning') matchTime = startMins < 720; // Before 12 PM
        else if (filterTimeRange === 'Afternoon') matchTime = startMins >= 720 && startMins < 1020; // 12 PM - 5 PM
        else if (filterTimeRange === 'Evening') matchTime = startMins >= 1020; // 5 PM onwards
      }

      return matchSearch && matchDay && matchCat && matchVenue && matchTime;
    }).sort((a, b) => {
      const dayA = parseInt(a.day.replace(/\D/g, '') || '0');
      const dayB = parseInt(b.day.replace(/\D/g, '') || '0');
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  }, [events, search, filterDay, filterCategory, filterVenue, filterTimeRange]);

  // Handlers
  const handleEdit = (event: FestivalEvent) => {
    setEditingId(event.id);
    setEditForm(event);
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.day || !editForm.time || !user) return;
    
    const eventId = editingId === 'new' ? crypto.randomUUID() : editingId!;
    const eventRef = doc(db, 'events', eventId);
    
    try {
      await setDoc(eventRef, {
        ...editForm,
        id: eventId,
        updatedBy: user.uid,
        updatedByEmail: user.email,
        updatedAt: serverTimestamp(),
        ...(editingId === 'new' ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `events/${eventId}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      setDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      day: days[1] !== 'All' ? days[1] : 'Day 1',
      time: '10:00 AM - 11:00 AM',
      category: allCategories[1] !== 'All' ? allCategories[1] : 'Other',
      venue: allVenues[1] !== 'All' ? allVenues[1] : 'Unknown',
      name: '',
      description: ''
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100"
        >
          <img src="https://iili.io/Btn4eIe.md.png" alt="Paradox Logo" className="w-24 h-24 mx-auto mb-8 drop-shadow-lg" referrerPolicy="no-referrer" />
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Paradox '26</h1>
          <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed">
            Please sign in to manage the official event schedule and collaborate with the team.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Dynamic Header */}
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://iili.io/Btn4eIe.md.png" 
              alt="Paradox Logo" 
              className="w-12 h-12 object-contain drop-shadow-sm" 
              referrerPolicy="no-referrer" 
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Paradox '26</span>
                <span className="text-indigo-600">Schedule</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${conflictingIds.size > 0 || violationIds.size > 0 ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                  {conflictingIds.size > 0 || violationIds.size > 0 ? 'Conflicts Found' : 'Schedule Optimized'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCategoryManagerOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
            >
              <Tag size={16} /> Categories
            </button>
            <button 
              onClick={() => setIsVenueManagerOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
            >
              <MapPin size={16} /> Venues
            </button>
            <button 
              onClick={() => exportToCSV(events)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-all"
            >
              <Download size={16} /> Export
            </button>
            <button 
              onClick={handleAddNew}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
            >
              Add Event
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Modern Filter Bar */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8">
        <div className="bg-white/40 p-2 rounded-[32px] border border-white flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
            <input 
              type="text" 
              placeholder="Search anything..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none shadow-sm"
            />
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto">
            <select 
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="custom-select bg-purple-50/50 text-purple-700 border-purple-100"
            >
              {days.map(d => <option key={d} value={d}>{d === 'All' ? 'All Days' : d}</option>)}
            </select>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="custom-select bg-emerald-50/50 text-emerald-700 border-emerald-100"
            >
              {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'Categories' : c}</option>)}
            </select>
            <select 
              value={filterVenue}
              onChange={(e) => setFilterVenue(e.target.value)}
              className="custom-select bg-blue-50/50 text-blue-700 border-blue-100"
            >
              {allVenues.map(v => <option key={v} value={v}>{v === 'All' ? 'Venues' : v}</option>)}
            </select>
            <select 
              value={filterTimeRange}
              onChange={(e) => setFilterTimeRange(e.target.value)}
              className="custom-select bg-orange-50/50 text-orange-700 border-orange-100"
            >
              <option value="All">All Times</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
          </div>
        </div>
      </div>

      {/* Event Spreadsheet Content */}
      <main className="max-w-7xl mx-auto w-full px-6 pb-20">
        <div className="modern-spreadsheet">
          {/* Header */}
          <div className="spreadsheet-header hidden lg:grid">
            <div className="text-center">State</div>
            <div>Schedule</div>
            <div>Event Details</div>
            <div>Location</div>
            <div>Category</div>
            <div className="text-right pr-4">Action</div>
          </div>

          {/* Body */}
          <div className="flex flex-col">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event) => {
                const hasConflict = conflictingIds.has(event.id);
                const hasViolation = violationIds.has(event.id);
                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`spreadsheet-row ${hasConflict || hasViolation ? 'conflict-row' : ''}`}
                  >
                    <div className="flex justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${hasConflict || hasViolation ? 'bg-red-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}></div>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                        <Clock size={12} className="text-slate-300" />
                        {event.time}
                      </div>
                      <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest pl-4">{event.day}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 tracking-tight">{event.name}</span>
                        {event.updatedByEmail && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-md border border-slate-200 shadow-sm" title={`Last updated by ${event.updatedByEmail}`}>
                            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">BY</span>
                            <span className="text-[9px] font-bold text-slate-600 truncate max-w-[60px]">{(event.updatedByEmail || 'user').split('@')[0]}</span>
                          </div>
                        )}
                      </div>
                      {(hasConflict || hasViolation) && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase tracking-tighter">
                          <AlertCircle size={10} />
                          {hasConflict ? 'Venue Overlap' : 'Ceremony Violation'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-600">
                      {getVenueIcon(event.venue)}
                      <span className="text-xs font-semibold truncate">{event.venue}</span>
                    </div>

                    <div>
                      <span className={`px-3 py-1.5 text-[9px] font-black rounded-xl uppercase tracking-[0.1em] ${getCategoryStyle(event.category)}`}>
                        {event.category}
                      </span>
                    </div>

                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(event)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100 transition-all"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(event.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-slate-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <LayoutGrid size={48} className="opacity-10 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Empty Grid Search</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Status Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="px-6 py-3 bg-slate-900 text-white rounded-full shadow-2xl flex items-center gap-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase">{filteredEvents.length} Events Listed</span>
          </div>
          {conflictingIds.size > 0 && (
            <div className="flex items-center gap-2 border-l border-white/20 pl-6">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-red-200">
                {Math.ceil(conflictingIds.size / 2) + violationIds.size} Issues
              </span>
            </div>
          )}
        </div>
      </div>

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

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Event?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                This action is permanent and cannot be undone. Are you sure you want to remove this event from the schedule?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-200 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                {(() => {
                  const { start: startMins, end: endMins } = getTimeRange(editForm.time || '10:00 AM - 11:00 AM');
                  const startTime = formatMinsToTime(startMins);
                  const endTime = formatMinsToTime(endMins);
                  
                  return (
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
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-mint"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                          <input 
                            type="text"
                            list="cat-options"
                            value={editForm.category || ''}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-mint"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-3xl border border-white shadow-sm">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Clock size={10} /> Beginning
                          </label>
                          <select 
                            value={startTime}
                            onChange={e => setEditForm({ ...editForm, time: `${e.target.value} - ${endTime}` })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                          >
                            {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Clock size={10} /> Finishing
                          </label>
                          <select 
                            value={endTime}
                            onChange={e => setEditForm({ ...editForm, time: `${startTime} - ${e.target.value}` })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                          >
                            {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Venue</label>
                        <input 
                          type="text"
                          list="venue-options"
                          value={editForm.venue || ''}
                          onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-mint"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea 
                          value={editForm.description || ''}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-brand-mint"
                        />
                      </div>
                    </div>
                  );
                })()}
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
                {allCategories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
              </datalist>
              <datalist id="venue-options">
                {allVenues.filter(v => v !== 'All').map(v => <option key={v} value={v} />)}
              </datalist>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryManagerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryManagerOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Manage Festival Categories</h2>
                <button 
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Add New Category</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newCategoryName && !categories.includes(newCategoryName)) {
                              const name = newCategoryName;
                              setNewCategoryName('');
                              try {
                                await setDoc(doc(db, 'categories', name), { name });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.WRITE, `categories/${name}`);
                              }
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-mint"
                          placeholder="e.g. Workshop"
                        />
                        <button 
                          onClick={async () => {
                            if (newCategoryName && !categories.includes(newCategoryName)) {
                              const name = newCategoryName;
                              setNewCategoryName('');
                              try {
                                await setDoc(doc(db, 'categories', name), { name });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.WRITE, `categories/${name}`);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-100"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
    
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Existing Categories</label>
                      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                        {categories.map((category) => {
                          const usageCount = events.filter(e => e.category === category).length;
                          return (
                            <div key={category} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-100 transition-colors">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{category}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                  {usageCount} {usageCount === 1 ? 'Event' : 'Events'} Assigned
                                </span>
                              </div>
                              <button 
                                onClick={async () => {
                                  const confirmMsg = usageCount > 0 
                                    ? `This category is being used by ${usageCount} event(s). Removing it from the master list will not change those events, but it will be removed from your category suggestions. Proceed?`
                                    : null;
                                  
                                  if (confirmMsg && !confirm(confirmMsg)) return;
                                  
                                  try {
                                    await deleteDoc(doc(db, 'categories', category));
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.DELETE, `categories/${category}`);
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
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="px-8 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-200"
                >
                  Done
                </button>
              </div>
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
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newVenueName && !venues.includes(newVenueName)) {
                              const name = newVenueName;
                              setNewVenueName('');
                              try {
                                await setDoc(doc(db, 'venues', name), { name });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.WRITE, `venues/${name}`);
                              }
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-brand-mint"
                          placeholder="e.g. Main Auditorium"
                        />
                        <button 
                          onClick={async () => {
                            if (newVenueName && !venues.includes(newVenueName)) {
                              const name = newVenueName;
                              setNewVenueName('');
                              try {
                                await setDoc(doc(db, 'venues', name), { name });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.WRITE, `venues/${name}`);
                              }
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
                                onClick={async () => {
                                  const confirmMsg = usageCount > 0 
                                    ? `This venue is being used by ${usageCount} event(s). Removing it from the master list will not change those events, but it will be removed from your venue suggestions. Proceed?`
                                    : null;
                                  
                                  if (confirmMsg && !confirm(confirmMsg)) return;
                                  
                                  try {
                                    await deleteDoc(doc(db, 'venues', venue));
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.DELETE, `venues/${venue}`);
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

function getVenueIcon(venue: string) {
  const v = venue.toLowerCase();
  if (v.includes('court') || v.includes('ground') || v.includes('stadium') || v.includes('ball')) 
    return <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100"><Dribbble size={18} /></div>;
  if (v.includes('hall') || v.includes('auditorium') || v.includes('clt') || v.includes('sac')) 
    return <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100"><Mic2 size={18} /></div>;
  if (v.includes('lab') || v.includes('class') || v.includes('nac') || v.includes('rj')) 
    return <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100"><Cpu size={18} /></div>;
  if (v.includes('lawn') || v.includes('outdoor') || v.includes('oat')) 
    return <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100"><Tent size={18} /></div>;
  if (v.includes('arcade') || v.includes('game')) 
    return <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100"><Gamepad2 size={18} /></div>;
  if (v.includes('unwind')) 
    return <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center border border-pink-100"><Music size={18} /></div>;
  return <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"><Building size={18} /></div>;
}

function getCategoryStyle(category: string) {
  const c = category.toLowerCase();
  if (c.includes('sports')) return 'bg-blue-50 text-blue-600 border border-blue-100';
  if (c.includes('technical')) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (c.includes('cultural')) return 'bg-purple-50 text-purple-600 border border-purple-100';
  if (c.includes('central')) return 'bg-orange-50 text-orange-600 border border-orange-100';
  return 'bg-slate-50 text-slate-500 border border-slate-100';
}
