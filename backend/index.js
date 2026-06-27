import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import beneficiariesRoutes from "./routes/beneficiaries.js";
import dashboardRoutes from "./routes/dashboard.js";
import dispensingRoutes from "./routes/dispensing.js";
import donorsRoutes from "./routes/donors.js";
import milkRecordsRoutes from "./routes/milkRecords.js";
import pasteurizationRoutes from "./routes/pasteurization.js";
import usersRoutes from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dispensing", dispensingRoutes);
app.use("/api/donors", donorsRoutes);
app.use("/api/milk-records", milkRecordsRoutes);
app.use("/api/pasteurization", pasteurizationRoutes);
app.use("/api/users", usersRoutes);

app.get("/test", (req, res) => {
  res.type("text/plain").send("Backend is working");
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
