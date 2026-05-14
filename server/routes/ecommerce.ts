import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { productService } from "../services/productService";

const router = Router();

router.get("/products/:productId", async (req: Request, res: Response) => {
  const productId = req.params.productId;
  const platform = typeof req.query.platform === "string" ? req.query.platform : "Amazon";
  const item = await productService.getDetails(productId, platform);
  res.json({ item });
});

router.get("/price-comparison/:productId", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      productId: z.string().trim().min(1),
    })
    .safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_PARAMS" });
    return;
  }

  const providers = ["Amazon", "Flipkart", "Myntra"];
  const comparisons = await Promise.all(
    providers.map(async (provider) => {
      const item = await productService.getDetails(parsed.data.productId, provider);
      return {
        provider,
        id: item?.id ?? parsed.data.productId,
        name: item?.name ?? "Product",
        price: item?.finalPrice.amount ?? 0,
        itemUrl: item?.itemUrl ?? "https://example.com/checkout",
      };
    })
  );

  res.json({
    productId: parsed.data.productId,
    comparisons,
    best: comparisons.reduce((best, cur) => (cur.price < best.price ? cur : best), comparisons[0]),
  });
});

router.get("/coupons/:productId", async (req: Request, res: Response) => {
  const productId = req.params.productId;
  res.json({
    productId,
    coupons: [
      { code: "WELCOME100", discount: 100, type: "coupon" },
      { code: "HDFC10", discount: "10% up to ₹500", type: "bank" },
    ],
  });
});

export default router;

