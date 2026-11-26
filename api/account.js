import { removePrivateDocuments } from '../lib/account-cleanup.js';
import { createClient } from '@supabase/supabase-js';
import { publicAuthConfig, requireUser } from '../lib/auth.js';

// Deletion is ordered so a failed step never removes private files while
// leaving the account alive. The authenticated user is disabled and deleted
// first; storage cleanup is best-effort afterwards and its outcome is reported.
export async function completeDeletion({
  auth,
  secret,
  adminFactory = createClient,
  removeDocuments = removePrivateDocuments,
}) {
  // Never accept a user ID or path from the request.
  const admin = adminFactory(publicAuthConfig().supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signOut = await admin.auth.admin.signOut(auth.token, 'global');
  if (signOut.error) throw signOut.error;
  const removed = await admin.auth.admin.deleteUser(auth.user.id);
  if (removed.error) throw removed.error;
  let storageCleanup = 'done';
  try {
    await removeDocuments(
      admin.storage.from('profile-documents'),
      auth.user.id,
    );
  } catch {
    storageCleanup = 'failed';
  }
  return { deleted: true, storageCleanup };
}

export default async function handler(req, res) {
  if (!['GET', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'Method not allowed' });
  const auth = await requireUser(req, res);
  if (!auth) return;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (req.method === 'GET')
    return res.status(200).json({ deletionConfigured: !!secret });
  if (!secret)
    return res.status(503).json({
      error:
        'Account deletion needs the site owner to configure the server-only Supabase secret. Individual records and files can be deleted now.',
    });
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid confirmation request.' });
  }
  if (body?.confirmation !== 'DELETE MY ACCOUNT')
    return res
      .status(400)
      .json({ error: 'Type DELETE MY ACCOUNT to confirm.' });
  const { data: recent, error } = await auth.db.rpc('has_recent_signin');
  if (error || !recent)
    return res.status(403).json({
      error: 'Sign in again within five minutes, then confirm deletion.',
      code: 'reauth_required',
    });
  try {
    const result = await completeDeletion({ auth, secret });
    return res.status(200).json(result);
  } catch {
    return res.status(503).json({
      error:
        'Deletion could not finish. Your account was not reported as deleted. Retry or contact the site owner.',
    });
  }
}
