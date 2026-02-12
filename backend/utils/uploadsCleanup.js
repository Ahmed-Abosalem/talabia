// backend/utils/uploadsCleanup.js
// ✅ تنظيف احترافي للـ Orphan uploads
// - يحذف فقط ملفات داخل backend/uploads/**
// - لا يحذف أي شيء من قاعدة البيانات
// - لا يحذف أي ملف له مرجع في DB
// - لا يحذف ملفات أحدث من TTL (هنا 24 ساعة)

import fs from "fs/promises";
import path from "path";

import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Ad from "../models/Ad.js";
import Store from "../models/Store.js";
import User from "../models/User.js";

function isLocalUploadsUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function toRelativeUploadsPath(url) {
  // "/uploads/products/a.jpg" -> "products/a.jpg"
  if (!isLocalUploadsUrl(url)) return null;
  const rel = url.slice("/uploads/".length);
  if (!rel || rel.includes("\0")) return null;
  // توحيد الفواصل
  return rel.replace(/\\/g, "/");
}

async function listFilesRecursive(rootDirAbs) {
  const out = [];
  const stack = [rootDirAbs];

  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue; // مجلد غير موجود أو لا يمكن قراءته
    }

    for (const ent of entries) {
      if (!ent || !ent.name || ent.name.startsWith(".")) continue;

      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(abs);
      } else if (ent.isFile()) {
        out.push(abs);
      }
    }
  }

  return out;
}

async function collectReferencedRelativePaths() {
  const referenced = new Set();

  // Products: images[].url
  try {
    const products = await Product.find({}, { images: 1 }).lean();
    for (const p of products) {
      const imgs = Array.isArray(p?.images) ? p.images : [];
      for (const img of imgs) {
        const rel = toRelativeUploadsPath(
          typeof img === "string" ? img : img?.url
        );
        if (rel) referenced.add(rel);
      }
    }
  } catch {}

  // Categories: image
  try {
    const cats = await Category.find({}, { image: 1 }).lean();
    for (const c of cats) {
      const rel = toRelativeUploadsPath(c?.image);
      if (rel) referenced.add(rel);
    }
  } catch {}

  // Ads: image
  try {
    const ads = await Ad.find({}, { image: 1 }).lean();
    for (const a of ads) {
      const rel = toRelativeUploadsPath(a?.image);
      if (rel) referenced.add(rel);
    }
  } catch {}

  // Stores: logo / coverImage / cover (احتياط)
  try {
    const stores = await Store.find({}, { logo: 1, coverImage: 1, cover: 1 }).lean();
    for (const s of stores) {
      const rel1 = toRelativeUploadsPath(s?.logo);
      const rel2 = toRelativeUploadsPath(s?.coverImage);
      const rel3 = toRelativeUploadsPath(s?.cover);
      if (rel1) referenced.add(rel1);
      if (rel2) referenced.add(rel2);
      if (rel3) referenced.add(rel3);
    }
  } catch {}

  // Users: idDocumentUrl / avatar (إن كانت محلية)
  try {
    const users = await User.find({}, { idDocumentUrl: 1, avatar: 1 }).lean();
    for (const u of users) {
      const rel1 = toRelativeUploadsPath(u?.idDocumentUrl);
      const rel2 = toRelativeUploadsPath(u?.avatar);
      if (rel1) referenced.add(rel1);
      if (rel2) referenced.add(rel2);
    }
  } catch {}

  return referenced;
}

async function safeStat(absPath) {
  try {
    return await fs.stat(absPath);
  } catch {
    return null;
  }
}

async function safeUnlink(absPath) {
  try {
    await fs.unlink(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function runUploadsCleanup({
  uploadsRootAbs,
  olderThanHours = 24,
  dryRun = false,
}) {
  const ttlMs = Math.max(Number(olderThanHours) || 24, 1) * 60 * 60 * 1000;
  const now = Date.now();

  const referenced = await collectReferencedRelativePaths();

  const allFiles = await listFilesRecursive(uploadsRootAbs);

  let scanned = 0;
  let deleted = 0;
  let skippedReferenced = 0;
  let skippedYoung = 0;
  let failed = 0;

  for (const abs of allFiles) {
    const st = await safeStat(abs);
    if (!st || !st.isFile()) continue;

    scanned++;

    // TTL: لا نحذف الملفات الحديثة
    if (now - st.mtimeMs < ttlMs) {
      skippedYoung++;
      continue;
    }

    // relative path within uploads root
    const rel = path
      .relative(uploadsRootAbs, abs)
      .replace(/\\/g, "/");

    // إذا له مرجع في DB لا نحذفه
    if (referenced.has(rel)) {
      skippedReferenced++;
      continue;
    }

    if (dryRun) {
      deleted++;
      continue;
    }

    const ok = await safeUnlink(abs);
    if (ok) deleted++;
    else failed++;
  }

  return {
    olderThanHours: Number(olderThanHours) || 24,
    dryRun: !!dryRun,
    summary: {
      scanned,
      deleted,
      skippedReferenced,
      skippedYoung,
      failed,
    },
  };
}
