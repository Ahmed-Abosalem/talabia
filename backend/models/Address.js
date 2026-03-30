// ────────────────────────────────────────────────
// 📁 backend/models/Address.js
// نموذج عناوين الشحن في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: {
      type: String,
      required: true, // مثال: المنزل، العمل
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    area: {
      type: String,
      trim: true,
      default: "",
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    street: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);

export default Address;
