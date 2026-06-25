export type DFLang = 'ru' | 'en' | 'tr' | 'he';

export type DFTheme =
  | 'paper'
  | 'ocean'
  | 'forest'
  | 'sakura'
  | 'night';

export type UserKey =
  | 'valeriia'
  | 'behnia'
  | 'ilayda'
  | 'manager';

export type WorkspaceKey =
  | 'valeriia'
  | 'behnia'
  | 'ilayda';

export type Presence =
  | 'here'
  | 'break'
  | 'lunch'
  | 'busy'
  | 'finished';

export type PatientStatus =
  | 'review'
  | 'correction'
  | 'approved'
  | 'sent'
  | 'archived';

export type MenuKey =
  | 'today'
  | 'patients'
  | 'chats'
  | 'plans'
  | 'reports'
  | 'settings';

export type TeamMember = {
  key: UserKey;
  name: string;
  role: string;
  workspace?: WorkspaceKey;
};

export type ChatMessage = {
  id: string;
  workspace: WorkspaceKey;
  author: UserKey;
  text: string;
  patient?: string;
  cardLink?: string;
  canvaLink?: string;
  fileName?: string;
  fileUrl?: string;
  createdAt: number;
};

export type PatientRecord = {
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

export const teamMembers: TeamMember[] = [
  {
    key: 'valeriia',
    name: 'Valeriia',
    role: 'Owner',
    workspace: 'valeriia',
  },
  {
    key: 'behnia',
    name: 'Behnia',
    role: 'Treatment Planner',
    workspace: 'behnia',
  },
  {
    key: 'ilayda',
    name: 'İlayda',
    role: 'Treatment Planner',
    workspace: 'ilayda',
  },
  {
    key: 'manager',
    name: 'Manager',
    role: 'Quality Control',
  },
];

export const workspaces: WorkspaceKey[] = [
  'valeriia',
  'behnia',
  'ilayda',
];

export const workspaceNames: Record<WorkspaceKey, string> = {
  valeriia: 'Valeriia',
  behnia: 'Behnia',
  ilayda: 'İlayda',
};

export const defaultPresence: Record<UserKey, Presence> = {
  valeriia: 'here',
  behnia: 'here',
  ilayda: 'here',
  manager: 'here',
};

export const statusOrder: PatientStatus[] = [
  'review',
  'correction',
  'approved',
  'sent',
  'archived',
];

export const notificationPets = [
  '🐱',
  '🐶',
  '🐰',
  '🐘',
  '🦊',
];

export function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function now() {
  return Date.now();
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export function getNextStatus(status: PatientStatus): PatientStatus {
  const currentIndex = statusOrder.indexOf(status);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= statusOrder.length) {
    return status;
  }

  return statusOrder[nextIndex];
}

export function randomPet() {
  return notificationPets[
    Math.floor(Math.random() * notificationPets.length)
  ];
}

export const ui: Record<DFLang, Record<string, string>> = {
  ru: {
    appName: 'DentFlow',
    workspace: 'Рабочее пространство',
    welcome: 'Добро пожаловать',
    welcomeSubtitle: 'Выбери настроение, язык и начни рабочий день спокойно.',
    chooseLanguage: 'Язык',
    chooseTheme: 'Тема',
    startWork: 'Начать работу',

    today: 'Сегодня',
    patients: 'Пациенты',
    chats: 'Чаты команды',
    plans: 'Планы лечения',
    reports: 'Отчёты',
    settings: 'Настройки',

    searchPlaceholder: 'Поиск: пациент, врач, агент, Canva, карточка, сообщения...',
    cloudActive: 'Cloud-синхронизация активна',
    localMode: 'Локальный режим',

    here: 'Я здесь',
    break: 'Перерыв',
    lunch: 'Обед',
    busy: 'Занят',
    finished: 'Закончил работу',

    teamOnline: 'Команда онлайн',
    owner: 'Owner',
    planner: 'Планировщик лечения',
    qualityControl: 'Контроль качества',

    todayPatients: 'Новые сегодня',
    waiting: 'Ожидают',
    approved: 'Одобрено',
    sent: 'Отправлено',

    review: 'Review',
    correction: 'Correction',
    archived: 'Архив',

    message: 'Сообщение',
    patientName: 'Имя пациента',
    patientCard: 'Карточка пациента',
    canva: 'Canva',
    attachFile: 'Прикрепить файл',
    send: 'Отправить',

    patientCardTitle: 'Карточка пациента',
    doctor: 'Доктор',
    agent: 'Агент',
    notes: 'Заметки',
    status: 'Статус',
    selectPatient: 'Выберите или создайте пациента в чате.',

    workflow: 'Workflow плана',
    workflowText: 'Менеджер проверяет случай, планировщик готовит план, затем статус меняется на Approved или Sent.',

    emergency: 'Срочное уведомление',
    emergencyPlaceholder: 'Сообщение для всей команды',
    sendEmergency: 'Отправить срочное',
    read: 'Я прочитала',

    csvReport: 'CSV отчёт',
    jsonBackup: 'JSON Backup',

    newMessage: 'Новое сообщение',
    messageFrom: 'сообщение от',
    soundOn: 'Звук включён',
    soundOff: 'Звук выключен',
    exit: 'Выйти',
  },

  en: {
    appName: 'DentFlow',
    workspace: 'Workspace',
    welcome: 'Welcome back',
    welcomeSubtitle: 'Choose your mood, language and start the workday calmly.',
    chooseLanguage: 'Language',
    chooseTheme: 'Theme',
    startWork: 'Start work',

    today: 'Today',
    patients: 'Patients',
    chats: 'Team Chats',
    plans: 'Treatment Plans',
    reports: 'Reports',
    settings: 'Settings',

    searchPlaceholder: 'Search: patient, doctor, agent, Canva, card, messages...',
    cloudActive: 'Cloud sync is active',
    localMode: 'Local mode',

    here: 'I am here',
    break: 'Break',
    lunch: 'Lunch',
    busy: 'Busy',
    finished: 'Finished work',

    teamOnline: 'Team online',
    owner: 'Owner',
    planner: 'Treatment Planner',
    qualityControl: 'Quality Control',

    todayPatients: 'New today',
    waiting: 'Waiting',
    approved: 'Approved',
    sent: 'Sent',

    review: 'Review',
    correction: 'Correction',
    archived: 'Archived',

    message: 'Message',
    patientName: 'Patient name',
    patientCard: 'Patient card',
    canva: 'Canva',
    attachFile: 'Attach file',
    send: 'Send',

    patientCardTitle: 'Patient Card',
    doctor: 'Doctor',
    agent: 'Agent',
    notes: 'Notes',
    status: 'Status',
    selectPatient: 'Select or create a patient from chat.',

    workflow: 'Plan Workflow',
    workflowText: 'Manager checks the case, planner prepares the plan, then status changes to Approved or Sent.',

    emergency: 'Emergency alert',
    emergencyPlaceholder: 'Message for the whole team',
    sendEmergency: 'Send emergency',
    read: 'I have read it',

    csvReport: 'CSV Report',
    jsonBackup: 'JSON Backup',

    newMessage: 'New message',
    messageFrom: 'message from',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    exit: 'Exit',
  },

  tr: {
    appName: 'DentFlow',
    workspace: 'Çalışma alanı',
    welcome: 'Tekrar hoş geldin',
    welcomeSubtitle: 'Modunu, dilini seç ve çalışma gününe sakin başla.',
    chooseLanguage: 'Dil',
    chooseTheme: 'Tema',
    startWork: 'Çalışmaya başla',

    today: 'Bugün',
    patients: 'Hastalar',
    chats: 'Ekip Sohbetleri',
    plans: 'Tedavi Planları',
    reports: 'Raporlar',
    settings: 'Ayarlar',

    searchPlaceholder: 'Ara: hasta, doktor, ajan, Canva, kart, mesajlar...',
    cloudActive: 'Cloud senkronizasyonu aktif',
    localMode: 'Lokal mod',

    here: 'Buradayım',
    break: 'Mola',
    lunch: 'Öğle yemeği',
    busy: 'Meşgul',
    finished: 'İşi bitirdim',

    teamOnline: 'Ekip çevrimiçi',
    owner: 'Owner',
    planner: 'Tedavi Planlayıcı',
    qualityControl: 'Kalite Kontrol',

    todayPatients: 'Bugün yeni',
    waiting: 'Bekliyor',
    approved: 'Onaylandı',
    sent: 'Gönderildi',

    review: 'Review',
    correction: 'Correction',
    archived: 'Arşiv',

    message: 'Mesaj',
    patientName: 'Hasta adı',
    patientCard: 'Hasta kartı',
    canva: 'Canva',
    attachFile: 'Dosya ekle',
    send: 'Gönder',

    patientCardTitle: 'Hasta Kartı',
    doctor: 'Doktor',
    agent: 'Ajan',
    notes: 'Notlar',
    status: 'Durum',
    selectPatient: 'Sohbetten hasta seçin veya oluşturun.',

    workflow: 'Plan Süreci',
    workflowText: 'Manager vakayı kontrol eder, planlayıcı planı hazırlar, sonra durum Approved veya Sent olur.',

    emergency: 'Acil bildirim',
    emergencyPlaceholder: 'Tüm ekip için mesaj',
    sendEmergency: 'Acil gönder',
    read: 'Okudum',

    csvReport: 'CSV Rapor',
    jsonBackup: 'JSON Backup',

    newMessage: 'Yeni mesaj',
    messageFrom: 'mesaj gönderdi',
    soundOn: 'Ses açık',
    soundOff: 'Ses kapalı',
    exit: 'Çıkış',
  },

  he: {
    appName: 'DentFlow',
    workspace: 'סביבת עבודה',
    welcome: 'ברוכה הבאה',
    welcomeSubtitle: 'בחרי מצב רוח, שפה והתחילי את יום העבודה ברוגע.',
    chooseLanguage: 'שפה',
    chooseTheme: 'ערכת נושא',
    startWork: 'התחלת עבודה',

    today: 'היום',
    patients: 'מטופלים',
    chats: 'צ׳אטים של הצוות',
    plans: 'תוכניות טיפול',
    reports: 'דוחות',
    settings: 'הגדרות',

    searchPlaceholder: 'חיפוש: מטופל, רופא, סוכן, Canva, כרטיס, הודעות...',
    cloudActive: 'סנכרון ענן פעיל',
    localMode: 'מצב מקומי',

    here: 'אני כאן',
    break: 'הפסקה',
    lunch: 'ארוחת צהריים',
    busy: 'עסוק',
    finished: 'סיימתי לעבוד',

    teamOnline: 'הצוות מחובר',
    owner: 'Owner',
    planner: 'מתכנן טיפול',
    qualityControl: 'בקרת איכות',

    todayPatients: 'חדשים היום',
    waiting: 'ממתינים',
    approved: 'אושרו',
    sent: 'נשלחו',

    review: 'Review',
    correction: 'Correction',
    archived: 'ארכיון',

    message: 'הודעה',
    patientName: 'שם המטופל',
    patientCard: 'כרטיס מטופל',
    canva: 'Canva',
    attachFile: 'צרף קובץ',
    send: 'שליחה',

    patientCardTitle: 'כרטיס מטופל',
    doctor: 'רופא',
    agent: 'סוכן',
    notes: 'הערות',
    status: 'סטטוס',
    selectPatient: 'בחרי או צרי מטופל מתוך הצ׳אט.',

    workflow: 'תהליך התוכנית',
    workflowText: 'המנהל בודק את המקרה, המתכנן מכין את התוכנית, ואז הסטטוס משתנה ל-Approved או Sent.',

    emergency: 'התראה דחופה',
    emergencyPlaceholder: 'הודעה לכל הצוות',
    sendEmergency: 'שליחת התראה',
    read: 'קראתי',

    csvReport: 'דוח CSV',
    jsonBackup: 'גיבוי JSON',

    newMessage: 'הודעה חדשה',
    messageFrom: 'הודעה מ',
    soundOn: 'צליל פעיל',
    soundOff: 'צליל כבוי',
    exit: 'יציאה',
  },
};

export function tr(lang: DFLang, key: string) {
  return ui[lang]?.[key] || ui.ru[key] || key;
}

export function statusText(lang: DFLang, status: PatientStatus) {
  const map: Record<PatientStatus, string> = {
    review: tr(lang, 'review'),
    correction: tr(lang, 'correction'),
    approved: tr(lang, 'approved'),
    sent: tr(lang, 'sent'),
    archived: tr(lang, 'archived'),
  };

  return map[status];
}

export function presenceText(lang: DFLang, status: Presence) {
  const map: Record<Presence, string> = {
    here: tr(lang, 'here'),
    break: tr(lang, 'break'),
    lunch: tr(lang, 'lunch'),
    busy: tr(lang, 'busy'),
    finished: tr(lang, 'finished'),
  };

  return map[status];
}
