import { Router } from "express";
import { listActiveUsers } from "../services/presenceGlobal.js";

const router = Router();

router.get("/active", async (_req, res) => {
  const users = await listActiveUsers();
  return res.json({ users });
});

export default router;
