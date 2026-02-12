import asyncHandler from 'express-async-handler';
import Store from '../models/Store.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ تحديد مسار uploads بشكل ثابت وآمن
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers -> .. = backend -> uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');

// ✅ حذف صور المتجر المحلية بشكل آمن (بدون Path Traversal)
// - لا نحذف إلا الصور التي تبدأ بـ /uploads/stores/ فقط (لتفادي حذف روابط خارجية/Cloudinary)
function safeDeleteLocalStoreImage(url) {
  try {
    if (!url || typeof url !== 'string') return;

    const prefix = '/uploads/stores/';
    if (!url.startsWith(prefix)) return;

    const filename = path.basename(url); // يمنع ../
    if (!filename) return;

    // مثال: /uploads/stores/<file>  أو /uploads/stores/logos/<file> أو /uploads/stores/covers/<file>
    // نستخدم جزء المسار بعد /uploads/ كـ subpath مع basename فقط للحماية.
    const relative = url.replace('/uploads/', ''); // stores/.../<file>
    const dirPart = path.dirname(relative); // stores أو stores/logos أو stores/covers
    const filePath = path.join(uploadsDir, dirPart, filename);

    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.warn('[STORE] Failed to delete store image:', err.message);
      }
    });
  } catch (e) {
    // لا نكسر الطلب
  }
}

// 🏪 إنشاء متجر جديد
export const createStore = asyncHandler(async (req, res) => {
  const { name, description, address, logo } = req.body;
  const store = await Store.create({
    owner: req.user.id,
    name,
    description,
    address,
    logo,
  });
  res.status(201).json(store);
});

// 📋 جلب بيانات متجر البائع
export const getMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ owner: req.user.id });
  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }
  res.json(store);
});

// ✏️ تحديث بيانات المتجر
// ✅ إصلاح تراكم الصور: حذف logo/coverImage القديمة إذا تغيّرت
// ✅ إصلاح حرج إضافي: منع Object.assign(store, req.body) لأنه يسمح بتغيير حقول غير مقصودة
export const updateStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ owner: req.user.id });
  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  // احتفظ بالصور القديمة قبل التعديل
  const oldLogo = store.logo || '';
  const oldCover = store.coverImage || store.cover || '';

  const {
    name,
    description,
    address,
    logo,
    coverImage,
    cover,
    phone,
    email,
    socialLinks,
    visibility,
  } = req.body || {};

  // تحديث آمن: whitelist فقط
  if (typeof name === 'string') store.name = name.trim();
  if (typeof description === 'string') store.description = description;

  if (typeof phone === 'string') store.phone = phone.trim();
  if (typeof email === 'string') store.email = email.trim().toLowerCase();

  if (address && typeof address === 'object') {
    store.address = {
      ...(store.address || {}),
      ...address,
    };
  }

  if (typeof visibility === 'string') store.visibility = visibility;

  if (socialLinks && typeof socialLinks === 'object') {
    store.socialLinks = {
      ...(store.socialLinks || {}),
      ...socialLinks,
    };
  }

  if (typeof logo === 'string') store.logo = logo.trim();

  // يدعم الحقلين coverImage أو cover (احتياطًا)
  if (typeof coverImage === 'string') store.coverImage = coverImage.trim();
  if (typeof cover === 'string') store.coverImage = cover.trim();

  const updated = await store.save();

  // ✅ حذف الصور القديمة إذا تغيّرت فعليًا (وبشرط أنها محلية داخل uploads/stores)
  if (oldLogo && updated.logo && updated.logo !== oldLogo) {
    safeDeleteLocalStoreImage(oldLogo);
  }

  const newCover = updated.coverImage || updated.cover || '';
  if (oldCover && newCover && newCover !== oldCover) {
    safeDeleteLocalStoreImage(oldCover);
  }

  res.json(updated);
});
