// The three separate websites and what each one's API tokens may touch.
export const PORTALS = ['attendance', 'fees', 'finance'];

export const PORTAL_NAMES = {
  attendance: 'Seminary Attendance',
  fees: 'Seminary Fees Office',
  finance: 'Seminary Finance',
};

// Entities each site's tokens can read/write through the generic CRUD API
// (write rules on top of this: adminOnly entities still need the admin role,
// deletes are always admin-only). The /options label lookups are open to any
// authenticated token so cross-references can render.
export const PORTAL_ENTITIES = {
  attendance: [
    'pupils', 'courses', 'enrollments', 'attendance', 'exams', 'exam_results',
    'exam_levels', 'lessons', 'applications', 'diary_events', 'tasks',
    'school_years', 'groups', 'classes', 'contacts',
  ],
  fees: [
    'pupils', 'pupil_fees', 'contacts', 'classes', 'groups', 'school_years',
  ],
  finance: null, // null = every entity
};

export function portalAllows(portal, entityName) {
  const list = PORTAL_ENTITIES[portal];
  return list === null ? true : (list || []).includes(entityName);
}

export function requirePortal(portal) {
  return (req, res, next) => {
    if (req.user?.portal !== portal) {
      return res.status(403).json({ error: `Your login is for a different site — this needs a ${PORTAL_NAMES[portal]} account.` });
    }
    next();
  };
}
