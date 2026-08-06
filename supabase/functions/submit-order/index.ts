import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Types & Interfaces ---
interface Config {
  joudaUrl: string;
  joudaAnonKey: string;
  joudaServiceKey: string;
  inventoryUrl: string;
  inventoryKey: string;
  systemUserUuid: string;
  onlineWarehouseId: string;
}

interface OrderItemPayload {
  product_barcode: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

interface OrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  order_type: string;
  branch_id?: string;
  payment_method?: string;
  notes?: string;
  items: OrderItemPayload[];
  subtotal: number;
  delivery_fee?: number;
  latitude?: number;
  longitude?: number;
}

interface RpcItem {
  line_no: number;
  product_barcode: string;
  warehouse_id: string;
  quantity: number;
  unit_price: number;
  expiry_date: string | null;
}

const MIN_CUSTOMER_DISTANCE_KM = 0.2;

// --- 1. HTTP Helpers ---
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function handleCors() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// --- 2. Configuration & Validation ---
function loadConfiguration(): Config {
  const config = {
    joudaUrl: Deno.env.get('SUPABASE_URL') || '',
    joudaAnonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
    joudaServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    inventoryUrl: Deno.env.get('INVENTORY_SUPABASE_URL') || '',
    inventoryKey: Deno.env.get('INVENTORY_SERVICE_ROLE_KEY') || '',
    systemUserUuid: Deno.env.get('SYSTEM_USER_UUID') || '',
    onlineWarehouseId: Deno.env.get('ONLINE_WAREHOUSE_ID') || '',
  };

  const missing = Object.entries(config).filter(([k, v]) => !v && k !== 'joudaAnonKey');
  if (missing.length > 0) {
    throw new Error(`Missing server configuration: ${missing.map(m => m[0]).join(', ')}`);
  }

  return config;
}

async function checkMaintenanceMode(config: Config): Promise<{ isMaintenance: boolean; message?: string }> {
  if (!config.joudaAnonKey) return { isMaintenance: false };
  try {
    const anonClient = createClient(config.joudaUrl, config.joudaAnonKey, { auth: { persistSession: false } });
    const { data } = await anonClient.from('app_settings_public').select('maintenance_mode, maintenance_message').eq('id', 1).single();
    if (data?.maintenance_mode) return { isMaintenance: true, message: data.maintenance_message };
  } catch (e) {
    console.warn('Maintenance check failed, proceeding...', e);
  }
  return { isMaintenance: false };
}

function validatePayload(body: any): OrderPayload {
  const { customer_name, customer_phone, items } = body;
  if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
    throw new Error('بيانات الطلب غير مكتملة أو السلة فارغة');
  }

  for (const item of items) {
    if (!item.product_barcode || !item.quantity || item.quantity <= 0 || item.unit_price === undefined || item.unit_price < 0) {
       throw new Error('توجد مشكلة في بيانات بعض المنتجات في السلة (الكمية أو السعر غير صالح)');
    }
  }

  return body as OrderPayload;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function validateDeliveryLocation(payload: OrderPayload, joudaClient: SupabaseClient) {
  if (payload.order_type !== 'delivery') return;

  if (typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
    throw new Error('حدد موقع التوصيل على الخريطة قبل إرسال الطلب.');
  }

  const { data } = await joudaClient
    .from('app_settings_public')
    .select('store_latitude, store_longitude')
    .eq('id', 1)
    .single();

  const storeLat = Number(data?.store_latitude ?? 15.3980555);
  const storeLng = Number(data?.store_longitude ?? 44.2094444);
  const distanceKm = calculateDistanceKm(storeLat, storeLng, payload.latitude, payload.longitude);

  if (distanceKm < MIN_CUSTOMER_DISTANCE_KM) {
    throw new Error('الموقع قريب جداً من جوده. حدد موقع بيتك بدقة على الخريطة.');
  }
}

// --- 3. Business Logic Helpers ---
async function processPackagesAndExpiry(payload: OrderPayload, joudaClient: SupabaseClient, inventoryClient: SupabaseClient, warehouseId: string) {
  const { items } = payload;
  const itemBarcodes = items.map(i => i.product_barcode);
  
  const { data: packageMappings } = await joudaClient.from('package_items').select('package_barcode, product_barcode, quantity').in('package_barcode', itemBarcodes);
  const baseBarcodes = packageMappings?.map(m => m.product_barcode) || [];
  const { data: baseProducts } = baseBarcodes.length > 0 
    ? await joudaClient.from('products').select('barcode, name, price').in('barcode', baseBarcodes)
    : { data: [] };

  const allBarcodesToQuery = [
    ...items.filter(i => !i.product_barcode.startsWith('PKG-')).map(i => i.product_barcode),
    ...baseBarcodes
  ];

  const { data: invProducts } = allBarcodesToQuery.length > 0
    ? await inventoryClient.from('products').select('barcode, category, track_expiry, is_stock_tracked').in('barcode', allBarcodesToQuery).eq('is_active', true)
    : { data: [] };

  const barcodesWithExpiry = (invProducts || []).filter(p => p.track_expiry).map(p => p.barcode);
  const { data: activeBatches } = barcodesWithExpiry.length > 0
    ? await inventoryClient.from('active_expiry_batches').select('product_barcode, expiry_date, remaining_qty').in('product_barcode', barcodesWithExpiry).eq('warehouse_id', warehouseId).gt('remaining_qty', 0).order('expiry_date', { ascending: true })
    : { data: [] };

  const resolveExpiryDate = async (barcode: string): Promise<string | null> => {
    // Quotations don't need a specific expiry date.
    // FIFO allocation happens atomically at convert_quotation_to_invoice time.
    return null;
  };

  const rpcItems: RpcItem[] = [];
  let packageDiscount = 0;
  let lineNo = 1;

  for (const item of items) {
    const isPackage = item.product_barcode.startsWith('PKG-');
    
    if (isPackage) {
      const pkgItems = packageMappings?.filter(m => m.package_barcode === item.product_barcode) || [];
      if (pkgItems.length === 0) throw new Error(`عذراً، البكج (${item.product_name}) غير مكتمل. يرجى إبلاغ الإدارة.`);

      let totalBasePrice = 0;
      for (const pItem of pkgItems) {
        const baseProd = baseProducts?.find(bp => bp.barcode === pItem.product_barcode);
        const basePrice = baseProd ? Number(baseProd.price) : 0;
        totalBasePrice += (basePrice * pItem.quantity);
        
        rpcItems.push({
          line_no: lineNo++,
          product_barcode: pItem.product_barcode,
          warehouse_id: warehouseId,
          quantity: pItem.quantity * item.quantity,
          unit_price: basePrice,
          expiry_date: await resolveExpiryDate(pItem.product_barcode),
        });
      }
      const expectedBaseTotal = totalBasePrice * item.quantity;
      const actualPackageTotal = Number(item.unit_price) * item.quantity;
      packageDiscount += (expectedBaseTotal - actualPackageTotal);
    } else {
      rpcItems.push({
        line_no: lineNo++,
        product_barcode: item.product_barcode,
        warehouse_id: warehouseId,
        quantity: item.quantity,
        unit_price: item.unit_price,
        expiry_date: await resolveExpiryDate(item.product_barcode),
      });
    }
  }

  return { rpcItems, packageDiscount, packageMappings, baseProducts, invProducts: invProducts || [] };
}

async function createInventoryQuotation(payload: OrderPayload, rpcItems: RpcItem[], packageDiscount: number, config: Config, inventoryClient: SupabaseClient, invoiceId: string, idempotencyKey: string, orderNumber: string) {
  let combinedNotes = `رقم طلب التطبيق: ${orderNumber}`;
  if (payload.notes) combinedNotes += `\nملاحظات العميل: ${payload.notes}`;
  const finalAddress = payload.customer_address ? `${payload.customer_address}\n\n[ ${combinedNotes} ]` : `[ ${combinedNotes} ]`;

  const { data: rpcResult, error: rpcError } = await inventoryClient.rpc('create_quotation', {
    p_idempotency_key: idempotencyKey,
    p_invoice_id: invoiceId,
    p_customer_id: null,
    p_customer_name_snapshot: payload.customer_name,
    p_customer_phone_snapshot: payload.customer_phone || null,
    p_customer_address_snapshot: finalAddress,
    p_issuing_warehouse_id: config.onlineWarehouseId,
    p_payment_method: payload.payment_method || 'CASH',
    p_wallet_provider: null,
    p_subtotal: payload.subtotal + packageDiscount,
    p_discount: packageDiscount,
    p_delivery_fee: payload.delivery_fee || 0,
    p_collector_id: null,
    p_created_by: config.systemUserUuid,
    p_items: rpcItems,
  });

  if (rpcError) throw new Error('فشل حجز الطلب في نظام المخزون.');

  let quotationResult: any = rpcResult;
  if (typeof rpcResult === 'string') {
    try { quotationResult = JSON.parse(rpcResult); } catch { /* ignore */ }
  }

  return {
    quotationId: quotationResult?.invoice_id || invoiceId,
    success: quotationResult?.success !== false
  };
}

async function verifyInventoryQuotationItems(quotationId: string, rpcItems: RpcItem[], inventoryClient: SupabaseClient) {
  const expectedQty = new Map<string, number>();
  for (const item of rpcItems) {
    expectedQty.set(item.product_barcode, (expectedQty.get(item.product_barcode) || 0) + item.quantity);
  }

  const { data: invoiceItems, error } = await inventoryClient
    .from('invoice_items')
    .select('product_barcode, quantity')
    .eq('invoice_id', quotationId);

  if (error) {
    throw new Error(`تعذر التحقق من عناصر فاتورة المخزون: ${error.message}`);
  }

  const actualQty = new Map<string, number>();
  for (const item of invoiceItems || []) {
    const barcode = String(item.product_barcode || '');
    if (!barcode) continue;
    actualQty.set(barcode, (actualQty.get(barcode) || 0) + Number(item.quantity || 0));
  }

  const missingOrMismatched = Array.from(expectedQty.entries()).filter(([barcode, expected]) => {
    return (actualQty.get(barcode) || 0) !== expected;
  });

  if (missingOrMismatched.length > 0) {
    const barcodes = missingOrMismatched.map(([barcode]) => barcode).join(', ');
    throw new Error(`فشل إنشاء الفاتورة في نظام المخزون: بعض المنتجات لم تُسجل في الفاتورة (${barcodes}).`);
  }
}

async function saveOrderLocally(payload: OrderPayload, quotationId: string, orderNumber: string, rpcSuccess: boolean, joudaClient: SupabaseClient) {
  const total = payload.subtotal + (payload.delivery_fee || 0);

  const { data: insertedOrder, error: insertError } = await joudaClient.from('customer_orders').insert({
    quotation_id: quotationId,
    order_number: orderNumber,
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    customer_address: payload.customer_address || null,
    order_type: payload.order_type,
    branch_id: payload.branch_id || null,
    subtotal: payload.subtotal,
    discount: 0,
    delivery_fee: payload.delivery_fee || 0,
    total,
    payment_method: payload.payment_method || 'CASH',
    notes: payload.notes || null,
    status: rpcSuccess ? 'submitted' : 'failed',
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
  }).select().single();

  if (insertError) throw new Error(`Insert order error: ${insertError.message}`);

  const orderItemsToInsert = payload.items.map(item => ({
    order_id: insertedOrder.id,
    product_barcode: item.product_barcode,
    product_name: item.product_name || item.product_barcode,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
  }));

  const { error: itemsError } = await joudaClient.from('order_items').insert(orderItemsToInsert);
  if (itemsError) throw new Error(`Insert items error: ${itemsError.message}`);

  return insertedOrder;
}

async function voidQuotation(quotationId: string, config: Config, inventoryClient: SupabaseClient) {
  try {
    await inventoryClient.rpc('void_quotation', { p_invoice_id: quotationId, p_actor_user_id: config.systemUserUuid });
    console.log('Compensation successful: quotation voided');
  } catch (compErr) {
    console.error('Compensation failed:', compErr);
  }
}

// --- 4. Telegram Notification Engine ---
function orderTypeLine(orderType?: string): string {
  if (orderType === 'shipping') return '📦 <b>نوع الطلب:</b> شحن محافظات';
  if (orderType === 'delivery') return '🚚 <b>نوع الطلب:</b> توصيل داخل صنعاء';
  if (orderType === 'pickup') return '🏬 <b>نوع الطلب:</b> استلام من الفرع';
  return '📋 <b>نوع الطلب:</b> غير محدد';
}

function mapsLinkLine(latitude?: number, longitude?: number): string {
  if (!latitude || !longitude) return '';
  const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
  return `\n🗺️ <b>موقع العميل:</b> <a href="${url}">فتح في خرائط جوجل</a>`;
}

function buildTelegramMessage(orderData: any): string {
  const { orderNumber, customerName, customerPhone, customerAddress, orderType, total, deliveryFee, items, notes, latitude, longitude } = orderData;
  const itemsList = items.map((item: any) => {
    if (item.is_package && item.sub_items && item.sub_items.length > 0) {
      const subList = item.sub_items.map((sub: any) => `    ▫️ ${sub.product_name} (× ${sub.quantity * item.quantity})`).join('\n');
      return `▪️ <b>${item.product_name}</b> (× ${item.quantity})\n${subList}`;
    }
    return `▪️ ${item.product_name} (× ${item.quantity})`;
  }).join('\n');

  const notesLine = notes ? `\n📝 <b>ملاحظات:</b> <code>${notes}</code>\n` : '';
  const subtotalLine = `\n💵 <b>قيمة المنتجات:</b> <b>${(total - (deliveryFee || 0)).toLocaleString()}</b> ر.ي`;
  const deliveryLine = deliveryFee > 0 ? `\n🛵 <b>التوصيل:</b> <b>${deliveryFee.toLocaleString()}</b> ر.ي` : '';

  return `
🛒 <b>طلب جديد (#${orderNumber})</b>

👤 <b>العميل:</b> ${customerName}
📞 <b>الجوال:</b> <code>${customerPhone}</code>
${orderTypeLine(orderType)}
📍 <b>العنوان:</b> ${customerAddress || 'استلام من الفرع'}${mapsLinkLine(latitude, longitude)}

📦 <b>المنتجات:</b>
${itemsList}
${notesLine}${subtotalLine}${deliveryLine}
💰 <b>الإجمالي الكلي:</b> <b>${total.toLocaleString()}</b> ر.ي
`.trim();
}

async function dispatchTelegramNotification(message: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatIdsStr = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');
  if (!botToken || !chatIdsStr) return;

  const adminIds = chatIdsStr.split(',').map(id => id.trim()).filter(id => id && !id.startsWith('-'));

  for (const chatId of adminIds) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      });
    } catch (e) {
      console.error(`Telegram notification error for ${chatId}:`, e);
    }
  }
}

// --- 5. Main Route Handler ---
Deno.serve(async (req: Request) => {
  // 1. CORS
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    // 2. Setup
    const config = loadConfiguration();
    
    // 3. Maintenance Check
    const { isMaintenance, message } = await checkMaintenanceMode(config);
    if (isMaintenance) return jsonResponse({ success: false, message: message || 'النظام تحت الصيانة حالياً' }, 503);

    // 4. Input Validation
    let payload: OrderPayload;
    try {
      payload = validatePayload(await req.json());
    } catch (e: any) {
      return jsonResponse({ success: false, message: e.message || 'Invalid JSON format' }, 200);
    }

    const joudaClient = createClient(config.joudaUrl, config.joudaServiceKey, { auth: { persistSession: false } });
    const inventoryClient = createClient(config.inventoryUrl, config.inventoryKey, { auth: { persistSession: false } });

    await validateDeliveryLocation(payload, joudaClient);

    const invoiceId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();

    let orderNumber = 'J-0000';
    try {
      const { data } = await joudaClient.rpc('generate_order_number');
      if (data) orderNumber = data;
    } catch {}

    // 5. Business Logic: Packages & Expiry
    const { rpcItems, packageDiscount, packageMappings, baseProducts, invProducts } = await processPackagesAndExpiry(payload, joudaClient, inventoryClient, config.onlineWarehouseId);
    
    // 5.5 Early Stock Validation (Prevent out-of-stock orders from entering as DRAFT)
    const requiredQtyMap = new Map<string, number>();
    for (const rpcItem of rpcItems) {
      const current = requiredQtyMap.get(rpcItem.product_barcode) || 0;
      requiredQtyMap.set(rpcItem.product_barcode, current + rpcItem.quantity);
    }

    const allBaseBarcodes = Array.from(requiredQtyMap.keys());
    if (allBaseBarcodes.length > 0) {
      const { data: stockData } = await inventoryClient
        .from('product_stock_summary')
        .select('product_barcode, current_stock')
        .in('product_barcode', allBaseBarcodes)
        .eq('warehouse_id', config.onlineWarehouseId);

      for (const [barcode, needed] of requiredQtyMap.entries()) {
        const invProduct = invProducts.find((p: any) => p.barcode === barcode);
        const isAlwaysAvailable = invProduct?.is_stock_tracked === false || invProduct?.category === 'مخبوزات';
        if (isAlwaysAvailable) continue;

        const available = stockData?.find(s => s.product_barcode === barcode)?.current_stock || 0;
        if (needed > available) {
          const pName = payload.items.find(i => i.product_barcode === barcode)?.product_name 
                     || baseProducts?.find(p => p.barcode === barcode)?.name 
                     || barcode;
          return jsonResponse({ 
            success: false, 
            message: `عذراً، المنتج "${pName}" غير متوفر بالكمية المطلوبة (المتاح: ${available})` 
          }, 200);
        }
      }
    }
    
    // 6. Create Quotation in Inventory
    const { quotationId, success: rpcSuccess } = await createInventoryQuotation(payload, rpcItems, packageDiscount, config, inventoryClient, invoiceId, idempotencyKey, orderNumber);

    if (rpcSuccess) {
      try {
        await verifyInventoryQuotationItems(quotationId, rpcItems, inventoryClient);
      } catch (verifyErr: any) {
        console.error('Inventory quotation item verification failed:', verifyErr);
        await voidQuotation(quotationId, config, inventoryClient);
        return jsonResponse({ success: false, message: verifyErr.message || 'فشل التحقق من عناصر فاتورة المخزون.' }, 200);
      }
    }

    // 7. Save to JoudaApp & Compensate on Failure
    let orderRecord: any = null;
    try {
      orderRecord = await saveOrderLocally(payload, quotationId, orderNumber, rpcSuccess, joudaClient);
    } catch (localErr) {
      console.error('Local DB Failure. Initiating Rollback:', localErr);
      await voidQuotation(quotationId, config, inventoryClient);
      return jsonResponse({ success: false, message: 'فشل حفظ الطلب محلياً. تم إلغاء الحجز تلقائياً.' }, 200);
    }

    // 8. Telegram Background Notification
    if (rpcSuccess && orderRecord) {
      const notificationData = {
        orderId: orderRecord.id,
        orderNumber,
        customerName: payload.customer_name,
        customerPhone: payload.customer_phone,
        customerAddress: payload.customer_address,
        orderType: payload.order_type,
        total: payload.subtotal + (payload.delivery_fee || 0),
        deliveryFee: payload.delivery_fee || 0,
        notes: payload.notes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        items: payload.items.map((item: any) => {
          const isPackage = String(item.product_barcode).startsWith('PKG-');
          let subItems: any[] = [];
          if (isPackage && packageMappings) {
            subItems = packageMappings.filter((m: any) => m.package_barcode === item.product_barcode).map((pItem: any) => {
              const baseProd = baseProducts?.find((bp: any) => bp.barcode === pItem.product_barcode);
              return { product_name: baseProd ? baseProd.name : pItem.product_barcode, quantity: pItem.quantity };
            });
          }
          return { product_name: item.product_name, quantity: item.quantity, is_package: isPackage, sub_items: isPackage ? subItems : undefined };
        }),
      };

      const tgMessage = buildTelegramMessage(notificationData);
      const notifyPromise = dispatchTelegramNotification(tgMessage).catch(err => {
        console.error('Error sending Telegram notification:', err);
      });

      // Non-blocking wait
      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        (globalThis as any).EdgeRuntime.waitUntil(notifyPromise);
      }
    }

    // 9. Instant Response
    return jsonResponse({
      success: rpcSuccess,
      order_number: orderNumber,
      quotation_id: quotationId,
      order_id: orderRecord?.id || null,
      message: 'تم إرسال الطلب بنجاح',
    });

  } catch (error: any) {
    console.error('Critical request error:', error);
    return jsonResponse({ success: false, message: error.message || 'حدث خطأ غير متوقع' }, 200);
  }
});
