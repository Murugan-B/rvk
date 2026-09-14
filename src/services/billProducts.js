const normalizeProductItem = (item) => {
  const quantity = Number(item.quantity ?? item.qty ?? 0);
  const unit_price = Number(item.unit_price ?? item.price_at_time ?? item.price ?? 0);
  return {
    sku: item.sku ?? item.product_id ?? item.id ?? '',
    product_name: item.product_name ?? item.name ?? item.products?.name ?? `Item ${item.product_id ?? item.id ?? ''}`,
    quantity,
    unit_price,
    subtotal: Number(item.subtotal ?? unit_price * quantity),
  };
};

export const parseBillProducts = (value) => {
  if (!value) return [];
  let items = Array.isArray(value) ? value : [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
  }

  return items.map(normalizeProductItem);
};

export const normalizeBillProducts = async (billId) => {
  const response = await fetch(`/api/bills/${billId}/normalize`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to normalize bill products');
  }

  return response.json();
};