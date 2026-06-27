import express from "express";
import { listInquiries } from "../controllers/inquiriesController.js";

const router = express.Router();

router.get("/", listInquiries);

export default router;
