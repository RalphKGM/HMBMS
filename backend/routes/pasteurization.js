import express from "express";
import {
  disposeBatch,
  listPasteurizationData,
  savePasteurizationRecord,
} from "../controllers/pasteurizationController.js";

const router = express.Router();

router.get("/", listPasteurizationData);
router.post("/records", savePasteurizationRecord);
router.post("/batches/:batchId/dispose", disposeBatch);

export default router;
