export interface SuggestedActivity {
  name: string;
  type: 'attraction' | 'dining';
  description: string;
  reason: string;
  lat: number;
  lng: number;
}

export interface UserReview {
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Activity {
  activity: string;
  location: string;
  lat: number;
  lng: number;
  cost: number;
  category: 'Ăn uống' | 'Tham quan' | 'Di chuyển' | 'Lưu trú' | 'Khác';
  description: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  images?: string[];
  preview360Url?: string;
  userReview?: UserReview;
}

export interface DayItinerary {
  day: number;
  morning: Activity;
  afternoon: Activity;
  evening: Activity;
  totalDayCost: number;
  preview360Url?: string;
  logic: string;
}

export interface MapPoint {
  name: string;
  lat: number;
  lng: number;
  type: 'attraction' | 'restaurant' | 'hotel';
  description: string;
  streetViewUrl?: string;
  preview360Url?: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  images?: string[];
  userReview?: UserReview;
}

export interface TravelPlan {
  id?: string;
  tourName: string;
  story: string;
  itinerary: DayItinerary[];
  mapPoints: MapPoint[];
  totalEstimatedCost: number;
  budgetAnalysis: string;
  personalizationLogic: string;
  aiInsight: string;
  createdAt?: string;
  startLocation?: string;
}

export interface VideoScene {
  title: string;
  description: string;
  imagePrompt: string;
}

export interface VideoSummary {
  scenes: VideoScene[];
}

export interface UserPreferences {
  budget: number;
  duration: number;
  travelers: number;
  startLocation: string;
  interests: string[];
  mood: string;
  wishlist: string[];
  profilePicture?: string;
}
