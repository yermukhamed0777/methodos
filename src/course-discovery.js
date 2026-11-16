export const courseProvider = (course) =>
  (course.provider || '').split('·')[0].trim();
export function paginateCourses(items, requested = 1, size = 12) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const number = Math.min(
    pages,
    Math.max(1, Math.trunc(Number(requested)) || 1),
  );
  const start = (number - 1) * size;
  return {
    number,
    pages,
    start: items.length ? start + 1 : 0,
    end: Math.min(start + size, items.length),
    rows: items.slice(start, start + size),
  };
}
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
