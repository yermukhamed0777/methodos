import {
  PRIVATE_VIEWS,
  SAFE_HASH_VIEWS,
  VIEW_LABELS,
} from './view-registry.js';

// Local, explainable routing. It never calls a model, sends text anywhere or
// grants access: it only chooses a known view or an account help path.
const VIEWS = [
  ['campus', /\b(my|current|enrolled|own)\s+(university|campus)\b|\bcampus\b/i],
  ['admissions-folders', /admission folder|essay|evidence folder/i],
  ['cv-library', /cv example|sample cv|resume example/i],
  ['universities', /universit|admission|apply to|laborator|research strength/i],
  ['deadlines', /deadline|due date|reminder|closing date/i],
  ['documents', /document|upload|\bcv\b|resume|portfolio file/i],
  ['activities', /\bactivities\b|\btasks?\b|to-do|what I planned/i],
  ['saved', /tracker|saved|shortlist|bookmark|favourite|favorite/i],
  ['assistant', /\bAI\b|assistant|chat with prospecto|ask a question/i],
  [
    'plan',
    /personal plan|planner|my plan|roadmap|weekly plan|study plan|next step/i,
  ],
  ['profile', /profile|settings|preferences|my details/i],
  ['privacy', /privacy|delete my account|my data/i],
  ['dashboard', /overview|my workspace|workspace home/i],
  ['courses', /\bcourses?\b|online learn|certificate|mooc/i],
  ['skills', /\bskills?\b|skill map|what to learn/i],
  ['projects', /portfolio project|project idea|build something/i],
  ['research', /research idea|research topic|undergraduate research/i],
  ['pathways', /learning route|pathway|learning path/i],
  ['careers', /career director/i],
  ['professionals', /career|jobs?|internships?|professional|public profile/i],
  ['funding', /scholarship|funding|grants?|financial aid|tuition/i],
  [
    'locations',
    /location|country guide|where to study|city guide|region guide/i,
  ],
  ['whats-new', /recently reviewed|what.s new|source updates/i],
  ['latest', /latest|source leads|fresh leads|new leads/i],
  ['home', /\bhome\b|start page/i],
  [
    'finder',
    /opportunit|hackathon|olympiad|competition|programme|program|find|explore/i,
  ],
];

const AUTH = [
  [
    'reset',
    /forgot.{0,20}password|reset.{0,20}password|password.{0,20}(reset|forgot|recover|change)|recover.{0,20}account/i,
    'Reset your password',
    [
      'Open the secure password reset page.',
      'Enter the email address you used for Methodos.',
      'Open the newest message and choose a new password of at least 10 characters.',
    ],
  ],
  [
    'confirm',
    /confirm.{0,20}(email|account)|verification (email|link)|verify.{0,20}email|didn.t get (the )?email|no confirmation email/i,
    'Confirm your email',
    [
      'Open the confirmation message in your inbox, including spam if needed.',
      'After confirmation, sign in again with your email and password.',
      'If the link expired, resend it from the sign-in page.',
    ],
  ],
  [
    'signin',
    /authoriz|sign[ -]?in|log[ -]?in|login|create (an )?account|register|access my account|private workspace/i,
    'Sign in or create an account',
    [
      'Use the secure sign-in page for your Methodos account.',
      'Confirm your email first if this is a new account.',
      'After sign-in you return to the view you asked for; saved work stays private.',
    ],
  ],
];

const VIEW_STEPS = {
  finder: [
    'Read the status label before the deadline.',
    'Open a provider source to check current eligibility.',
    'Save a shortlist after signing in.',
  ],
  universities: [
    'Filter by location and field.',
    'Compare a few profiles and open their official sources.',
    'A research strength is not a promise of admission or lab access.',
  ],
  campus: [
    'Choose your institution in the campus explorer.',
    'Check which listings have a verified open cycle.',
    'Ask the relevant campus office about eligibility.',
  ],
  courses: [
    'Filter by provider, subject and cost.',
    'Check the syllabus before enrolling.',
    'Finish a small project so the skill is visible.',
  ],
  plan: [
    'Open your private planner.',
    'Add one small task with a realistic time budget.',
    'Review it next week and adjust.',
  ],
  assistant: [
    'Open the AI assistant after sign-in.',
    'Add your stage, field and available hours for a grounded answer.',
    'Verify every provider source before acting.',
  ],
};

export function guidePlan(text, { signedIn = false } = {}) {
  const query = typeof text === 'string' ? text.slice(0, 500).trim() : '';
  if (!query)
    return {
      kind: 'unknown',
      title: 'Tell me what you need.',
      steps: [
        'Ask about an opportunity, a course, a university or your account.',
        'You can also use the direction buttons below.',
      ],
    };
  for (const [action, pattern, title, steps] of AUTH)
    if (pattern.test(query))
      return { kind: 'auth', action, title, steps, requiresAuth: true };
  for (const [view, pattern] of VIEWS) {
    if (!pattern.test(query) || !SAFE_HASH_VIEWS.has(view)) continue;
    const requiresAuth = PRIVATE_VIEWS.has(view);
    const steps = VIEW_STEPS[view] || [
      `Open ${VIEW_LABELS[view] || view} from the navigation bar.`,
      'Check the recorded source and review date.',
      signedIn
        ? 'Save anything useful to your private workspace.'
        : 'Sign in when you want to save or plan.',
    ];
    return {
      kind: 'view',
      view,
      label: VIEW_LABELS[view] || view,
      requiresAuth,
      title:
        requiresAuth && !signedIn
          ? `${VIEW_LABELS[view] || view} needs an account.`
          : `Opening ${VIEW_LABELS[view] || view}.`,
      steps,
    };
  }
  return {
    kind: 'unknown',
    title: 'I can point you in a direction.',
    steps: [
      'Try naming a subject, a qualification, a deadline or an account task.',
      'For a personal recommendation, sign in and use the AI assistant.',
    ],
  };
}
