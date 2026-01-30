
import crypto from 'crypto';

const PAYMENT_FM_API_URL = 'https://api-4n7kwvda0z5s.zhifu.fm.it88168.com/api/startOrder';
const MERCHANT_NUM = '611348376919097344';
// Use environment variable, fallback to empty string if not set (should be set in .env.local)
const SECRET = process.env.PAYMENT_FM_SECRET || '';

// Determine notify URL based on environment
// In production, this should be the actual public domain. 
// For local development, this won't work for callbacks unless using a tunnel (e.g., ngrok).
// The user hasn't specified a domain, so we'll construct it from the request or a base URL env.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const NOTIFY_URL = `${BASE_URL}/api/payment/notify`;
const RETURN_URL = `${BASE_URL}/user`; // Redirect to user center after payment

/**
 * MD5 Signature Generation
 */
export function createSignature(params: Record<string, any>, secret: string): string {
    // The signature string order depends on the specific API requirement.
    // For startOrder: merchantNum + orderNo + amount + notifyUrl + secret
    // For notify: state + merchantNum + orderNo + amount + secret (verified in verifySignature)
    return ''; // Placeholder, specific methods implement their own content
}

export class PaymentService {
    /**
     * Generate MD5 hash for the given string
     */
    private static md5(str: string): string {
        return crypto.createHash('md5').update(str).digest('hex').toLowerCase();
    }

    /**
     * Create a payment order with Payment FM
     */
    static async createPaymentOrder(orderNo: string, amount: number, subject: string = '商品购买') {
        console.log('[DEBUG] createPaymentOrder called. Secret length:', SECRET?.length);
        if (!SECRET) {
            console.error('PAYMENT_FM_SECRET is not set');
            return null;
        }

        // FORCE AMOUNT TO 0.01 FOR TESTING AS REQUESTED
        const payAmount = '0.01';
        // const payAmount = amount.toFixed(2); // Original logic

        const payType = 'wechat'; // Changed to 'wechat' as user only has WeChat configured

        // Signature format: merchantNum + orderNo + amount + notifyUrl + secret
        const signStr = MERCHANT_NUM + orderNo + payAmount + NOTIFY_URL + SECRET;
        const sign = this.md5(signStr);

        // Parameters as per doc
        const params = {
            merchantNum: MERCHANT_NUM,
            orderNo: orderNo,
            amount: payAmount,
            payType: payType,
            notifyUrl: NOTIFY_URL,
            returnUrl: RETURN_URL,
            sign: sign,
            returnType: 'json',
            subject: subject,
            payDuration: 10
        };

        try {
            // Needed to pass params as query string for this API? 
            // Doc says "Parameters passed: Query (URL splicing parameters)" but also axios post params.
            // Let's use URLSearchParams to be safe for a POST request that might expect form-urlencoded or query params.
            // The doc example uses `params` in axios, which usually sends JSON or query depending on config.
            // But PHP example uses `http_build_query` and appends to URL.
            // Let's append to URL to be safe as per PHP example "CURLOPT_URL... + param".

            const queryString = new URLSearchParams(params as any).toString();
            const fullUrl = `${PAYMENT_FM_API_URL}?${queryString}`;

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    payUrl: data.data.payUrl,
                    platformOrderNo: data.data.id
                };
            } else {
                console.error('Payment FM Error:', data.msg);
                return {
                    success: false,
                    msg: data.msg
                };
            }
        } catch (error) {
            console.error('Payment Service Error:', error);
            return {
                success: false,
                msg: 'Payment service connection failed'
            };
        }
    }

    /**
     * Verify payment notification signature
     */
    static verifyNotifySignature(params: Record<string, string>): boolean {
        if (!SECRET) return false;

        const { state, merchantNum, orderNo, amount, sign } = params;

        // Verify merchant number
        if (merchantNum !== MERCHANT_NUM) return false;

        // Signature format: state + merchantNum + orderNo + amount + secret
        const signStr = state + merchantNum + orderNo + amount + SECRET;
        const calculatedSign = this.md5(signStr);

        return calculatedSign === sign;
    }
}
