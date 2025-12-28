// routes/orders.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import prisma from "../prismaClient.js"; // make sure you import your Prisma client

const router = express.Router();

// POST /orders
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, subtotal, service_fee, total_amount, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in the order.' });
    }

    // Fetch user wallet
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (payment_method === 'wallet') {
      if (user.wallet_balance < total_amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance.' });
      }

      // Deduct wallet balance
      await prisma.user.update({
        where: { id: userId },
        data: { wallet_balance: { decrement: total_amount } },
      });
    }

    // Create order with order items
    const order = await prisma.order.create({
      data: {
        user_id: userId,
        subtotal,
        service_fee,
        total_amount,
        payment_method,
        status: 'Pending',
        items: {
          create: items.map(item => ({
            medicine_id: item.medicine_id, // ✅ must match table column
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
