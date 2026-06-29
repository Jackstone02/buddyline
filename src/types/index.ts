// ─── User Roles & Status ───────────────────────────────────────────────────
export type UserRole = 'beginner' | 'certified' | 'instructor' | 'admin';
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type DiveRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
export type DiveSessionStatus = 'open' | 'full' | 'cancelled' | 'completed';
export type DiveType = 'line_training' | 'fun_dive' | 'spearfishing' | 'pool' | 'dynamic' | 'static' | 'other';
export type Discipline =
  | 'pool'
  | 'depth'
  | 'spearfishing'
  | 'dynamic'
  | 'static'
  | 'line_training';

// ─── Database Row Types (snake_case mirrors Supabase columns) ──────────────

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  city_region: string;
  bio: string;
  avatar_url: string | null;
  age_confirmed: boolean;
  tos_accepted_at: string | null;
  verification_status: VerificationStatus;
  available_to_dive: boolean;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  rejection_reason?: string | null;
}

export interface CertifiedProfile {
  id: string;
  cert_level: string;
  agency: string;
  years_experience: number;
  max_depth_m: number | null;
  disciplines: Discipline[];
  cert_card_url: string;
}

export interface InstructorProfile {
  id: string;
  teaching_location: string;
  agencies: string[];
  certs_offered: string[];
  years_teaching: number;
  credentials_url: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: string; display_name: string };
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

// ─── Booking Types ─────────────────────────────────────────────────────────

export interface LessonType {
  id: string;
  instructor_id: string;
  name: string;
  duration_minutes: number;
  skill_level: string;
  session_format: string;
  price: number;
  max_participants: number;
}

export interface AvailabilitySlot {
  id: string;
  instructor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface Booking {
  id: string;
  customer_id: string;
  instructor_id: string;
  lesson_type_id: string;
  availability_slot_id: string;
  booking_date: string;
  start_time: string;
  participants_count: number;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  // joined relations
  instructor?: any;
  customer?: any;
  lesson_type?: any;
}

export interface DiveRequest {
  id: string;
  requester_id: string;
  buddy_id: string;
  requested_date: string;
  location_name: string;
  disciplines: Discipline[];
  notes: string | null;
  status: DiveRequestStatus;
  created_at: string;
  // joined
  requester?: any;
  buddy?: any;
}

export interface DiveSession {
  id: string;
  creator_id: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_at: string;
  max_depth_m: number | null;
  dive_type: DiveType | null;
  spots_needed: number;
  notes: string | null;
  status: DiveSessionStatus;
  created_at: string;
  // joined
  creator?: any;
  member_count?: number;
}

export interface DiveSessionMember {
  session_id: string;
  user_id: string;
  joined_at: string;
  user?: any;
}

export interface Rating {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  booking_id: string | null;
  score: number; // 1–5
  comment: string | null;
  created_at: string;
  // joined
  reviewer?: any;
}

export type DiveLogDiscipline = 'pool' | 'depth' | 'dynamic' | 'static' | 'spearfishing' | 'other';

export interface DiveLog {
  id: string;
  diver_id: string;
  buddy_id: string | null;
  log_date: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  max_depth_m: number | null;
  duration_min: number | null;
  discipline: DiveLogDiscipline | null;
  notes: string | null;
  created_at: string;
}

// ─── Navigation Param Lists ────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  RoleSelection: undefined;
  SocialOnboarding: undefined;
  ProfileSetup: { role: UserRole };
  VerificationPending: undefined;
  TermsOfService: { nextRoute?: 'BeginnerTabs' | 'CertifiedTabs' | 'InstructorTabs' | 'VerificationPending' };
  Safety: { nextRoute: 'BeginnerTabs' | 'CertifiedTabs' | 'InstructorTabs' };
  BeginnerTabs: undefined;
  CertifiedTabs: undefined;
  InstructorTabs: undefined;
  Messaging: { otherUserId: string; otherUserName: string };
  InstructorProfile: { instructorId: string };
  BuddyProfile: { buddyId: string };
  Report: { reportedId: string; reportedName: string };
  Settings: undefined;
  ProfileEdit: undefined;
  // Booking routes
  BookingForm: { instructorId: string; lessonTypeId: string };
  BookingConfirmation: { bookingId: string };
  BookingDetail: { bookingId: string };
  InstructorBookingDetail: { bookingId: string };
  // Admin routes
  AdminTabs: undefined;
  AdminUserDetail: { userId: string };
  RoleChange: undefined;
  // Dive request routes
  DiveRequestForm: { buddyId: string; buddyName: string };
  DiveRequestDetail: { requestId: string };
  // Dive session routes (open join model)
  CreateSession: undefined;
  SessionDetail: { sessionId: string };
  SessionsList: undefined;
  // Dive log routes
  DiveLogs: undefined;
  DiveLogForm: { logId?: string } | undefined;
  // Password reset
  ForgotPassword: undefined;
  ResetPassword: { accessToken: string; refreshToken: string };
};

export type FindMode = 'buddy' | 'instructor';

export type AdminTabParamList = {
  Overview: undefined;
  Verifications: undefined;
  Reports: undefined;
};

export type BeginnerTabParamList = {
  Find: { defaultMode: FindMode; showToggle: boolean };
  Schedule: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type CertifiedTabParamList = {
  Home: undefined;
  Find: { defaultMode: FindMode; showToggle: boolean };
  Schedule: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type InstructorTabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  Find: { defaultMode: FindMode; showToggle: boolean };
  Messages: undefined;
  Profile: undefined;
};
