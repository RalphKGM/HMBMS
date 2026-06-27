import express from "express";
import {
  createDispensingTransaction,
  listDispensingData,
} from "../controllers/dispensingController.js";

const router = express.Router();

router.get("/", listDispensingData);
router.post("/transactions", createDispensingTransaction);

export default router;
