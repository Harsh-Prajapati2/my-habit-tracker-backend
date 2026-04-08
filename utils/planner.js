const { randomUUID } = require('crypto');

const createClientId = (prefix = 'item') => {
  if (typeof randomUUID === 'function') {
    return `${prefix}-${randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeChecklist = (items = [], prefix = 'item') =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const title = sanitizeText(item?.title);
      if (!title) return null;

      return {
        id: sanitizeText(item?.id) || createClientId(prefix),
        title,
        completed: Boolean(item?.completed),
        order: Number.isFinite(item?.order) ? item.order : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

const buildCompletionMeta = (items, previousCompletedAt = null) => {
  const completed = items.length > 0 && items.every((item) => item.completed);

  return {
    completed,
    completedAt: completed ? previousCompletedAt || new Date() : null,
  };
};

const sortChecklist = (items = []) =>
  [...items].sort((a, b) => {
    const aOrder = Number.isFinite(a?.order) ? a.order : 0;
    const bOrder = Number.isFinite(b?.order) ? b.order : 0;
    return aOrder - bOrder;
  });

module.exports = {
  buildCompletionMeta,
  createClientId,
  normalizeChecklist,
  sanitizeText,
  sortChecklist,
};
