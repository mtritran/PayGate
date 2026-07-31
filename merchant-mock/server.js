const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 8082;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database of orders
let orders = [];

// PayGate configurations
const PAYGATE_API_BASE_URL = 'http://localhost:8081';
const MERHANT_API_KEY = 'mock-merchant-api-key-123456';
const RETURN_URL = 'http://localhost:8082/?callback=true';
const CANCEL_URL = 'http://localhost:8082/?cancel=true';

// 1. Get all orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// Delete all orders
app.delete('/api/orders', (req, res) => {
    orders = [];
    res.json({ success: true, message: 'All orders cleared' });
});

// Delete single order
app.delete('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    orders = orders.filter(o => o.orderId !== orderId);
    res.json({ success: true, message: 'Order deleted' });
});

// 2. Buy product & Create Checkout Session with PayGate
app.post('/api/checkout', async (req, res) => {
    const { productName, price } = req.body;
    if (!productName || !price) {
        return res.status(400).json({ message: 'Product name and price are required' });
    }

    const orderId = 'ORD_' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
        orderId,
        productName,
        price,
        status: 'PENDING', // PENDING, PAID, FAILED
        transactionRef: null,
        token: null,
        createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);

    try {
        console.log(`[MERCHANT] Creating PayGate checkout session for Order: ${orderId}, Amount: ${price} VND`);
        const payload = {
            apiKey: MERHANT_API_KEY,
            orderId: orderId,
            amount: parseFloat(price),
            description: `Thanh toan don hang ${orderId} - ${productName}`,
            returnUrl: RETURN_URL,
            cancelUrl: CANCEL_URL
        };

        const response = await axios.post(`${PAYGATE_API_BASE_URL}/api/v1/checkout/create`, payload);
        if (response.data && response.data.success === true) {
            const { token, paymentUrl } = response.data.data;
            newOrder.token = token;
            console.log(`[MERCHANT] PayGate Checkout Session created! URL: ${paymentUrl}`);
            return res.json({ paymentUrl, orderId });
        } else {
            newOrder.status = 'FAILED';
            return res.status(500).json({ message: 'Failed to create payment session with PayGate' });
        }
    } catch (error) {
        console.error('[MERCHANT] Error contacting PayGate:', error.message);
        newOrder.status = 'FAILED';
        return res.status(500).json({ 
            message: 'Error connecting to PayGate server', 
            error: error.response ? error.response.data : error.message 
        });
    }
});

// 3. Webhook listener from PayGate
app.post('/api/paygate-webhook', (req, res) => {
    const { event, transactionRef, status, amount, orderId } = req.body;
    
    console.log('\n==================================================');
    console.log('[WEBHOOK RECEIVED FROM PAYGATE]');
    console.log(`Event: ${event}`);
    console.log(`Order ID: ${orderId}`);
    console.log(`Status: ${status}`);
    console.log(`Amount: ${amount} VND`);
    console.log(`Transaction Ref: ${transactionRef}`);
    console.log('==================================================\n');

    if (event === 'PAYMENT_COMPLETED' || event === 'PAYMENT_FAILED') {
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.transactionRef = transactionRef;
            order.status = (status === 'SUCCESS' || status === 'COMPLETED') ? 'PAID' : 'FAILED';
            console.log(`[MERCHANT] Updated Order ${orderId} status to: ${order.status}`);
        } else {
            console.warn(`[MERCHANT] Received webhook for orderId ${orderId} but it doesn't exist in our memory!`);
        }
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ message: 'Webhook received successfully' });
});

app.listen(PORT, () => {
    console.log(`\n**************************************************`);
    console.log(`Mock Merchant running at: http://localhost:${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/api/paygate-webhook`);
    console.log(`**************************************************\n`);
});
