import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

app.get("/test", (req, res) => {
  res.type("text/plain").send("Backend is working");
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
