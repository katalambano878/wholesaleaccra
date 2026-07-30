import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Moolre callback: JSON body with status, code, message, data, secret, ts.
 */

export async function POST(req: Request) {
    console.log('[Callback] POST received at', new Date().toISOString());

    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`callback:${clientId}`, RATE_LIMITS.callback);

        if (!rateLimitResult.success) {
            console.warn('[Callback] Rate limited:', clientId);
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        let body: any = {};
        const contentType = req.headers.get('content-type') || '';

        try {
            if (contentType.includes('application/json')) {
                body = await req.json();
            } else if (contentType.includes('form')) {
                const formData = await req.formData();
                body = Object.fromEntries(formData.entries());
            } else {
                const rawText = await req.text();
                try {
                    body = JSON.parse(rawText);
                } catch {
                    try {
                        body = Object.fromEntries(new URLSearchParams(rawText).entries());
                    } catch {
                        console.warn('[Callback] Could not parse body');
                    }
                }
            }
        } catch {
            console.error('[Callback] Body parsing failed');
            return NextResponse.json({ success: false, message: 'Invalid Request Body' }, { status: 400 });
        }

        console.log('[Callback] Body keys:', Object.keys(body).join(', '));

        // Fail closed: callback secret is mandatory outside local development.
        const expectedSecret = process.env.MOOLRE_CALLBACK_SECRET;
        const allowInsecure =
            process.env.NODE_ENV !== 'production' &&
            process.env.ALLOW_INSECURE_MOOLRE_CALLBACK === 'true';

        if (!expectedSecret) {
            if (!allowInsecure) {
                console.error('[Callback] MOOLRE_CALLBACK_SECRET not configured — rejecting');
                return NextResponse.json(
                    { success: false, message: 'Callback secret not configured' },
                    { status: 503 }
                );
            }
            console.warn('[Callback] Insecure callback allowed (dev only)');
        } else if (!body.secret || body.secret !== expectedSecret) {
            console.error('[Callback] Secret mismatch or missing! Rejecting callback.');
            return NextResponse.json({ success: false, message: 'Invalid callback signature' }, { status: 403 });
        }

        const data = body.data || {};

        const rawExternalRef =
            data.externalref ||
            data.external_reference ||
            data.orderRef ||
            body.externalref ||
            body.orderRef ||
            body.external_reference;

        const merchantOrderRef = rawExternalRef
            ? String(rawExternalRef).replace(/-R\d+$/, '')
            : (data.metadata?.original_order_number || body.metadata?.original_order_number);

        const moolreReference =
            data.transactionid ||
            data.thirdpartyref ||
            body.reference ||
            'callback';

        const apiStatus = body.status;
        const txStatus = data.txtstatus;
        const messageStr = String(body.message || '').toLowerCase();

        console.log('[Callback] Order ref:', merchantOrderRef,
            '| API status:', apiStatus,
            '| TX status:', txStatus,
            '| Moolre ref:', moolreReference);

        if (!merchantOrderRef) {
            console.error('[Callback] Missing order reference');
            return NextResponse.json({ success: false, message: 'Missing order reference' }, { status: 400 });
        }

        // Require BOTH api status AND transaction status (strict).
        const apiOk = (apiStatus === 1 || apiStatus === '1');
        const txOk = (txStatus === 1 || txStatus === '1');
        const isSuccess = apiOk && txOk && !messageStr.includes('fail') && !messageStr.includes('error');

        if (isSuccess) {
            console.log(`[Callback] Payment SUCCESS for Order ${merchantOrderRef}`);

            const { data: existingOrder, error: fetchError } = await supabaseAdmin
                .from('orders')
                .select('id, order_number, payment_status, total, metadata')
                .eq('order_number', merchantOrderRef)
                .single();

            if (fetchError || !existingOrder) {
                console.error('[Callback] Order not found:', merchantOrderRef);
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            if (existingOrder.payment_status === 'paid') {
                console.log('[Callback] Order already paid, skipping:', merchantOrderRef);
                return NextResponse.json({ success: true, message: 'Order already processed' });
            }

            const callbackAmount = data.amount != null
                ? parseFloat(data.amount)
                : (body.amount != null ? parseFloat(body.amount) : null);

            if (callbackAmount === null || Number.isNaN(callbackAmount)) {
                console.error('[Callback] Missing amount — REJECTING');
                return NextResponse.json({
                    success: false,
                    message: 'Payment amount missing from callback'
                }, { status: 400 });
            }

            const expectedAmount = Number(existingOrder.total);
            if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
                console.error('[Callback] AMOUNT MISMATCH — REJECTING! Expected:', expectedAmount, 'Got:', callbackAmount);
                return NextResponse.json({
                    success: false,
                    message: 'Payment amount does not match order total'
                }, { status: 400 });
            }

            const { data: orderJson, error: updateError } = await supabaseAdmin
                .rpc('mark_order_paid', {
                    order_ref: merchantOrderRef,
                    moolre_ref: String(moolreReference)
                });

            if (updateError) {
                console.error('[Callback] RPC Error:', updateError.message);
                return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
            }

            if (!orderJson) {
                console.error('[Callback] Order not found after RPC:', merchantOrderRef);
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            console.log('[Callback] Order updated! ID:', orderJson.id, '| Status:', orderJson.status);

            try {
                if (orderJson.email) {
                    await supabaseAdmin.rpc('update_customer_stats', {
                        p_customer_email: orderJson.email,
                        p_order_total: orderJson.total
                    });
                }
            } catch (statsError: any) {
                console.error('[Callback] Customer stats failed:', statsError.message);
            }

            // Notifications are best-effort and deduped inside sendOrderConfirmation.
            try {
                await sendOrderConfirmation(orderJson);
            } catch (notifyError: any) {
                console.error('[Callback] Notification failed:', notifyError.message);
            }

            return NextResponse.json({ success: true, message: 'Payment verified and Order Updated' });

        } else {
            console.log(`[Callback] Payment FAILED for ${merchantOrderRef} | Status: ${apiStatus} | TX: ${txStatus}`);

            const { data: existingOrder } = await supabaseAdmin
                .from('orders')
                .select('id, payment_status, metadata')
                .eq('order_number', merchantOrderRef)
                .maybeSingle();

            // Never overwrite a successful payment with a delayed failure.
            if (existingOrder?.payment_status === 'paid') {
                return NextResponse.json({ success: true, message: 'Order already paid' });
            }

            const prevMeta = (existingOrder?.metadata && typeof existingOrder.metadata === 'object')
                ? existingOrder.metadata
                : {};

            await supabaseAdmin
                .from('orders')
                .update({
                    payment_status: 'failed',
                    metadata: {
                        ...prevMeta,
                        moolre_reference: moolreReference,
                        failure_reason: body.message || 'Payment failed',
                        last_callback_at: new Date().toISOString(),
                    }
                })
                .eq('order_number', merchantOrderRef);

            return NextResponse.json({ success: false, message: 'Payment not successful' });
        }

    } catch (error: any) {
        console.error('[Callback] Critical Error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Moolre callback endpoint ready', timestamp: new Date().toISOString() });
}
