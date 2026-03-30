// ────────────────────────────────────────────────
// 📁 backend/controllers/admin/adminSupportController.js
// إدارة الدعم الفني (تذاكر التواصل) من جهة الأدمن
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import SupportTicket from "../../models/SupportTicket.js";
import Notification from "../../models/Notification.js";
import { sanitizeHTML } from "../../utils/sanitize.js";

// GET /api/admin/support-tickets
export const getAdminSupportTickets = asyncHandler(async (req, res) => {
  const rawTickets = await SupportTicket.find()
    .populate("user", "name email role phone")
    .sort({ createdAt: -1 });

  const tickets = rawTickets.map((t) => {
    const obj = t.toObject();
    const user = t.user || {};

    return {
      ...obj,
      userName: user.name || "",
      userRole: user.role || "",
      userEmail: user.email || "",
      userPhone: user.phone || "",
    };
  });

  res.json({ tickets });
});

// PUT /api/admin/support-tickets/:id/status
export const updateSupportTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error("تذكرة الدعم غير موجودة");
  }

  if (!status) {
    res.status(400);
    throw new Error("حقل الحالة (status) مطلوب");
  }

  ticket.status = status;
  await ticket.save();

  res.json({ ticket });
});

// PUT /api/admin/support-tickets/:id/reply
export const replyToSupportTicket = asyncHandler(async (req, res) => {
  const { reply } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error("تذكرة الدعم غير موجودة");
  }

  if (!reply || !reply.trim()) {
    res.status(400);
    throw new Error("نص الرد مطلوب");
  }

  ticket.adminReply = sanitizeHTML(reply);
  ticket.adminReplyAt = new Date();
  ticket.adminReplyBy = req.user?._id || null;

  // يمكن اعتبار التذكرة محلولة بعد الرد
  if (ticket.status === "open" || ticket.status === "in_progress") {
    ticket.status = "resolved";
  }

  await ticket.save();

  // ────────────────────────────────────────────────
  // 📩 إنشاء إشعار للمستخدم بوجود رد جديد من الدعم الفني
  // ────────────────────────────────────────────────
  try {
    if (ticket.user) {
      const subjectText = ticket.subject || "بدون عنوان";

      // نحضّر نص مختصر للرد حتى لا يتجاوز حد الـ 500 حرف في message
      let replyPreview = ticket.adminReply || "";
      const maxReplyLength = 380; // نترك مساحة لجزء العنوان والبداية

      if (replyPreview.length > maxReplyLength) {
        replyPreview = replyPreview.slice(0, maxReplyLength - 3) + "...";
      }

      // ✅ تنسيق مرتب وواضح:
      // العنوان في سطر
      // سطر فارغ
      // ثم الرد في أسطر منفصلة
      const message = `العنوان: ${subjectText}\n\nالرد من فريق الدعم:\n${replyPreview}`;

      await Notification.create({
        user: ticket.user,
        title: "رد جديد من الدعم الفني",
        message,
        type: "support",
        link: "", // يمكن ضبط رابط تفصيلي لاحقًا إن أضفنا صفحة "تذاكري"
      });
    }
  } catch (notificationError) {
    // لا نُسقِط الطلب إذا فشل إنشاء الإشعار، فقط نسجل الخطأ في السيرفر
    console.error(
      "فشل إنشاء إشعار رد الدعم الفني للتذكرة:",
      ticket?._id,
      notificationError
    );
  }

  res.json({ ticket });
});

// DELETE /api/admin/support-tickets/:id
export const deleteSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error("تذكرة الدعم غير موجودة");
  }

  await ticket.deleteOne();

  res.json({ message: "تم حذف التذكرة بنجاح" });
});
