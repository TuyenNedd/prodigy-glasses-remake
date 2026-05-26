'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sandbox';
const USD_VND_RATE = 24000;

const checkoutSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  phone: z.string().min(1, 'Phone is required'),
  deliveryMethod: z.enum(['fast', 'economical']),
  paymentMethod: z.enum(['COD', 'PAYPAL']),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

export default function CheckoutPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryMethod: 'economical', paymentMethod: 'COD' },
  });

  const deliveryMethod = watch('deliveryMethod');
  const paymentMethod = watch('paymentMethod');
  const shippingPrice = deliveryMethod === 'fast' ? 30000 : 15000;

  const onSubmitCOD = async (data: CheckoutForm) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingAddress: {
            fullName: data.fullName,
            address: data.address,
            city: data.city,
            phone: data.phone,
          },
          deliveryMethod: data.deliveryMethod,
          paymentMethod: data.paymentMethod,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message || 'Failed to create order');
      }
      router.push('/orders');
    } catch (err: unknown) {
      setServerError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createPaypalOrder = async (): Promise<string> => {
    const formData = watch();
    // First create our order
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        shippingAddress: {
          fullName: formData.fullName,
          address: formData.address,
          city: formData.city,
          phone: formData.phone,
        },
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: 'PAYPAL',
      }),
    });
    if (!orderRes.ok) throw new Error('Failed to create order');
    const order = (await orderRes.json()) as { orderId: string };

    // Then create PayPal order
    const paypalRes = await fetch(`${API_BASE}/payment/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ orderId: order.orderId }),
    });
    if (!paypalRes.ok) throw new Error('Failed to create PayPal order');
    const paypal = (await paypalRes.json()) as { paypalOrderId: string };
    return paypal.paypalOrderId;
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-600">Please sign in to checkout.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Checkout</h1>

      {serverError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitCOD)} className="space-y-6">
        {/* Shipping Address */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Shipping Address
          </legend>
          <div>
            <input
              {...register('fullName')}
              placeholder="Full Name"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
            )}
          </div>
          <div>
            <input
              {...register('address')}
              placeholder="Address"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {errors.address && (
              <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                {...register('city')}
                placeholder="City"
                className="w-full rounded border px-3 py-2 text-sm"
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>
            <div>
              <input
                {...register('phone')}
                placeholder="Phone"
                className="w-full rounded border px-3 py-2 text-sm"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
          </div>
        </fieldset>

        {/* Delivery Method */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Delivery Method
          </legend>
          <label className="flex items-center gap-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
            <input type="radio" value="economical" {...register('deliveryMethod')} />
            <span className="flex-1 text-sm">Economical — {formatVND(15000)}</span>
          </label>
          <label className="flex items-center gap-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
            <input type="radio" value="fast" {...register('deliveryMethod')} />
            <span className="flex-1 text-sm">Fast — {formatVND(30000)}</span>
          </label>
        </fieldset>

        {/* Payment Method */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Payment Method
          </legend>
          <label className="flex items-center gap-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
            <input type="radio" value="COD" {...register('paymentMethod')} />
            <span className="text-sm">Cash on Delivery (COD)</span>
          </label>
          <label className="flex items-center gap-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
            <input type="radio" value="PAYPAL" {...register('paymentMethod')} />
            <span className="text-sm">PayPal</span>
          </label>
        </fieldset>

        {/* Shipping summary */}
        <div className="border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span>{formatVND(shippingPrice)}</span>
          </div>
          {paymentMethod === 'PAYPAL' && (
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>≈ USD equivalent</span>
              <span>~${(shippingPrice / USD_VND_RATE).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Submit */}
        {paymentMethod === 'COD' ? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Placing order...' : 'Place Order (COD)'}
          </button>
        ) : (
          <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
            <PayPalButtons
              style={{ layout: 'vertical', color: 'black' }}
              createOrder={createPaypalOrder}
              onApprove={async () => {
                router.push('/orders');
              }}
              onError={() => setServerError('PayPal payment failed. Please try again.')}
            />
          </PayPalScriptProvider>
        )}
      </form>
    </div>
  );
}
