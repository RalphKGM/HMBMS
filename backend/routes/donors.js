import express from "express";
import {
  createDonor,
  listDonors,
  updateDonor,
  updateDonorStatus,
} from "../controllers/donorsController.js";

const router = express.Router();

router.get("/", listDonors);
router.post("/", createDonor);
router.patch("/:donorId", updateDonor);
router.patch("/:donorId/status", updateDonorStatus);

export default router;
