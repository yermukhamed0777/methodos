export const courseProvider = (course) =>
  (course.provider || '').split('·')[0].trim();
export function filterCourses(
  courses,
  { query = '', provider = '', format = '' } = {},
) {
  const q = query.trim().toLowerCase();
  return courses.filter(
    (c) =>
      (!provider || courseProvider(c) === provider) &&
      (!format || (format === 'unknown' ? !c.format : c.format === format)) &&
      (!q ||
        [c.name, c.provider, c.institution, ...(c.skills || [])]
          .join(' ')
          .toLowerCase()
          .includes(q)),
  );
}
