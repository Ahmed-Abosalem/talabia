import express from "express";
import {
    getSynonyms,
    createSynonym,
    updateSynonym,
    deleteSynonym,
} from "../controllers/synonymController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .get(protect, admin, getSynonyms)
    .post(protect, admin, createSynonym);

router.route("/:id")
    .put(protect, admin, updateSynonym)
    .delete(protect, admin, deleteSynonym);

export default router;
