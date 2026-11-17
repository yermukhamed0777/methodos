// Contextual account help derived from the visible status message.
// It never reads a password, token or private workspace record.
const HELP = [
  [
    /expired|already used|different browser|fresh link|code|otp|flow_state/i,
    'That link cannot be used',
    [
      'Email links expire and work only once.',
      'Open the sign-in page and request a new link.',
      'Use the same browser that requested it.',
    ],
    ['Request a fresh link', '/login'],
  ],
  [
    /confirm|verification|check your inbox|spam|email_not_confirmed/i,
    'Confirm your email first',
    [
      'Open the confirmation message in your inbox, including spam.',
      'Then sign in with the email and password you created.',
      'If the message is gone, resend it from the sign-in form.',
    ],
    ['Back to sign in', '/login'],
  ],
  [
    /incorrect|credentials|invalid_credentials/i,
    'Check your account details',
    [
      'Confirm the email address and password are correct.',
      'If you just registered, confirm your email before signing in.',
      'Use password reset if you cannot remember the password.',
    ],
    ['Open password reset', '/reset-password'],
  ],
  [
    /password|reset|update/i,
    'Password help',
    [
      'Use the email address of your ProspectoAI account.',
      'Open only the newest reset message.',
      'Choose at least 10 characters and sign in again.',
    ],
    ['Open password reset', '/reset-password'],
  ],
  [
    /too many|rate limit|wait before|delivery/i,
    'Slow down and retry',
    [
      'Wait a few minutes before requesting another message.',
      'Check spam and the newest message first.',
      'If delivery never arrives, the site owner must configure email delivery.',
    ],
    ['Back to sign in', '/login'],
  ],
  [
    /setup|not configured|service is not ready|unavailable/i,
    'Account service setup',
    [
      'This page is waiting for valid public account settings.',
      'Local development reads .env.local; restart after editing it.',
      'Public discovery still works without an account.',
    ],
    ['Return to discovery', '/'],
  ],
];
const DEFAULT = {
  title: 'Need help signing in?',
  steps: [
    'Use the email and password of your ProspectoAI account.',
    'New accounts need email confirmation before the first sign-in.',
    'Public discovery remains available without an account.',
  ],
  action: { label: 'Back to discovery', href: '/' },
};
export function authHelpFor(message = '') {
  const text = typeof message === 'string' ? message.toLowerCase() : '';
  const found = HELP.find(([pattern]) => pattern.test(text));
  if (!found) return DEFAULT;
  return {
    title: found[1],
    steps: found[2],
    action: { label: found[3][0], href: found[3][1] },
  };
}
