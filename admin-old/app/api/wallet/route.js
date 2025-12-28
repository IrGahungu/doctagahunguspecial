// routes/wallet.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/deduct", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { amount } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount." });

    if (user.wallet_balance < amount)
      return res.status(400).json({ error: "Insufficient wallet balance." });

    user.wallet_balance -= amount;
    await user.save();

    res.json({
      message: "Wallet updated successfully.",
      wallet_balance: user.wallet_balance,
    });
  } catch (err) {
    console.error("Wallet deduct error:", err);
    res.status(500).json({ error: "Failed to deduct wallet." });
  }
});

export default router;
