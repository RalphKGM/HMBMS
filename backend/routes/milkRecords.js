import express from "express";
import {
  createMilkCollection,
  listMilkRecords,
} from "../controllers/milkRecordsController.js";

const router = express.Router();

router.get("/", listMilkRecords);
router.post("/collections", createMilkCollection);

export default router;
