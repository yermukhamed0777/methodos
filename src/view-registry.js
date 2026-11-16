// One registry for view IDs shared by navigation, auth return paths and the guide.
// Keeping these lists together prevents a view from being linkable but not
// restorable after sign-in.
export const HUBS = [
  {
    id: 'explore',
    label: 'Explore',
    view: 'finder',
    items: [
      ['finder', 'Opportunities'],
      ['universities', 'Universities & Admissions'],
      ['campus', 'At my university'],
      ['funding', 'Funding'],
      ['locations', 'Location guides'],
      ['whats-new', 'Recently reviewed'],
      ['latest', 'Source leads'],
    ],
  },
  {
    id: 'learn',
    label: 'Courses & Skills',
    view: 'courses',
    items: [
      ['courses', 'Courses'],
      ['skills', 'Skills'],
      ['projects', 'Portfolio projects'],
      ['research', 'Research ideas'],
    ],
  },
  {
    id: 'career',
    label: 'Career Pathways',
    view: 'professionals',
    items: [
      ['professionals', 'Public profiles & pathways'],
      ['pathways', 'Learning routes'],
      ['careers', 'Career directories'],
      ['cv-library', 'CV examples'],
    ],
  },
  {
    id: 'workspace',
    label: 'My Workspace',
    view: 'dashboard',
    items: [
      ['dashboard', 'Overview'],
      ['plan', 'Planner'],
      ['saved', 'Tracker'],
      ['deadlines', 'Deadlines'],
      ['documents', 'Documents'],
      ['admissions-folders', 'Admissions folders'],
      ['saved-library', 'Saved library'],
      ['activities', 'Activities'],
      ['assistant', 'AI assistant'],
    ],
  },
];

export const PRIVATE_VIEWS = new Set([
  'dashboard',
  'plan',
  'saved',
  'deadlines',
  'documents',
  'admissions-folders',
  'saved-library',
  'activities',
  'assistant',
  'profile',
  'privacy',
  'onboarding',
  'comparison',
  'admin',
  'sources',
]);

export const PATH_VIEWS = {
  '/home': 'home',
  '/admissions': 'universities',
  '/professional-pathways': 'professionals',
  '/research': 'research',
  '/funding': 'funding',
  '/my-plan': 'plan',
  '/system-health': 'admin',
  '/dashboard': 'dashboard',
  '/search': 'finder',
};

export const SAFE_HASH_VIEWS = new Set([
  ...HUBS.flatMap((hub) => hub.items.map(([view]) => view)),
  'profile',
  'privacy',
  'onboarding',
  'comparison',
  'admin',
  'sources',
  'explore',
  'home',
]);

export const VIEW_LABELS = Object.fromEntries([
  ...HUBS.flatMap((hub) => hub.items),
  [
    'home',
    'Home',
  ],
  [
    'profile',
    'Profile & settings',
  ],
  [
    'privacy',
    'Privacy',
  ],
  [
    'onboarding',
    'Getting started',
  ],
  [
    'comparison',
    'University comparison',
  ],
  [
    'admin',
    'System health',
  ],
  [
    'sources',
    'Source review',
  ],
  [
    'explore',
    'Opportunities',
  ],
]);
