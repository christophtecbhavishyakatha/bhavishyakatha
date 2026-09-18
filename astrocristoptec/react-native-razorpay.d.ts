declare module "react-native-razorpay" {
  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayError {
    code: number;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      payment_id?: string;
      order_id?: string;
    };
  }

  export interface RazorpayOptions {
    key: string;
    amount: string;
    currency: string;
    order_id: string;
    name: string;
    description?: string;
    image?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  };

  export default RazorpayCheckout;
}
