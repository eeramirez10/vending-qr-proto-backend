
// import { AppRoutes } from "./presentation/app-routes"
// import { Server } from "./presentation/server"


// (() =>{

//   main()
// }

// )()



// async function main(){

//   new Server({ port:4000, routes:AppRoutes.routes()}).start()
// }


import 'dotenv/config';
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors())

// Inicializar Stripe con tu llave secreta de prueba desde .env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Falta STRIPE_SECRET_KEY en las variables de entorno');
}

const stripe = new Stripe(stripeSecretKey);

// --- Tipos y MOCK de productos (sin base de datos) ---
interface MockProduct {
  id: string;
  name: string;
  priceMxn: number; // precio en MXN
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-chocolate',
    name: 'Chocolate barra',
    priceMxn: 25,
  },
  {
    id: 'prod-refresco',
    name: 'Refresco lata',
    priceMxn: 18,
  },
  {
    id: 'prod-papas',
    name: 'Papas fritas',
    priceMxn: 20,
  },
];

const findMockProduct = (productId: string): MockProduct | undefined =>
  MOCK_PRODUCTS.find((p) => p.id === productId);

// --- Endpoint para obtener productos mock (para el front) ---
app.get('/api/products', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    products: MOCK_PRODUCTS,
  });
});

// --- Endpoint para crear la sesión de pago de Stripe ---
// Aquí es donde, en el prototipo, la “máquina” o el frontend pediría la orden
interface CreateCheckoutSessionBody {
  productId?: string;
}

app.post(
  '/api/create-checkout-session',
  async (req: Request<unknown, unknown, CreateCheckoutSessionBody>, res: Response) => {
    try {
      const { productId = 'prod-chocolate' } = req.body || {};

      const product = findMockProduct(productId);
      if (!product) {
        return res.status(400).json({
          ok: false,
          error: 'Producto no encontrado (mock)',
        });
      }

      const amountCents = product.priceMxn * 100;

      const port = process.env.PORT || 4242;
      const baseUrl = `https://vending-qr-proto-84357f6ae1e7.herokuapp.com`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: product.name,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        // Estas URLs son solo para pruebas locales
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/cancel`,
      });

      return res.json({
        ok: true,
        product,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Error creando Checkout Session:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      return res.status(500).json({
        ok: false,
        error: 'No se pudo crear la sesión de pago',
        details: message,
      });
    }
  }
);

// Rutas simples para redirección de éxito/cancel
app.get('/success', (_req: Request, res: Response) => {
  res.send('<h1>Pago exitoso (modo prueba) ✅</h1>');
});

app.get('/cancel', (_req: Request, res: Response) => {
  res.send('<h1>Pago cancelado ❌</h1>');
});

const PORT = Number(process.env.PORT) || 4242;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});