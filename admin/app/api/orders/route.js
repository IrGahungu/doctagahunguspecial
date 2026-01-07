// routes/orders.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import prisma from "../prismaClient.js";

const router = express.Router();

// POST /orders
router.post("/", authMiddleware, async (req, res) => {
  const { items, payment_method } = req.body; // items: [{ stock_id, quantity }]
  const userId = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items in the order" });
  }

  try {
    // Use a transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // Fetch user
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      // Fetch stock info
      const stockRows = await tx.stock.findMany({
        where: { id: { in: items.map((i) => i.stock_id) } },
        include: { medicine: true, pharmacy: true },
      });

      if (stockRows.length !== items.length) {
        throw new Error("Some stock items are invalid");
      }

      // Check stock quantities
      for (const item of items) {
        const stock = stockRows.find((s) => s.id === item.stock_id);
        if (item.quantity > stock.quantity) {
          throw new Error(
            `Insufficient stock for ${stock.medicine.name} at ${stock.pharmacy.name}`
          );
        }
      }

      // Calculate totals
      let subtotal = 0;
      const orderItemsData = items.map((item) => {
        const stock = stockRows.find((s) => s.id === item.stock_id);
        subtotal += stock.price * item.quantity;
        return {
          stock_id: stock.id,
          quantity: item.quantity,
          price: stock.price,
        };
      });

      const service_fee = Math.round(subtotal * 0.05);
      const total_amount = subtotal + service_fee;

      // Wallet payment handling
      if (payment_method === "wallet") {
        if (user.wallet_balance < total_amount) {
          throw new Error("Insufficient wallet balance");
        }

        await tx.user.update({
          where: { id: userId },
          data: { wallet_balance: { decrement: total_amount } },
        });
      }

      // Deduct stock quantities
      for (const item of items) {
        await tx.stock.update({
          where: { id: item.stock_id },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Create order with items
      const newOrder = await tx.order.create({
        data: {
          user_id: userId,
          subtotal,
          service_fee,
          total_amount,
          payment_method,
          status: "Pending",
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              stock: {
                include: { medicine: true, pharmacy: true },
              },
            },
          },
        },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (err) {
    console.error("❌ Order creation failed:", err);
    res.status(400).json({ error: "Order creation failed", details: err.message });
  }
});

export default router;
