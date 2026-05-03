import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, parseCurrency } from './lib/utils';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Heart, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Utensils, 
  Camera, 
  Info,
  Map as MapIcon,
  PieChart as ChartIcon,
  Navigation,
  ExternalLink,
  Loader2,
  ShieldCheck,
  X,
  Plus,
  Zap,
  Star,
  Play,
  Video,
  Download,
  MessageSquare,
  Send,
  Trash2,
  ChevronRight,
  Mic,
  MicOff,
  HelpCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { generateTravelPlan, generateVideoSummary, generateSuggestedActivities } from './services/geminiService';
import { Activity, TravelPlan, UserPreferences, MapPoint, VideoSummary, UserReview, SuggestedActivity } from './types';
import { useDebounce } from './hooks/useDebounce';
import PanoramaViewer from './components/PanoramaViewer';
import VideoSummaryModal from './components/VideoSummaryModal';
import MapDisplay from './components/MapDisplay';
import { auth, googleProvider, db } from './lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  Timestamp, 
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';

// --- Types ---

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

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
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Header = ({ 
  onExport, 
  hasPlan, 
  user, 
  photoURL,
  onSignIn, 
  onSignOut,
  onOpenProfileUpload,
  onShowHelp,
  onBook
}: { 
  onExport: () => void, 
  hasPlan: boolean, 
  user: User | null,
  photoURL: string | null,
  onSignIn: () => void,
  onSignOut: () => void,
  onOpenProfileUpload: () => void,
  onShowHelp: () => void,
  onBook: () => void
}) => (
  <header className="fixed top-0 left-0 right-0 z-50 h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <Compass className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">
        Nhóm 9 N03
      </span>
    </div>
    <div className="flex items-center gap-6">
      <button 
        onClick={onShowHelp}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
      >
        <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold hidden sm:inline uppercase tracking-widest">Trợ giúp</span>
      </button>

      <button 
        className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 transition-colors border border-indigo-100 group"
        onClick={onBook}
      >
        <Zap className="w-3 h-3 text-indigo-600 group-hover:scale-125 transition-transform" />
        Đặt Tour Ngay
      </button>
      
      <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
        <button 
          onClick={onExport}
          disabled={!hasPlan}
          className="hidden sm:block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Xuất Lịch Trình
        </button>
        
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{user.displayName || user.email}</p>
              <button 
                onClick={onSignOut}
                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter"
              >
                Đăng xuất
              </button>
            </div>
            <div className="relative group">
              <button 
                onClick={onOpenProfileUpload}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 hover:border-indigo-500 transition-all bg-slate-50 flex items-center justify-center shadow-sm"
              >
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                    {(user.displayName || '?')[0]}
                  </div>
                )}
              </button>
              <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={onSignIn}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </div>
  </header>
);

const InputField = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
      <Icon className="w-3 h-3" />
      {label}
    </label>
    {children}
  </div>
);

const BudgetChart = ({ data }: { data: { name: string, value: number }[] }) => (
  <div className="h-48 w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#94a3b8" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
        />
        <Tooltip 
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const CategoryChart = ({ data }: { data: { name: string, value: number }[] }) => {
  const COLORS = ['#4f46e5', '#818cf8', '#f59e0b', '#10b981', '#64748b'];
  
  return (
    <div className="h-64 w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const BookingModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  plan, 
  user,
  isLoading 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (details: { startDate: string, travelers: number, email: string, phone: string, notes: string }) => void, 
  plan: TravelPlan | null,
  user: User | null,
  isLoading: boolean
}) => {
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [travelers, setTravelers] = React.useState(2);
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  if (!plan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left Side: Summary Panel */}
            <div className="md:w-1/3 bg-slate-900 p-10 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full -ml-16 -mb-16 blur-2xl" />
              
              <div className="relative space-y-6">
                <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 transform rotate-3">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight leading-tight">Xác Nhận <br/>Hành Trình</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">{plan.tourName}</p>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Đảm bảo an toàn 100%</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Star className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Dịch vụ cao cấp</span>
                  </div>
                </div>
              </div>

              <div className="relative mt-12 bg-white/5 backdrop-blur-sm p-6 rounded-[32px] border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng Chi Phí Dự Kiến</p>
                <p className="text-3xl font-black text-white">{formatCurrency(plan.totalEstimatedCost)}</p>
              </div>
            </div>

            {/* Right Side: Form Panel */}
            <div className="md:flex-1 p-10 relative bg-white">
              <button onClick={onClose} className="absolute top-6 right-6 p-3 hover:bg-slate-100 rounded-2xl transition-all hover:rotate-90 z-10">
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Ngày Khởi Hành</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Số Lượng Khách</label>
                    <div className="relative group">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        value={travelers}
                        min="1"
                        onChange={(e) => setTravelers(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email Liên Hệ</label>
                    <input 
                      type="email" 
                      placeholder="your@email.com"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Số Điện Thoại</label>
                    <input 
                      type="tel" 
                      placeholder="0xxx xxx xxx"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Ghi Chú Đặc Biệt</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold h-24 resize-none border-transparent focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    placeholder="Ví dụ: Ăn chay, phòng có view đẹp..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button 
                  disabled={isLoading || !email || !phone}
                  onClick={() => onConfirm({ startDate, travelers, email, phone, notes })}
                  className="relative w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 disabled:opacity-50 overflow-hidden group mt-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Hoàn Tất Đặt Tour
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [reviewingActivity, setReviewingActivity] = useState<{ dayIndex: number, timeSlot: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [videoSummary, setVideoSummary] = useState<VideoSummary | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [savedPlans, setSavedPlans] = useState<TravelPlan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<TravelPlan[]>([]);
  const [activePanorama, setActivePanorama] = useState<{ url: string, title: string } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ activity: Activity, dayIndex: number, timeSlot: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [activeMapPoint, setActiveMapPoint] = useState<MapPoint | null>(null);
  const [historyFilterMonth, setHistoryFilterMonth] = useState('all');
  const [historyFilterYear, setHistoryFilterYear] = useState('all');
  const [historyFilterLocation, setHistoryFilterLocation] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userFirestoreData, setUserFirestoreData] = useState<any>(null);
  const effectivePhotoURL = userFirestoreData?.photoURL || user?.photoURL;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [daySuggestions, setDaySuggestions] = useState<Record<number, SuggestedActivity[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<number, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Lỗi nhận diện giọng nói:', event.error);
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  const startVoiceInput = (onResult: (text: string) => void) => {
    if (!speechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }
    
    speechRecognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    speechRecognition.start();
  };

  const [prefs, setPrefs] = useState<UserPreferences>({
    budget: 10000000,
    duration: 5,
    travelers: 2,
    startLocation: 'Hà Nội, Việt Nam',
    interests: ['Ẩm thực', 'Bảo tàng'],
    mood: 'Khám phá',
    wishlist: []
  });

  const [wishlistInput, setWishlistInput] = useState('');
  const debouncedWishlistInput = useDebounce(wishlistInput, 300);
  const [localStartLocation, setLocalStartLocation] = useState(prefs.startLocation);
  const debouncedStartLocation = useDebounce(localStartLocation, 500);

  useEffect(() => {
    setPrefs(prev => ({ ...prev, startLocation: debouncedStartLocation }));
  }, [debouncedStartLocation]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const moods = ['Phiêu lưu', 'Thư giãn', 'Văn hóa', 'Lãng mạn', 'Chữa lành', 'Khám phá', 'Hành trình cô độc'];
  const interests = ['Ẩm thực', 'Thiên nhiên', 'Lịch sử', 'Mua sắm', 'Đời sống về đêm', 'Bảo tàng', 'Leo núi', 'Sức khỏe'];
  
  const suggestions = [
    'Đà Lạt', 'Phú Quốc', 'Hạ Long', 'Sa Pa', 'Hội An', 'Nha Trang', 'Huế', 'Đà Nẵng', 'Hà Giang', 'Ninh Bình', 'Phan Thiết', 'Cần Thơ',
    'Tokyo', 'Paris', 'Seoul', 'Bangkok', 'Singapore', 'London', 'Kyoto', 'Bali', 'New York', 'Sydney', 'Rome', 'Barcelona'
  ].filter(s => s.toLowerCase().includes(debouncedWishlistInput.toLowerCase()) && !prefs.wishlist.includes(s));

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribePlans: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
      if (unsubscribePlans) {
        unsubscribePlans();
        unsubscribePlans = null;
      }

      if (currentUser) {
        // Sync user to Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // Set up listener for profile data
          unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUserFirestoreData(doc.data());
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`));

          // Listen for plans (both saved and history)
          const plansQuery = query(
            collection(db, 'plans'), 
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          
          unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
            const allPlans: TravelPlan[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data().plan as TravelPlan),
              createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
            }));
            
            const saved = snapshot.docs
              .filter(d => d.data().type === 'saved')
              .map(doc => ({
                id: doc.id,
                ...(doc.data().plan as TravelPlan),
                createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
              }));
            
            const history = snapshot.docs
              .filter(d => d.data().type === 'history')
              .map(doc => ({
                id: doc.id,
                ...(doc.data().plan as TravelPlan),
                createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
              }));

            setSavedPlans(saved);
            setHistoryPlans(history);
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            try {
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
            }
          }
        } catch (error) {
          console.error("Lỗi khi đồng bộ người dùng:", error);
        }
      } else {
        setUserFirestoreData(null);
        // Fallback to local storage if not logged in
        const saved = localStorage.getItem('phi_saved_travel_plans');
        if (saved) {
          try {
            setSavedPlans(JSON.parse(saved));
          } catch (e) {
            console.error('Lỗi khi tải các bản kế hoạch đã lưu:', e);
          }
        }

        const history = localStorage.getItem('phi_travel_history');
        if (history) {
          try {
            setHistoryPlans(JSON.parse(history));
          } catch (e) {
            console.error('Lỗi khi tải lịch sử:', e);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribePlans) unsubscribePlans();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      alert("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEmailLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: email.split('@')[0]
        });
      }
      setShowAuthModal(false);
    } catch (error) {
      console.error("Lỗi xác thực email:", error);
      alert("Xác thực thất bại. Vui lòng kiểm tra lại thông tin.");
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleOpenBooking = () => {
    if (!plan) {
      alert("Vui lòng tạo một kế hoạch du lịch trước khi đặt tour!");
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingDetails: {
    startDate: string;
    travelers: number;
    email: string;
    phone: string;
    notes: string;
  }) => {
    if (!plan) return;
    
    setIsBookingLoading(true);
    try {
      if (user) {
        await addDoc(collection(db, 'bookings'), {
          userId: user.uid,
          planId: plan.id || 'current',
          tourName: plan.tourName,
          startDate: bookingDetails.startDate,
          travelers: bookingDetails.travelers,
          totalPrice: plan.totalEstimatedCost,
          status: 'pending',
          contactEmail: bookingDetails.email,
          contactPhone: bookingDetails.phone,
          notes: bookingDetails.notes,
          createdAt: serverTimestamp()
        });
        alert('Yêu cầu đặt tour của bạn đã được gửi thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
      } else {
        // Simple simulation for non-logged in users
        alert('Cảm ơn bạn! Yêu cầu đặt tour cho "' + plan.tourName + '" đã được ghi nhận. Vui lòng đăng nhập để theo dõi trạng thái tour.');
      }
      setIsBookingModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setIsBookingLoading(false);
    }
  };

  const savePlan = async () => {
    if (!plan) return;
    
    if (user) {
      // Check if already in history/saved to avoid duplicates if possible, or just add
      try {
        await addDoc(collection(db, 'plans'), {
          userId: user.uid,
          type: 'saved',
          plan: plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        alert('Đã lưu hành trình vào tài khoản!');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'plans');
      }
    } else {
      const exists = savedPlans.find(p => p.tourName === plan.tourName);
      if (exists) {
        alert('Hành trình này đã tồn tại trong danh sách đã lưu!');
        return;
      }
      const newSaved = [plan, ...savedPlans].slice(0, 10);
      setSavedPlans(newSaved);
      localStorage.setItem('phi_saved_travel_plans', JSON.stringify(newSaved));
      alert('Đã lưu hành trình vào máy này!');
    }
  };

  const deletePlan = async (tourPlan: TravelPlan) => {
    if (user && tourPlan.id) {
      try {
        await deleteDoc(doc(db, 'plans', tourPlan.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `plans/${tourPlan.id}`);
      }
    } else {
      const newSaved = savedPlans.filter(p => p.tourName !== tourPlan.tourName);
      setSavedPlans(newSaved);
      localStorage.setItem('phi_saved_travel_plans', JSON.stringify(newSaved));
    }
  };

  const deleteHistory = async (tourPlan: TravelPlan) => {
    if (user && tourPlan.id) {
      try {
        await deleteDoc(doc(db, 'plans', tourPlan.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `plans/${tourPlan.id}`);
      }
    } else {
      const newHistory = historyPlans.filter(p => p.tourName !== tourPlan.tourName);
      setHistoryPlans(newHistory);
      localStorage.setItem('phi_travel_history', JSON.stringify(newHistory));
    }
  };

  const exportPlan = () => {
    if (!plan) return;

    const generateHTML = () => {
      const daySections = plan.itinerary.map(day => `
        <div class="day-card">
          <div class="day-header">Ngày ${day.day}</div>
          <div class="activity">
            <div class="time-label">Buổi Sáng</div>
            <div class="activity-title">${day.morning.activity}</div>
            <div class="location">📍 ${day.morning.location}</div>
            <p>${day.morning.description}</p>
            <div class="meta">Chi phí: ${formatCurrency(day.morning.cost)} | ⭐ ${day.morning.rating} (${day.morning.reviewCount})</div>
            <a href="https://www.google.com/maps/search/?api=1&query=${day.morning.lat},${day.morning.lng}" class="maps-link" target="_blank">Xem trên bản đồ</a>
          </div>
          <div class="activity">
            <div class="time-label">Buổi Chiều</div>
            <div class="activity-title">${day.afternoon.activity}</div>
            <div class="location">📍 ${day.afternoon.location}</div>
            <p>${day.afternoon.description}</p>
            <div class="meta">Chi phí: ${formatCurrency(day.afternoon.cost)} | ⭐ ${day.afternoon.rating} (${day.afternoon.reviewCount})</div>
            <a href="https://www.google.com/maps/search/?api=1&query=${day.afternoon.lat},${day.afternoon.lng}" class="maps-link" target="_blank">Xem trên bản đồ</a>
          </div>
          <div class="activity">
            <div class="time-label">Buổi Tối</div>
            <div class="activity-title">${day.evening.activity}</div>
            <div class="location">📍 ${day.evening.location}</div>
            <p>${day.evening.description}</p>
            <div class="meta">Chi phí: ${formatCurrency(day.evening.cost)} | ⭐ ${day.evening.rating} (${day.evening.reviewCount})</div>
            <a href="https://www.google.com/maps/search/?api=1&query=${day.evening.lat},${day.evening.lng}" class="maps-link" target="_blank">Xem trên bản đồ</a>
          </div>
          <div class="day-footer">Tổng chi phí ngày: ${formatCurrency(day.totalDayCost)}</div>
        </div>
      `).join('');

      return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${plan.tourName} - Kế hoạch du lịch</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
            h1 { font-size: 32px; font-weight: 900; color: #0f172a; margin-bottom: 10px; }
            .story { font-style: italic; color: #64748b; margin-bottom: 30px; border-left: 4px solid #4f46e5; padding-left: 20px; }
            .stats { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 40px; }
            .stat-box { background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center; }
            .stat-label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
            .stat-value { font-size: 16px; font-weight: 900; color: #0f172a; }
            .day-card { margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
            .day-header { background: #0f172a; color: white; padding: 10px 20px; font-weight: bold; }
            .activity { padding: 20px; border-bottom: 1px solid #f1f5f9; }
            .time-label { font-size: 10px; font-weight: bold; color: #6366f1; text-transform: uppercase; margin-bottom: 5px; }
            .activity-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .location { font-size: 13px; font-weight: bold; color: #64748b; margin-bottom: 10px; }
            .meta { font-size: 12px; color: #94a3b8; font-weight: bold; margin-top: 10px; }
            .day-footer { background: #f8fafc; padding: 15px 20px; text-align: right; font-weight: bold; }
            .maps-link { display: inline-block; margin-top: 10px; font-size: 12px; color: #4f46e5; text-decoration: none; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${plan.tourName}</h1>
            <div class="story">${plan.story}</div>
            
            <div class="stats">
              <div class="stat-box">
                <div class="stat-label">Tổng Chi Phí</div>
                <div class="stat-value">${formatCurrency(plan.totalEstimatedCost)}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Thời Gian</div>
                <div class="stat-value">${plan.itinerary.length} Ngày</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Bắt Đầu</div>
                <div class="stat-value">${prefs.startLocation}</div>
              </div>
            </div>

            ${daySections}

            <div class="footer">
              <p>Kế hoạch được tạo bởi Nhóm 9 N03 AI - Trình kiến tạo hành trình du lịch tối ưu</p>
              <p>Cung cấp bởi Nhóm 9 N03</p>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    const htmlContent = generateHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-trinh-${plan.tourName.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addWishlistItem = (item: string) => {
    if (item && !prefs.wishlist.includes(item)) {
      setPrefs({ ...prefs, wishlist: [...prefs.wishlist, item] });
      setWishlistInput('');
      setShowSuggestions(false);
    }
  };

  const removeWishlistItem = (item: string) => {
    setPrefs({ ...prefs, wishlist: prefs.wishlist.filter(i => i !== item) });
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateTravelPlan(prefs);
      const planWithMeta: TravelPlan = {
        ...result,
        createdAt: new Date().toISOString(),
        startLocation: prefs.startLocation
      };
      setPlan(planWithMeta);
      if (result.mapPoints.length > 0) {
        setActiveMapPoint(result.mapPoints[0]);
      }

      if (user) {
        try {
          await addDoc(collection(db, 'plans'), {
            userId: user.uid,
            type: 'history',
            plan: result,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'plans');
        }
      } else {
        // Add to history
        const newHistory = [planWithMeta, ...historyPlans.filter(p => p.tourName !== result.tourName)].slice(0, 10);
        setHistoryPlans(newHistory);
        localStorage.setItem('phi_travel_history', JSON.stringify(newHistory));
      }

      setTimeout(() => {
        const resultsEl = document.getElementById('travel-results');
        resultsEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo kế hoạch. Vui lòng thử lại.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = (rating: number, comment: string) => {
    if (!plan || !reviewingActivity) return;

    const newPlan = { ...plan };
    const { dayIndex, timeSlot } = reviewingActivity;
    
    const userReview: UserReview = {
      rating,
      comment,
      createdAt: new Date().toISOString()
    };

    // Deep clone to trigger re-render correctly
    const updatedItinerary = [...newPlan.itinerary];
    updatedItinerary[dayIndex] = {
      ...updatedItinerary[dayIndex],
      [timeSlot]: {
        ...updatedItinerary[dayIndex][timeSlot],
        userReview
      }
    };
    newPlan.itinerary = updatedItinerary;
    
    // Also update mapPoints
    const activityName = newPlan.itinerary[dayIndex][timeSlot].activity;
    const locationName = newPlan.itinerary[dayIndex][timeSlot].location;
    
    newPlan.mapPoints = newPlan.mapPoints.map(point => {
      if (point.name === activityName || point.name === locationName) {
        return { ...point, userReview };
      }
      return point;
    });

    setPlan(newPlan);
    setReviewingActivity(null);
  };

  const deleteReview = (dayIndex: number, timeSlot: 'morning' | 'afternoon' | 'evening') => {
    if (!plan) return;
    const newPlan = { ...plan };
    const updatedItinerary = [...newPlan.itinerary];
    
    const activityName = updatedItinerary[dayIndex][timeSlot].activity;
    const locationName = updatedItinerary[dayIndex][timeSlot].location;

    updatedItinerary[dayIndex] = {
      ...updatedItinerary[dayIndex],
      [timeSlot]: {
        ...updatedItinerary[dayIndex][timeSlot],
        userReview: undefined
      }
    };
    newPlan.itinerary = updatedItinerary;

    newPlan.mapPoints = newPlan.mapPoints.map(point => {
      if (point.name === activityName || point.name === locationName) {
        return { ...point, userReview: undefined };
      }
      return point;
    });

    setPlan(newPlan);
  };

  const handleGenerateVideo = async () => {
    if (!plan) return;
    setGeneratingVideo(true);
    try {
      const summary = await generateVideoSummary(plan);
      setVideoSummary(summary);
      setIsVideoModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo tóm tắt video. Vui lòng thử lại.";
      alert(message);
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleFetchSuggestions = async (dayIndex: number) => {
    if (!plan || loadingSuggestions[dayIndex]) return;
    
    setLoadingSuggestions(prev => ({ ...prev, [dayIndex]: true }));
    try {
      const suggestions = await generateSuggestedActivities(plan.itinerary[dayIndex], prefs);
      setDaySuggestions(prev => ({ ...prev, [dayIndex]: suggestions }));
    } catch (err) {
      console.error("Lỗi khi lấy gợi ý:", err);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [dayIndex]: false }));
    }
  };

  const chartData = plan?.itinerary.map(day => ({
    name: `Ngày ${day.day}`,
    value: Number(day.totalDayCost) || 0
  })) || [];

  const categoryData = useMemo(() => {
    if (!plan) return [];
    const categories: Record<string, number> = {};
    plan.itinerary.forEach(day => {
      [day.morning, day.afternoon, day.evening].forEach(activity => {
        const cat = activity.category || 'Khác';
        categories[cat] = (categories[cat] || 0) + (activity.cost || 0);
      });
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [plan]);

  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const locations = new Set<string>();
    
    historyPlans.forEach(p => {
      if (p.createdAt) {
        years.add(new Date(p.createdAt).getFullYear().toString());
      }
      if (p.startLocation) {
        locations.add(p.startLocation);
      }
    });
    
    return {
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      locations: Array.from(locations).sort()
    };
  }, [historyPlans]);

  const filteredHistoryPlans = useMemo(() => {
    return historyPlans.filter(p => {
      const date = p.createdAt ? new Date(p.createdAt) : null;
      
      const matchMonth = historyFilterMonth === 'all' || (date && (date.getMonth() + 1).toString() === historyFilterMonth);
      const matchYear = historyFilterYear === 'all' || (date && date.getFullYear().toString() === historyFilterYear);
      const matchLocation = !historyFilterLocation || (p.startLocation && p.startLocation.toLowerCase().includes(historyFilterLocation.toLowerCase()));
      
      return matchMonth && matchYear && matchLocation;
    });
  }, [historyPlans, historyFilterMonth, historyFilterYear, historyFilterLocation]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header 
        onExport={exportPlan} 
        hasPlan={!!plan} 
        user={user}
        photoURL={effectivePhotoURL}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onOpenProfileUpload={() => setShowProfileUpload(true)}
        onShowHelp={() => setShowHelpModal(true)}
        onBook={handleOpenBooking}
      />

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <HelpCircle className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Hướng dẫn sử dụng Nhóm 9 N03</h2>
                    <p className="text-slate-500 font-bold text-sm">Tối ưu hóa hành trình của bạn với AI</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-600" />
                      Phát huy sức mạnh AI
                    </h3>
                    <ul className="space-y-3">
                      {[
                        { title: "Chi tiết là chìa khóa", text: "Càng cung cấp nhiều chi tiết về sở thích, AI càng tạo ra lịch trình phù hợp hơn." },
                        { title: "Sử dụng 'Danh sách muốn đi'", text: "Nhập các địa điểm cụ thể bạn KHÔNG THỂ bỏ lỡ, AI sẽ ưu tiên sắp xếp chúng." },
                        { title: "Xác định phong cách", text: "Chọn 'Mood' phù hợp (Khám phá, Nghỉ dưỡng, Thư thái) để AI điều chỉnh tốc độ chuyến đi." }
                      ].map((item, i) => (
                        <li key={i} className="space-y-1">
                          <p className="font-bold text-sm text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Mẹo nhỏ cho bạn
                    </h3>
                    <ul className="space-y-3">
                      {[
                        { title: "Nhập liệu bằng giọng nói", text: "Sử dụng biểu tượng Microphone để mô tả nhanh điểm đến hoặc yêu cầu của bạn." },
                        { title: "Khám phá Panorama 360°", text: "Xem trước không gian các địa điểm nổi tiếng ngay trong ứng dụng." },
                        { title: "Gợi ý thông minh theo ngày", text: "Trong lịch trình chi tiết, bấm 'Gợi ý thêm' để AI tìm các điểm ăn uống gần đó." }
                      ].map((item, i) => (
                        <li key={i} className="space-y-1">
                          <p className="font-bold text-sm text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-2xl p-6 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Lời khuyên từ chuyên gia</p>
                  <p className="font-bold leading-relaxed italic">
                    "Hãy thử kết hợp 'Phượt' với ngân sách vừa phải và các điểm đến ít người biết để có một hành trình Nhóm 9 N03 độc bản và đầy bất ngờ!"
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowHelpModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-900/20"
            >
              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Compass className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">Tham gia Nhóm 9 N03</h2>
                  <p className="text-slate-500 font-semibold">Tối ưu hóa hành trình, lưu giữ kỷ niệm.</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 hover:border-indigo-100 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Đăng nhập bằng Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest leading-none">Hoặc</span></div>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <InputField label="Email" icon={MessageSquare}>
                      <input 
                        type="email" required
                        value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                        placeholder="ten@vi-du.com"
                      />
                    </InputField>
                    <InputField label="Mật khẩu" icon={ShieldCheck}>
                      <input 
                        type="password" required
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                        placeholder="••••••••"
                      />
                    </InputField>
                    <button 
                      type="submit"
                      className="w-full py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      {isEmailLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                    </button>
                  </form>
                </div>

                <button 
                  onClick={() => setIsEmailLogin(!isEmailLogin)}
                  className="w-full text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                >
                  {isEmailLogin ? 'Bạn chưa có tài khoản?' : 'Bạn đã có tài khoản?'}
                </button>
              </div>

              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Upload Modal */}
      <AnimatePresence>
        {showProfileUpload && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProfileUpload(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <h3 className="text-xl font-bold text-center">Cập nhật ảnh đại diện</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner">
                  {effectivePhotoURL ? (
                    <img src={effectivePhotoURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <Camera className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <label className="w-full">
                  <div className="w-full py-4 bg-slate-900 text-white font-bold uppercase tracking-widest rounded-xl text-center cursor-pointer hover:bg-slate-800 transition-all">
                    Chọn ảnh mới
                  </div>
                  <input 
                    type="file" className="hidden" accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const src = reader.result as string;
                          try {
                            const path = `users/${user.uid}`;
                            
                            // Only update Auth profile if the URL is relatively short
                            // Firebase Auth has a limit around 2KB for photoURL
                            if (src.length < 2000) {
                              await updateProfile(user, { photoURL: src });
                            }
                            
                            // Always update Firestore, which can handle much larger strings (up to 1MB)
                            await setDoc(doc(db, 'users', user.uid), {
                              photoURL: src,
                              updatedAt: serverTimestamp()
                            }, { merge: true });
                            setShowProfileUpload(false);
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <button 
                  onClick={async () => {
                    const randomSeed = Math.floor(Math.random() * 1000000);
                    const avatarUrl = `https://picsum.photos/seed/${randomSeed}/500/500`;
                    try {
                      const path = `users/${user.uid}`;
                      await updateProfile(user, { photoURL: avatarUrl });
                      await setDoc(doc(db, 'users', user.uid), {
                        photoURL: avatarUrl,
                        updatedAt: serverTimestamp()
                      }, { merge: true });
                      setShowProfileUpload(false);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                    }
                  }}
                  className="w-full py-4 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Tạo ảnh ngẫu nhiên
                </button>
              </div>
              <button 
                onClick={() => setShowProfileUpload(false)}
                className="w-full text-slate-400 font-bold uppercase tracking-widest text-sm hover:text-slate-600"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Input Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <motion.h1 
              className="text-5xl md:text-7xl font-black tracking-tight text-slate-900"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Kiến Tạo <span className="text-indigo-600">Hành Trình</span> Của Bạn.
            </motion.h1>
            <p className="text-slate-500 text-lg max-w-xl mx-auto font-semibold">
              Hãy cho chúng tôi biết tâm trạng, ngân sách và ước mơ của bạn.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <InputField label="Điểm Khởi Hành" icon={MapPin}>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                    placeholder="Ví dụ: Tokyo, Nhật Bản"
                    value={localStartLocation}
                    onChange={e => setLocalStartLocation(e.target.value)}
                  />
                  <button 
                    onClick={() => startVoiceInput((text) => setLocalStartLocation(text))}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isListening ? 'text-indigo-600 bg-indigo-50 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                    title="Nhập bằng giọng nói"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </InputField>

              <InputField label="Thời Gian (Ngày)" icon={Calendar}>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  value={prefs.duration || 0}
                  onChange={e => setPrefs({...prefs, duration: parseInt(e.target.value) || 0})}
                />
              </InputField>

              <InputField label="Số Người Tham Gia" icon={Users}>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPrefs({...prefs, travelers: Math.max(1, prefs.travelers - 1)})}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all font-bold text-lg"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="1" max="100"
                    className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold text-center"
                    value={prefs.travelers}
                    onChange={e => setPrefs({...prefs, travelers: parseInt(e.target.value) || 1})}
                  />
                  <button 
                    onClick={() => setPrefs({...prefs, travelers: Math.min(100, prefs.travelers + 1)})}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </InputField>

              <InputField label="Tổng Ngân Sách (₫)" icon={DollarSign}>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  value={formatCurrency(prefs.budget, false)}
                  onChange={e => {
                    const val = parseCurrency(e.target.value);
                    setPrefs({...prefs, budget: val});
                  }}
                />
              </InputField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputField label="Điểm Đến Ưu Tiên" icon={Zap}>
                <div className="relative">
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-grow">
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                        placeholder="Nhập địa điểm bạn muốn đến..."
                        value={wishlistInput}
                        onChange={e => {
                          setWishlistInput(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addWishlistItem(wishlistInput);
                          }
                        }}
                      />
                      <button 
                        onClick={() => startVoiceInput((text) => {
                          setWishlistInput(text);
                          setShowSuggestions(true);
                        })}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isListening ? 'text-indigo-600 bg-indigo-50 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="Nhập bằng giọng nói"
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                    <button 
                      onClick={() => addWishlistItem(wishlistInput)}
                      className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && wishlistInput && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            addWishlistItem(s);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                        >
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Wishlist Tags */}
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {prefs.wishlist.map(item => (
                        <motion.span
                          key={item}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-100 flex items-center gap-2 shadow-sm"
                        >
                          {item}
                          <button 
                            onClick={() => removeWishlistItem(item)}
                            className="hover:text-indigo-900 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </InputField>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapIcon className="w-3 h-3" />
                  Xem Trước Lộ Trình Ước Tính
                </label>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl h-[120px] relative overflow-hidden flex items-center justify-center">
                  {prefs.wishlist.length > 0 ? (
                    <iframe 
                      className="w-full h-full grayscale opacity-50 contrast-125"
                      frameBorder="0" 
                      src={`https://www.google.com/maps?q=${encodeURIComponent(prefs.wishlist[prefs.wishlist.length - 1])}&output=embed`}
                    ></iframe>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase brightness-90">Bản đồ sẽ hiển thị khi bạn thêm điểm đến</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputField label="Tâm Trạng / Vibe" icon={Heart}>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold appearance-none"
                  value={prefs.mood}
                  onChange={e => setPrefs({...prefs, mood: e.target.value})}
                >
                  {moods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </InputField>

              <InputField label="Sở Thích" icon={Sparkles}>
                <div className="flex flex-wrap gap-2">
                  {interests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        const newInterests = prefs.interests.includes(interest) 
                          ? prefs.interests.filter(i => i !== interest)
                          : [...prefs.interests, interest];
                        setPrefs({...prefs, interests: newInterests});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        prefs.interests.includes(interest) 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </InputField>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold uppercase tracking-[0.15em] rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang Tối Ưu Kế Hoạch...
                  </>
                ) : (
                  <>
                    Tạo Lịch Trình
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <AnimatePresence>
        {plan && (
          <motion.section 
            id="travel-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-slate-200"
          >
            <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-screen">
              
              {/* Left Sidebar: Context & Personalization */}
              <aside className="w-full lg:w-80 border-r border-slate-200 bg-white p-8 flex flex-col gap-10 shrink-0">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Thông Số Chuyến Đi</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tổng Đầu Tư</p>
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(plan.totalEstimatedCost)}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Kiểm Soát Ngân Sách Hoạt Động</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Hành trình đã lưu</h3>
                  <div className="space-y-2">
                    {savedPlans.length > 0 ? (
                      savedPlans.map((p, idx) => (
                        <div key={idx} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-all">
                          <button 
                            onClick={() => {
                              setPlan(p);
                              if (p.mapPoints.length > 0) setActiveMapPoint(p.mapPoints[0]);
                            }}
                            className="text-[11px] font-bold text-slate-700 truncate max-w-[150px] text-left hover:text-indigo-600"
                          >
                            {p.tourName}
                          </button>
                          <button 
                            onClick={() => deletePlan(p)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Chưa có hành trình nào được lưu.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lịch sử chuyến đi</h3>
                    {historyPlans.length > 0 && (
                      <button 
                        onClick={() => {
                          setHistoryFilterMonth('all');
                          setHistoryFilterYear('all');
                          setHistoryFilterLocation('');
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>

                  {historyPlans.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tháng</label>
                        <select 
                          value={historyFilterMonth}
                          onChange={(e) => setHistoryFilterMonth(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="all">Tất cả</option>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={(i + 1).toString()}>Tháng {i + 1}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Năm</label>
                        <select 
                          value={historyFilterYear}
                          onChange={(e) => setHistoryFilterYear(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="all">Tất cả</option>
                          {filterOptions.years.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Khởi hành từ</label>
                        <div className="relative">
                          <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Tìm địa điểm..."
                            value={historyFilterLocation}
                            onChange={(e) => setHistoryFilterLocation(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredHistoryPlans.length > 0 ? (
                      filteredHistoryPlans.map((p, idx) => (
                        <div key={idx} className="group flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all opacity-80 hover:opacity-100">
                          <div className="flex items-center justify-between mb-1">
                            <button 
                              onClick={() => {
                                setPlan(p);
                                if (p.mapPoints.length > 0) setActiveMapPoint(p.mapPoints[0]);
                              }}
                              className="text-[11px] font-bold text-slate-600 truncate max-w-[150px] text-left hover:text-indigo-600"
                            >
                              {p.tourName}
                            </button>
                            <button 
                              onClick={() => deleteHistory(p)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                            {p.createdAt && (
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-2 h-2" />
                                {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                            {p.startLocation && (
                              <span className="flex items-center gap-0.5 truncate max-w-[80px]">
                                <MapPin className="w-2 h-2" />
                                {p.startLocation}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        {historyPlans.length > 0 ? "Không tìm thấy kết quả phù hợp." : "Lịch sử trống."}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tại sao chọn các địa điểm này?</h3>
                  <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 relative overflow-hidden">
                    <Sparkles className="absolute -top-2 -right-2 w-12 h-12 opacity-10" />
                    <p className="text-xs leading-relaxed font-bold">
                      "{plan.personalizationLogic}"
                    </p>
                  </div>
                </section>

                <section className="mt-auto hidden lg:block">
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giao Thức Tối Ưu</p>
                    <p className="text-[11px] text-slate-500 italic">Lộ trình được tối ưu cho tâm trạng {prefs.mood.toLowerCase()} và hiệu quả chi phí.</p>
                  </div>
                </section>
              </aside>

              {/* Middle: Itinerary */}
              <main className="flex-grow p-8 md:p-12 space-y-12 bg-white">
                <div className="space-y-6 max-w-4xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-[11px] font-black rounded-lg uppercase tracking-[0.1em]">
                          Tâm trạng: {prefs.mood}
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-[800px]">
                          {plan.tourName}
                        </h2>
                      </div>
                      <div className="flex gap-3 flex-shrink-0">
                        <button 
                          onClick={handleGenerateVideo}
                          disabled={generatingVideo}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-900 whitespace-nowrap md:self-start disabled:opacity-50"
                        >
                          {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                          Tóm Tắt Video
                        </button>
                        <button 
                          onClick={savePlan}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 whitespace-nowrap md:self-start"
                        >
                          <Plus className="w-4 h-4" />
                          Lưu Hành Trình
                        </button>
                      </div>
                    </div>
                  <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line font-medium italic">"{plan.story.split('\n')[0]}"</p>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1 items-center md:items-start">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng Chi Phí</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(plan.itinerary.reduce((sum, day) => sum + day.totalDayCost, 0))}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1 items-center md:items-start">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời Gian</p>
                      <p className="text-lg font-black text-slate-900">{plan.itinerary.length} Ngày</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1 items-center md:items-start">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-1">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm Đến</p>
                      <p className="text-lg font-black text-slate-900">{plan.mapPoints.length} Địa điểm</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    <MapIcon className="w-3 h-3" />
                    Bản Đồ Hành Trình
                  </div>
                  <MapDisplay points={plan.mapPoints} onViewPanorama={(url, title) => setActivePanorama({ url, title })} />
                </motion.div>

                {/* Daily Timeline */}
                <div className="space-y-16">
                  {plan.itinerary.map((day) => (
                    <div key={day.day} className="space-y-8">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <button className="px-6 py-3 bg-slate-900 text-white rounded-full text-xs font-bold ring-4 ring-slate-100 shrink-0">
                            Ngày {day.day.toString().padStart(2, '0')}
                          </button>
                          <div className="h-px flex-grow bg-slate-100" />
                        </div>
                        <button 
                          onClick={() => handleFetchSuggestions(plan.itinerary.indexOf(day))}
                          disabled={loadingSuggestions[plan.itinerary.indexOf(day)]}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 disabled:opacity-50 group shrink-0"
                        >
                          {loadingSuggestions[plan.itinerary.indexOf(day)] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3 group-hover:scale-125 transition-transform" />
                          )}
                          Gợi ý thêm địa điểm
                        </button>
                      </div>

                      {/* AI Suggestions Display */}
                      <AnimatePresence>
                        {daySuggestions[plan.itinerary.indexOf(day)] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4"
                          >
                            {daySuggestions[plan.itinerary.indexOf(day)].map((suggestion, idx) => (
                              <div key={idx} className="p-4 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-2xl space-y-2 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                  {suggestion.type === 'attraction' ? <Sparkles className="w-8 h-8 text-indigo-600" /> : <Utensils className="w-8 h-8 text-indigo-600" />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${suggestion.type === 'attraction' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {suggestion.type === 'attraction' ? 'Địa điểm' : 'Ăn uống'}
                                  </span>
                                  <h5 className="text-xs font-black text-slate-900 truncate flex-1">{suggestion.name}</h5>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{suggestion.description}</p>
                                <div className="pt-2 border-t border-indigo-50">
                                  <p className="text-[9px] text-indigo-600 font-bold italic leading-snug">AI: "{suggestion.reason}"</p>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <a 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${suggestion.lat},${suggestion.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] font-black text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                                  >
                                    <Navigation className="w-2.5 h-2.5" />
                                    Xem đường đi
                                  </a>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { title: 'Sáng', data: day.morning, time: '08:30', icon: Clock },
                          { title: 'Chiều', data: day.afternoon, time: '13:00', icon: Camera },
                          { title: 'Tối', data: day.evening, time: '19:00', icon: Utensils }
                        ].map((slot, i) => (
                            <div 
                              key={i} 
                              className="group relative flex items-start gap-6 p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-lg transition-all hover:border-indigo-100 cursor-pointer overflow-hidden"
                              onClick={() => setSelectedDetail({ activity: slot.data, dayIndex: plan.itinerary.indexOf(day), timeSlot: (['morning', 'afternoon', 'evening'][i] as any) })}
                            >
                              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Info className="w-4 h-4 text-indigo-400" />
                              </div>
                            <div className="text-center w-12 pt-1">
                              <p className="text-xs font-black text-slate-900">{slot.time}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{i === 2 ? 'PM' : i === 0 ? 'AM' : 'PM'}</p>
                            </div>
                            <div className="space-y-2 flex-grow">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-base text-slate-900">{slot.data.activity}</h4>
                                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded uppercase border border-slate-100">{formatCurrency(slot.data.cost)}</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{slot.data.description}</p>
                              <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded text-orange-600">
                                  <Star className="w-2.5 h-2.5 fill-orange-600" />
                                  <span className="text-[10px] font-black">{slot.data.rating}</span>
                                  <span className="text-[9px] text-orange-400 font-bold">({slot.data.reviewCount})</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-500" /> {slot.data.location}
                                </span>
                                {slot.data.openingHours && (
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-500" /> {slot.data.openingHours}
                                  </span>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewingActivity({ dayIndex: plan.itinerary.indexOf(day), timeSlot: (['morning', 'afternoon', 'evening'][i] as any) });
                                  }}
                                  className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                                    slot.data.userReview 
                                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {slot.data.userReview ? 'Xem/Sửa Đánh giá' : 'Đánh giá'}
                                </button>
                                {(slot.data.preview360Url || day.preview360Url) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePanorama({ 
                                        url: slot.data.preview360Url || day.preview360Url!, 
                                        title: slot.data.location 
                                      });
                                    }}
                                    className="text-[10px] text-indigo-600 font-bold hover:text-indigo-800 transition-colors flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg group"
                                  >
                                    <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                                    Xem Panorama 360°
                                  </button>
                                )}
                                <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${slot.data.lat},${slot.data.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-slate-600 font-bold hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg group"
                                >
                                  <Navigation className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                  Chỉ đường
                                </a>
                              </div>
                            </div>
                            {slot.data.userReview && (
                              <div className="absolute top-full left-14 right-5 mt-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl z-10">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} className={`w-2.5 h-2.5 ${star <= slot.data.userReview!.rating ? 'fill-emerald-500 text-emerald-500' : 'text-emerald-200'}`} />
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-700">Đánh giá của bạn</span>
                                  </div>
                                  <button 
                                    onClick={() => deleteReview(plan.itinerary.indexOf(day), (['morning', 'afternoon', 'evening'][i] as any))}
                                    className="text-emerald-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-emerald-800 italic leading-snug">"{slot.data.userReview.comment}"</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </main>

                {/* Right Sidebar: Optimized Data */}
                <aside className="w-full lg:w-80 bg-slate-50 p-8 flex flex-col gap-8 shrink-0 border-l border-slate-200 overflow-y-auto">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi Phí Theo Ngày</h3>
                    <BudgetChart data={chartData} />
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân Bổ Hạng Mục</h3>
                    <CategoryChart data={categoryData} />
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân Tích AI</h3>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium italic">
                      "{plan.budgetAnalysis}"
                    </div>
                  </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa Điểm</h3>
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
                    <div className="h-48 bg-slate-100 relative">
                       {activeMapPoint ? (
                         <iframe
                           width="100%"
                           height="100%"
                           frameBorder="0"
                           scrolling="no"
                           marginHeight={0}
                           marginWidth={0}
                           src={`https://maps.google.com/maps?q=${activeMapPoint.lat},${activeMapPoint.lng}&hl=vi&z=14&output=embed`}
                           className="grayscale contrast-110"
                         ></iframe>
                       ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:15px_15px]"></div>
                           <div className="p-2 bg-indigo-600 rounded-lg text-white font-bold text-[10px] z-10">BẢN ĐỒ HOẠT ĐỘNG</div>
                         </div>
                       )}
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto max-h-64">
                      {plan.mapPoints.map((point, i) => (
                        <button 
                          key={i} 
                          onClick={() => setActiveMapPoint(point)}
                          className={`w-full flex items-center gap-3 text-left p-2 rounded-xl transition-all ${activeMapPoint?.name === point.name ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activeMapPoint?.name === point.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <MapPin className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-grow">
                            <div className="flex justify-between items-center gap-2">
                              <p className={`text-[11px] font-bold truncate ${activeMapPoint?.name === point.name ? 'text-indigo-600' : 'text-slate-600'}`}>{point.name}</p>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Star className={`w-2.5 h-2.5 ${activeMapPoint?.name === point.name ? 'fill-indigo-600 text-indigo-600' : 'fill-orange-400 text-orange-400'}`} />
                                <span className={`text-[9px] font-black ${activeMapPoint?.name === point.name ? 'text-indigo-600' : 'text-slate-600'}`}>{point.rating}</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{point.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
                
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                    ✦ AI Insight
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {plan.aiInsight}
                  </p>
                </div>
              </aside>

            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="py-12 px-8 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">Nhóm 9 N03</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400">Cung cấp bởi Nhóm 9 N03</p>
          <div className="flex gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <button className="hover:text-indigo-600">Tích hợp</button>
            <button className="hover:text-indigo-600">Bảo mật</button>
          </div>
        </div>
      </footer>

      {activePanorama && (
        <PanoramaViewer 
          imageUrl={activePanorama.url} 
          title={activePanorama.title} 
          onClose={() => setActivePanorama(null)} 
        />
      )}

      <AnimatePresence>
        {isVideoModalOpen && videoSummary && (
          <VideoSummaryModal 
            summary={videoSummary} 
            onClose={() => setIsVideoModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onConfirm={handleConfirmBooking}
        plan={plan}
        user={user}
        isLoading={isBookingLoading}
      />

      {/* Review Modal */}
      <AnimatePresence>
        {reviewingActivity && plan && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingActivity(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Đánh giá hoạt động</h3>
                  <p className="text-xs text-slate-500 font-medium">Chia sẻ trải nghiệm của bạn</p>
                </div>
                <button 
                  onClick={() => setReviewingActivity(null)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <h4 className="font-bold text-indigo-900 text-sm">
                      {plan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].activity}
                    </h4>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-indigo-500" /> {plan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].location}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mức độ hài lòng</label>
                    <div className="flex justify-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            const newPlan = { ...plan };
                            const currentReview = newPlan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview || { comment: '', createdAt: '' };
                            newPlan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview = {
                              ...currentReview,
                              rating: star
                            };
                            setPlan(newPlan);
                          }}
                          className="transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star 
                            className={`w-8 h-8 ${
                              star <= (plan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview?.rating || 0)
                                ? 'fill-orange-500 text-orange-500' 
                                : 'text-slate-300'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhận xét của bạn</label>
                    <textarea 
                      className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-300"
                      placeholder="Bạn thấy địa điểm này như thế nào? (đồ ăn ngon, phong cảnh đẹp...)"
                      value={plan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview?.comment || ''}
                      onChange={(e) => {
                        const newPlan = { ...plan };
                        const currentReview = newPlan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview || { rating: 0, createdAt: '' };
                        newPlan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview = {
                          ...currentReview,
                          comment: e.target.value
                        };
                        setPlan(newPlan);
                      }}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const review = plan.itinerary[reviewingActivity.dayIndex][reviewingActivity.timeSlot].userReview;
                    if (review && review.rating > 0) {
                      handleSaveReview(review.rating, review.comment);
                    } else {
                      alert('Vui lòng chọn số sao đánh giá.');
                    }
                  }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Lưu Đánh Giá
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetail(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Close Button UI */}
              <button 
                onClick={() => setSelectedDetail(null)}
                className="absolute top-6 right-6 z-20 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Hero Image Section */}
              <div className="relative h-64 md:h-80 flex-shrink-0">
                <img 
                  src={selectedDetail.activity.images?.find(img => img.length > 0) || `https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80`} 
                  alt={selectedDetail.activity.activity}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em]">
                      {selectedDetail.timeSlot === 'morning' ? 'Buổi Sáng' : selectedDetail.timeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}
                    </span>
                    <div className="flex items-center gap-1 bg-orange-500/90 backdrop-blur px-2 py-0.5 rounded text-white shadow-lg">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span className="text-[10px] font-black">{selectedDetail.activity.rating}</span>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white leading-tight drop-shadow-lg">{selectedDetail.activity.activity}</h2>
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Location & Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vị Trí</p>
                      <p className="text-sm font-bold text-slate-900">{selectedDetail.activity.location}</p>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Giờ Mở Cửa</p>
                      <p className="text-sm font-bold text-slate-900">{selectedDetail.activity.openingHours || 'Liên hệ trực tiếp'}</p>
                    </div>
                  </div>
                </div>

                {/* Mini Map */}
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-500" />
                    Vị Trí Thực Tế & Địa Hình (Vệ Tinh)
                  </h3>
                  <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-md">
                    <MapDisplay 
                      height="250px"
                      points={[{
                        name: selectedDetail.activity.activity,
                        lat: selectedDetail.activity.lat,
                        lng: selectedDetail.activity.lng,
                        type: selectedDetail.timeSlot === 'evening' ? 'restaurant' : 'attraction',
                        description: selectedDetail.activity.description,
                        rating: selectedDetail.activity.rating,
                        openingHours: selectedDetail.activity.openingHours,
                        preview360Url: selectedDetail.activity.preview360Url,
                        userReview: selectedDetail.activity.userReview
                      }]}
                      onViewPanorama={(url, title) => {
                        setActivePanorama({ url, title });
                        setSelectedDetail(null);
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-500" />
                    Giới Thiệu
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedDetail.activity.description}
                  </p>
                </div>

                {/* Image Gallery */}
                {selectedDetail.activity.images && selectedDetail.activity.images.filter(img => img.length > 0).length > 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">Hình ảnh liên quan</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedDetail.activity.images.filter(img => img.length > 0).slice(1).map((img, idx) => (
                        <motion.div 
                          key={idx}
                          whileHover={{ scale: 1.05 }}
                          className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-slate-100"
                        >
                          <img 
                            src={img} 
                            alt={`Gallery ${idx}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost & Action */}
                <div className="p-6 bg-slate-900 rounded-[24px] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Chi phí ước tính</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(selectedDetail.activity.cost)} <span className="text-sm text-slate-400">/ người</span></p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.activity.lat},${selectedDetail.activity.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
                  >
                    <Navigation className="w-4 h-4 text-indigo-600" />
                    Chỉ đường
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
