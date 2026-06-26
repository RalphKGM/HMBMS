import express from "express";
import { createUser, listUsers } from "../controllers/usersController.js";

const router = express.Router();

router.get("/", listUsers);
router.post("/", createUser);

export default router;