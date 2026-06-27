import express from "express";
import { createUser, listUsers, updateUser } from "../controllers/usersController.js";

const router = express.Router();

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:userId", updateUser);

export default router;
