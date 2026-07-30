import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

const MOOLRE_TIMEOUT_MS = 20_000;

export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`payment:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimitResult.resetIn.toString()
                    }
                }
            );
        }

        const body = await req.json();
        const { orderId, customerEmail } = body;

        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderId' }, { status: 400 });
        }

        if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY || !process.env.MOOLRE_ACCOUNT_NUMBER) {
            console.error('Missing Moolre credentials');
            return NextResponse.json({ success: false, message: 'Payment gateway configuration error' }, { status: 500 });
        }

        // SECURITY: Fetch the order from the database and use its total.
        // NEVER trust the amount from the client.
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, total, email, payment_status, metadata')
            .or(`id.eq.${orderId},order_number.eq.${orderId}`)
            .single();

        if (orderError || !order) {
            console.error('[Payment] Order not found:', orderId);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 400 });
        }

        const amount = Number(order.total);
        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
        }

        const orderRef = order.order_number || orderId;

        const requestUrl = new URL(req.url);
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

        // Unique external reference per payment attempt (stored for verify).
        const uniqueRef = `${orderRef}-R${Date.now()}`;

        const payload = {
            type: 1,
            amount: amount.toString(),
            email: process.env.MOOLRE_MERCHANT_EMAIL || 'merchant@example.com',
            externalref: uniqueRef,
            callback: `${baseUrl}/api/payment/moolre/callback`,
            redirect: `${baseUrl}/order-success?order=${orderRef}&payment_success=true`,
            reusable: "0",
            currency: "GHS",
            accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
            metadata: {
                customer_email: customerEmail || order.email,
                original_order_number: orderRef
            }
        };

        console.log('[Payment] Initiating for order:', orderRef, '| Amount from DB:', amount);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), MOOLRE_TIMEOUT_MS);

        let result: any;
        try {
            const response = await fetch('https://api.moolre.com/embed/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-USER': process.env.MOOLRE_API_USER,
                    'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            result = await response.json();
        } finally {
            clearTimeout(timer);
        }

        console.log('[Payment] Response status:', result?.status, '| Has URL:', !!result?.data?.authorization_url);

        if (result?.status === 1 && result?.data?.authorization_url) {
            // Persist the attempt ref so /verify can poll Moolre correctly.
            const prevMeta = (order.metadata && typeof order.metadata === 'object') ? order.metadata : {};
            await supabaseAdmin
                .from('orders')
                .update({
                    metadata: {
                        ...prevMeta,
                        moolre_external_ref: uniqueRef,
                        moolre_payment_initiated_at: new Date().toISOString(),
                        payment_method: 'moolre',
                    },
                })
                .eq('id', order.id);

            return NextResponse.json({
                success: true,
                url: result.data.authorization_url,
                reference: result.data.reference,
                externalref: uniqueRef,
            });
        }

        return NextResponse.json(
            { success: false, message: result?.message || 'Failed to generate payment link' },
            { status: 400 }
        );

    } catch (error: any) {
        const aborted = error?.name === 'AbortError';
        console.error('Payment API Error:', aborted ? 'timeout' : error?.message || error);
        return NextResponse.json(
            { success: false, message: aborted ? 'Payment gateway timeout' : 'Internal Server Error' },
            { status: aborted ? 504 : 500 }
        );
    }
}
