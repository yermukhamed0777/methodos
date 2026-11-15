// This projection reads reviewed repository content, never owner tables or drafts.
const privateKeys = new Set([
  'user_id',
  'userId',
  'email',
  'notes',
  'privateNotes',
  'raw_text',
  'extracted_text',
  'access_token',
  'refresh_token',
  'signedUrl',
  'signed_url',
  'reviewQueue',
  'before_payload',
  'after_payload',
  'version',
  'publishedAt',
]);
export function publicContent(value) {
  if (Array.isArray(value)) return value.map(publicContent);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !privateKeys.has(key) &&
          !/secret|password|token|private|credential/i.test(key),
      )
      .map(([key, item]) => [key, publicContent(item)]),
  );
}
export function publicPreview({
  catalog,
  resources,
  development,
  intelligence,
}) {
  const records = intelligence.records.filter(
    (r) =>
      !['Review', 'Draft', 'Rejected', 'Archived'].includes(r.status) &&
      !r.archived,
  );
  return {
    preview: true,
    snapshotCheckedOn: intelligence.checkedOn,
    catalog: publicContent(catalog),
    resources: publicContent({
      ...resources,
      courses: records.filter((r) => r.kind === 'course'),
    }),
    development: publicContent(development),
    intelligence: { records: publicContent(records) },
  };
}
