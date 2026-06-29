import express from "express";
import {
  createEmailLog,
  listEmailData,
  notifyPendingInquiries,
} from "../controllers/emailController.js";

const router = express.Router();

router.get("/", listEmailData);
router.post("/", createEmailLog);
router.post("/notify-pending", notifyPendingInquiries);

export default router;
