export type UserKey = 'valeriia' | 'behnia' | 'ilayda' | 'manager';
export type WorkspaceKey = 'valeriia' | 'behnia' | 'ilayda';
export type Presence = 'here' | 'break' | 'lunch' | 'busy' | 'finished';
export type PatientStatus = 'review' | 'correction' | 'approved' | 'sent' | 'archived';
export type Lang = 'ru' | 'en' | 'tr' | 'fa';
export type ViewKey = 'today' | 'patients' | 'chats' | 'plans' | 'reports' | 'settings';
export type ThemeKey = 'paper' | 'ocean' | 'forest' | 'sakura' | 'night' | 'swamp' | 'burgundy';

export type FileMeta = {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
};

export type Message = {
  id: string;
  workspace: WorkspaceKey;
  author: UserKey;
  text: string;
  patient?: string;
  cardLink?: string;
  canvaLink?: string;
  file?: FileMeta;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: UserKey;
};

export type Patient = {
  id: string;
  workspace: WorkspaceKey;
  name: string;
  status: PatientStatus;
  doctor?: string;
  agent?: string;
  cardLink?: string;
  canvaLink?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type TaskItem = {
  id: string;
  workspace: WorkspaceKey;
  text: string;
  patientName: string;
  patientNameKey?: string;
  materialLink?: string;
  assignedTo: WorkspaceKey;
  done: boolean;
  createdAt: number;
  completedAt?: number;
};

export type AccessRequest = {
  id: string;
  user: UserKey;
  email: string;
  approved: boolean;
  createdAt: number;
};

export type SystemNotice = {
  id: string;
  type: 'warning' | 'info';
  text: string;
  createdAt: number;
};

export type Profile = {
  key: UserKey;
  name: string;
  role: 'Owner' | 'Manager' | 'Planner';
};

export type ComposerDraft = {
  text: string;
  patient?: string;
  cardLink?: string;
  canvaLink?: string;
  file?: File | null;
};
