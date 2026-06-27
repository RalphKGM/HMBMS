import express from "express";
import {
  createBeneficiary,
  createBeneficiaryInquiry,
  listBeneficiaries,
  listBeneficiaryInquiries,
  updateBeneficiaryStatus,
} from "../controllers/beneficiariesController.js";

const router = express.Router();

router.get("/", listBeneficiaries);
router.post("/", createBeneficiary);
router.patch("/:beneficiaryId/status", updateBeneficiaryStatus);
router.get("/:beneficiaryId/inquiries", listBeneficiaryInquiries);
router.post("/:beneficiaryId/inquiries", createBeneficiaryInquiry);

export default router;
