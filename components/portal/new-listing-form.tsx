'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, ChevronLeft } from 'lucide-react';
import PlacesAddressInput from '@/components/admin/PlacesAddressInput';
import DescriptionEditor from '@/components/admin/DescriptionEditor';
import { PageHead } from '@/components/admin/ui/page-head';
import { toast } from 'sonner';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

const schema = z.object({
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyFormattedAddress: z.string().optional().nullable(),
  propertyLat: z.coerce.number().optional().nullable(),
  propertyLng: z.coerce.number().optional().nullable(),
  propertyCity: z.string().optional().nullable(),
  propertyProvince: z.string().optional().nullable(),
  propertyPostalCode: z.string().optional().nullable(),
  propertyCountry: z.string().optional().nullable(),
  propertyPlaceId: z.string().optional().nullable(),
  propertySize: z.coerce.number().int().positive().optional().nullable(),
  yearBuilt: z.coerce
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  mlsNumber: z.string().optional().nullable(),
  listPrice: z.coerce.number().int().positive().optional().nullable(),
  bedrooms: z.string().optional().nullable(),
  bathrooms: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function NewListingForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{ lat: number | null; lng: number | null } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      propertyAddress: '',
      propertyFormattedAddress: '',
      propertyLat: undefined,
      propertyLng: undefined,
      propertyCity: '',
      propertyProvince: '',
      propertyPostalCode: '',
      propertyCountry: '',
      propertyPlaceId: '',
      propertySize: undefined,
      yearBuilt: undefined,
      mlsNumber: '',
      listPrice: undefined,
      bedrooms: '',
      bathrooms: '',
      description: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (String(data.error || '').toLowerCase().includes('verify')) {
          toast.error('Verify your email address before creating a listing.');
          router.push('/verify-email');
          return;
        }
        requestPermission('create listings');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'The listing could not be created.');
      }

      const created = await res.json();
      toast.success('Listing created');
      router.push(`/portal/orders/${created.id}`);
    } catch (e) {
      showErrorDialog(
        (e as Error).message || 'The listing could not be created.',
        'Could not create listing'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead
        title="New Listing"
        subtitle="Add a property to your workspace"
        actions={
          <button
            type="button"
            onClick={() => router.push('/portal/orders')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13.5px] font-semibold hover:border-navy-600 hover:bg-surface-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back to my orders
          </button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="propertyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Address</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <PlacesAddressInput
                        name="propertyAddress"
                        defaultValue={field.value}
                        onResolved={(d) => {
                          form.setValue(
                            'propertyAddress',
                            d.street || d.formatted?.split(',')[0] || field.value
                          );
                          form.setValue('propertyFormattedAddress', d.formatted || null);
                          form.setValue('propertyLat', (d.lat as any) ?? null);
                          form.setValue('propertyLng', (d.lng as any) ?? null);
                          form.setValue('propertyCity', d.city || '');
                          form.setValue('propertyProvince', d.province || '');
                          form.setValue('propertyPostalCode', d.postalCode || '');
                          form.setValue('propertyCountry', d.country || '');
                          form.setValue('propertyPlaceId', d.placeId || '');
                          setPreview({ lat: d.lat ?? null, lng: d.lng ?? null });
                        }}
                      />
                      {preview?.lat != null && preview?.lng != null && (
                        <div className="aspect-video overflow-hidden rounded border">
                          <iframe
                            src={`https://www.google.com/maps?q=${preview.lat},${preview.lng}&z=15&output=embed`}
                            className="h-full w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="propertySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Size (sqft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Built</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mlsNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MLS Number</FormLabel>
                    <FormControl>
                      <Input value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="listPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. 3 + 1"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. 2.5"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl>
                    <DescriptionEditor
                      name="description"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Write a short property description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/portal/orders')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Listing
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}