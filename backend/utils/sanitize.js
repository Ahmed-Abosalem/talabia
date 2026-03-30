import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * ينظف النصوص من أي أكواد خبيثة (XSS)
 * @param {string} html النص المراد تنظيفه
 * @returns {string} النص النظيف
 */
export const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
  });
};

/**
 * ينظف النصوص البسيطة (مثل الأسماء) من أي وسوم HTML نهائياً
 * @param {string} text النص المراد تنظيفه
 * @returns {string} النص النظيف
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};
