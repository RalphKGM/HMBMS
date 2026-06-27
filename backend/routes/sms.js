import express from "express";
import {
  createSmsLog,
  listSmsData,
  notifyPendingInquiries,
} from "../controllers/smsController.js";

const router = express.Router();

router.get("/", listSmsData);
router.post("/", createSmsLog);
router.post("/notify-pending", notifyPendingInquiries);

export default router;
