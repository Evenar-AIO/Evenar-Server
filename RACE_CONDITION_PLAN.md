# Plan: Implement Race Condition Protection cho Backend

## 1. Tổng quan vấn đề

### Các Race Condition hiện tại:

| # | Location | Vấn đề | Mức độ nghiêm trọng |
|---|----------|--------|---------------------|
| 1 | `inventoryManager.reserveSeats()` | TOCTOU - check và reserve không atomic | 🔴 Cao |
| 2 | `paymentService.handleCallback()` | Callback có thể bị gọi nhiều lần, double confirm | 🔴 Cao |
| 3 | `promotionService.incrementUsageCount()` | Check usage limit và increment không atomic | 🟡 Trung bình |
| 4 | `cartService.addToCart()` | Không kiểm tra inventory trước khi thêm | 🟡 Trung bình |
| 5 | `orderService.createOrder()` | Nhiều DB ops không trong transaction | 🟡 Trung bình |
| 6 | `refundService.requestRefund()` | Không kiểm tra order đã refund chưa an toàn | 🟡 Trung bình |

---

## 2. Giải pháp kỹ thuật

### 2.1. Database Transaction Setup

**File**: `server/index.js`

Cần enable MongoDB transactions:

```javascript
// Connection options với transaction support
mongoose.connect(mongoURI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
})
```

### 2.2. Atomic Inventory Reservation

**File**: `server/src/utils/inventoryManager.js`

**Cách 1: Dùng MongoDB Transaction với session** (Khuyến nghị - an toàn nhất)

```javascript
// reserveSeats với transaction
exports.reserveSeats = async (tickets, session) => {
  for (const t of tickets) {
    const result = await TicketInventory.findOneAndUpdate(
      {
        ticketInfoId: t.ticketInfoId,
        $expr: { 
          $gte: [
            { $subtract: ['$totalQuantity', { $add: ['$soldQuantity', '$reservedQuantity'] }] },
            t.quantity
          ]
        }
      },
      { $inc: { reservedQuantity: t.quantity } },
      { session, new: true }
    );
    
    if (!result) {
      throw new Error(`Not enough inventory for ticket: ${t.ticketInfoId}`);
    }
  }
  return true;
};
```

**Cách 2: Dùng atomic $inc với điều kiện** (Đơn giản hơn, không cần transaction)

```javascript
// reserveSeats atomic không cần transaction
exports.reserveSeatsAtomic = async (tickets) => {
  for (const t of tickets) {
    const result = await TicketInventory.findOneAndUpdate(
      {
        ticketInfoId: t.ticketInfoId,
        $expr: { 
          $gte: [
            { $subtract: ['$totalQuantity', { $add: ['$soldQuantity', '$reservedQuantity'] }] },
            t.quantity
          ]
        }
      },
      { $inc: { reservedQuantity: t.quantity } },
      { new: true }
    );
    
    if (!result) {
      // Rollback các tickets đã reserve (nếu có)
      await exports.rollbackReserve(tickets.slice(0, tickets.indexOf(t)));
      throw new Error(`Not enough inventory for ticket: ${t.ticketInfoId}`);
    }
  }
  return true;
};
```

**Ưu/Nhược cách 1 vs cách 2**:

| Tiêu chí | Transaction | Atomic $inc |
|----------|-------------|-------------|
| An toàn tuyệt đối | ✅ | ⚠️ Cần manual rollback |
| Performance | Chậm hơn (lock) | Nhanh hơn |
| Code phức tạp | Phức tạp hơn | Đơn giản hơn |
| MongoDB version | >= 4.0 | Tất cả |

### 2.3. Update orderService.createOrder()

**File**: `server/src/services/orderService.js`

```javascript
const mongoose = require('mongoose');

exports.createOrder = async (userId, eventId, tickets, promotionCode = null, paymentMethod = 'VNPAY') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Validate event
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new Error('Event not found');
    
    // 2. Resolve ticket prices & compute subtotal
    // ... (giữ nguyên logic hiện tại)
    
    // 3. Apply promotion (với session)
    let discountAmount = 0;
    if (promotionCode) {
      const { promo, discount } = await promotionService.validatePromotion(
        promotionCode, eventId, subtotalAmount
      ).session(session);
      // ... rest of promotion logic
    }
    
    // 4. Reserve inventory VỚI SESSION
    await inventoryManager.reserveSeats(resolvedTickets, session);
    
    // 5. Create Order VỚI SESSION
    const order = await Order.create([{
      userId,
      eventId,
      // ... các trường khác
    }], { session });
    
    // 6. Create OrderItems VỚI SESSION
    // ... 
    
    await session.commitTransaction();
    session.endSession();
    
    return { /* result */ };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
```

### 2.4. Fix Payment Callback Race Condition

**File**: `server/src/services/paymentService.js`

```javascript
exports.handleCallback = async (reqBody) => {
  const { code, data } = reqBody;
  
  if (code === '00' && data) {
    const { orderCode, status } = data;
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const payment = await Payment.findOne({ orderCode }).session(session);
      if (!payment) throw new Error('Payment record not found');
      
      // Double-check: đã confirm chưa?
      if (payment.status === 'SUCCESS') {
        return { status: 'ALREADY_CONFIRMED' };
      }
      
      if (status === 'PAID') {
        payment.status = 'SUCCESS';
        await payment.save({ session });
        
        const order = await Order.findById(payment.orderId).session(session);
        
        // Double-check: order đã paid chưa?
        if (order.paymentStatus === 'paid') {
          await session.commitTransaction();
          return { status: 'ALREADY_CONFIRMED' };
        }
        
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save({ session });
        
        const items = await OrderItem.find({ orderId: order._id }).session(session);
        await inventoryManager.confirmOrder(items, session);
      }
      
      await session.commitTransaction();
      return { status: 'CALLBACK_OK' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  return { status: 'PENDING_OR_FAILED' };
};
```

### 2.5. Fix Promotion Race Condition

**File**: `server/src/services/promotionService.js`

```javascript
// Dùng atomic findOneAndUpdate thay vì check rồi update
exports.validateAndUsePromotion = async (code, eventId, totalAmount) => {
  // Atomic: check + increment trong 1 operation
  const promo = await Promotion.findOneAndUpdate(
    {
      promotionCode: code,
      isActive: true,
      startTime: { $lte: new Date() },
      endTime: { $gte: new Date() },
      $or: [
        { maxUsageCount: { $exists: false } },
        { maxUsageCount: null },
        { currentUsageCount: { $lt: '$maxUsageCount' } }  // Note: không hoạt động trong query
      ],
      // Alternative: dùng $expr
      $expr: {
        $or: [
          { $eq: ['$maxUsageCount', null] },
          { $lt: ['$currentUsageCount', '$maxUsageCount'] }
        ]
      }
    },
    { $inc: { currentUsageCount: 1 } },
    { new: true }
  );
  
  if (!promo) {
    // Check lỗi cụ thể
    const existingPromo = await Promotion.findOne({ promotionCode: code });
    if (!existingPromo) throw new Error('Invalid promotion code');
    if (!existingPromo.isActive) throw new Error('Promotion is inactive');
    if (new Date() < existingPromo.startTime || new Date() > existingPromo.endTime) {
      throw new Error('Promotion code has expired');
    }
    if (existingPromo.currentUsageCount >= existingPromo.maxUsageCount) {
      throw new Error('Promotion code has reached its usage limit');
    }
    throw new Error('Promotion validation failed');
  }
  
  // Tính discount
  let discount = 0;
  if (promo.promotionType === 'percentage') {
    discount = (totalAmount * promo.discountPercentage) / 100;
    if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
      discount = promo.maxDiscountAmount;
    }
  } else if (promo.promotionType === 'fixed_amount') {
    discount = promo.discountAmount;
  }
  
  discount = Math.min(discount, totalAmount);
  
  return { promo, discount };
2.6. Add Inventory Check to Cart

};
```

### **File**: `server/src/services/cartService.js`

```javascript
const inventoryManager = require('../utils/inventoryManager');

exports.addToCart = async (userId, eventId, ticketInfoId, quantity) => {
  const qty = Number(quantity);
  
  // 1. Validate ticket type
  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  
  // 2. CHECK INVENTORY BEFORE ADDING
  const hasInventory = await inventoryManager.checkAvailability(ticketInfoId, qty);
  if (!hasInventory) {
    throw new Error('Not enough tickets available');
  }
  
  // 3. Rest of cart logic...
  // ...
};
```

### 2.7. Fix Refund Race Condition

**File**: `server/src/services/refundService.js`

```javascript
exports.requestRefund = async (orderId, reason) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');
    
    // Check: đã refunded chưa?
    if (order.paymentStatus === 'refunded') {
      throw new Error('Order has already been refunded');
    }
    
    // Check: đã paid chưa? (chỉ refund order đã paid)
    if (order.paymentStatus !== 'paid') {
      throw new Error('Cannot refund an unpaid order');
    }
    
    const existingRefund = await Refund.findOne({ orderId }).session(session);
    if (existingRefund) throw new Error('Refund already requested for this order');
    
    const refund = await Refund.create([{
      orderId,
      reason,
      amount: order.totalAmount,
      status: 'PENDING',
    }], { session });
    
    order.paymentStatus = 'refunded';
    order.orderStatus = 'refunded';
    await order.save({ session });
    
    const items = await OrderItem.find({ orderId: order._id }).session(session);
    if (items.length) {
      await inventoryManager.releaseSeats(items, session);
    }
    
    await session.commitTransaction();
    
    return {
      refundId: refund[0]._id,
      status: refund[0].status,
      amount: refund[0].amount,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

---

## 3. Thứ tự ưu tiên implement

| Priority | Task | Effort | Reason |
|----------|------|--------|--------|
| 1 | Atomic Inventory Reservation | Medium | Nguy cơ over-sell cao nhất |
| 2 | Payment Callback Fix | Medium | Prevent double confirm |
| 3 | Order Service Transaction | Medium | Đảm bảo data consistency |
| 4 | Cart Inventory Check | Low | UX improvement |
| 5 | Promotion Atomic | Low | Hạn chế abuse |
| 6 | Refund Transaction | Low | Data consistency |

---

## 4. Files cần thay đổi

1. `server/index.js` - Add transaction connection options
2. `server/src/utils/inventoryManager.js` - Add atomic methods with session support
3. `server/src/services/orderService.js` - Add transaction wrapper
4. `server/src/services/paymentService.js` - Fix callback race condition
5. `server/src/services/cartService.js` - Add inventory check
6. `server/src/services/promotionService.js` - Atomic validation + usage increment
7. `server/src/services/refundService.js` - Add transaction wrapper

---

## 5. Testing Strategy

1. **Unit Tests**: Test từng method với mock
2. **Integration Tests**: Test race condition với concurrent requests
3. **Manual Testing**: 
   - Mở 2 browser tabs, cùng book cùng 1 ticket
   - Test payment callback bị gọi 2 lần

---

## 6. Migration Plan

1. Deploy code mới
2. MongoDB replica set cần enable transactions (nếu chưa có)
3. Test trên staging trước
4. Monitor logs sau deployment
