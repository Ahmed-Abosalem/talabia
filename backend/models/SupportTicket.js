// ────────────────────────────────────────────────
// 📁 backend/models/SupportTicket.js
// نموذج تذاكر الدعم الفني في نظام طلبية
// ────────────────────────────────────────────────

import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: [true, "عنوان التذكرة مطلوب"],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, "وصف المشكلة مطلوب"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "in_progress", // ✅ افتراضيًا: قيد المتابعة
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    // ✅ حقول الرد من الأدمن
    adminReply: {
      type: String,
      trim: true,
    },
    adminReplyAt: {
      type: Date,
    },
    adminReplyBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;

// ────────────────────────────────────────────────
// ✅ جاهز لتخزين ردّ الأدمن في كل تذكرة
// ────────────────────────────────────────────────
