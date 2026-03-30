// ────────────────────────────────────────────────
// 📁 backend/controllers/synonymController.js
// التحكم في المرادفات (إضافة، تعديل، حذف، بحث)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Synonym from "../models/Synonym.js";
import { reloadSynonyms } from "../services/searchService.js";

// @desc    Get all synonyms
// @route   GET /api/synonyms
// @access  Private/Admin
export const getSynonyms = asyncHandler(async (req, res) => {
    const synonyms = await Synonym.find({}).sort({ term: 1 });
    res.json(synonyms);
});

// @desc    Create a new synonym group
// @route   POST /api/synonyms
// @access  Private/Admin
export const createSynonym = asyncHandler(async (req, res) => {
    const { term, synonyms, notes } = req.body;

    if (!term || !synonyms || !Array.isArray(synonyms)) {
        res.status(400);
        throw new Error("الرجاء توفير الكلمة الأساسية وقائمة المرادفات.");
    }

    const exists = await Synonym.findOne({ term });
    if (exists) {
        res.status(400);
        throw new Error("هذه الكلمة موجودة مسبقاً.");
    }

    const synonym = await Synonym.create({
        term,
        synonyms,
        notes,
    });

    // تحديث الكاش
    await reloadSynonyms();

    res.status(201).json(synonym);
});

// @desc    Update synonym group
// @route   PUT /api/synonyms/:id
// @access  Private/Admin
export const updateSynonym = asyncHandler(async (req, res) => {
    const synonym = await Synonym.findById(req.params.id);

    if (!synonym) {
        res.status(404);
        throw new Error("المرادفات غير موجودة.");
    }

    const { term, synonyms, isActive, notes } = req.body;

    if (term) synonym.term = term;
    if (synonyms) synonym.synonyms = synonyms;
    if (isActive !== undefined) synonym.isActive = isActive;
    if (notes !== undefined) synonym.notes = notes;

    const updatedSynonym = await synonym.save();

    // تحديث الكاش
    await reloadSynonyms();

    res.json(updatedSynonym);
});

// @desc    Delete synonym group
// @route   DELETE /api/synonyms/:id
// @access  Private/Admin
export const deleteSynonym = asyncHandler(async (req, res) => {
    const synonym = await Synonym.findById(req.params.id);

    if (!synonym) {
        res.status(404);
        throw new Error("المرادفات غير موجودة.");
    }

    await synonym.deleteOne();

    // تحديث الكاش
    await reloadSynonyms();

    res.json({ message: "تم حذف المرادفات." });
});
