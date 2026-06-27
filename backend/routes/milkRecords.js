import express from "express";
import {
  addContributorToPooledBatch,
  createMilkCollection,
  createPooledBatch,
  listMilkRecords,
} from "../controllers/milkRecordsController.js";

const router = express.Router();

router.get("/", listMilkRecords);
router.post("/collections", createMilkCollection);
router.post("/pools", createPooledBatch);
router.post("/pools/:batchId/contributions", addContributorToPooledBatch);

export default router;
