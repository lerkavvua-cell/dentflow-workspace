export type UserKey = 'valeriia' | 'behnia' | 'ilayda' | 'manager';
export type WorkspaceKey = 'valeriia' | 'behnia' | 'ilayda';
export type Presence = 'here' | 'break' | 'lunch' | 'busy' | 'finished';
export type PatientStatus = 'review' | 'correction' | 'approved' | 'sent' | 'archived';
export type Lang = 'ru' | 'en' | 'tr' | 'fa';

export type Message = {
  id: string;
  workspace: WorkspaceKey;
  author: UserKey;
  text: string;
  patient?: string;
  cardLink?: string;
  canvaLink?: string;
  createdAt: number;
};

export type Patient = {
  id: string;
  workspace: WorkspaceKey;
  name: string;
  agent?: string;
  status: PatientStatus;
  cardLink?: string;
  canvaLink?: string;
  createdAt: number;
  updatedAt: number;
};

export type Profile = { key: UserKey; name: string; role: 'Owner' | 'Manager' | 'Planner' | 'Viewer'; };
