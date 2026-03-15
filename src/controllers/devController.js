const Event = require('../models/Event');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const Promotion = require('../models/promotionModel');
const mongoose = require('mongoose');

exports.seedTestData = async (req, res) => {
  try {
    console.log("Seeding test data...");
    
    // 1. Delete existing mock data to prevent unique constraint errors
    const testEventNames = ["TayNguyen Sound - The Concert", "Luv 'n' Chill: Acoustic Night"];
    await Event.deleteMany({ name: { $in: testEventNames } });
    
    // Also delete orphaned TicketInfo and Inventory for these events would be good, 
    // but for mock seeding, deleting by name is a start. 
    // Usually we'd want to find events, then their tickets, then inventories.
    
    const testEvents = [
      {
        name: "TayNguyen Sound - The Concert",
        description: "An amazing night in the mountains with acoustic music.",
        status: "PUBLISHED",
        startTime: new Date(Date.now() + 86400000 * 7), 
        endTime: new Date(Date.now() + 86400000 * 7 + 3600000 * 3),
        physicalLocation: "Dalat, Lam Dong",
        isApproved: true,
        isDeleted: false,
        genreId: 1
      },
      {
        name: "Luv 'n' Chill: Acoustic Night",
        description: "Relax and unwind with the best chill vibes.",
        status: "PUBLISHED",
        startTime: new Date(Date.now() + 86400000 * 14), 
        endTime: new Date(Date.now() + 86400000 * 14 + 10800000),
        physicalLocation: "HCMC, Vietnam",
        isApproved: true,
        isDeleted: false,
        genreId: 2
      }
    ];

    for (const eventData of testEvents) {
      const event = await Event.create(eventData);

      const ticketTypes = [
        { name: "General Admission", price: 250000, quantity: 100 },
        { name: "VIP Front Row", price: 850000, quantity: 20 }
      ];

      for (const t of ticketTypes) {
        const ticketInfo = await TicketInfo.create({
          eventId: event._id,
          ticketName: t.name,
          price: t.price,
          salesStartTime: new Date(),
          salesEndTime: event.startTime,
          isRefundable: true
        });

        await TicketInventory.create({
          ticketInfoId: ticketInfo._id,
          totalQuantity: t.quantity,
          soldQuantity: 0,
          reservedQuantity: 0,
          availableQuantity: t.quantity
        });
      }
    }

    // 2. Ensure test promotions are active
    const promotions = [
      {
        promotionName: "Early Bird",
        promotionCode: "EARLY10",
        promotionType: "percentage",
        startTime: new Date(Date.now() - 3600000), 
        endTime: new Date(Date.now() + 86400000 * 30),
        discountPercentage: 10,
        minOrderAmount: 200000,
        isActive: true
      },
      {
        promotionName: "Special 50K Off",
        promotionCode: "SAVE50",
        promotionType: "fixed_amount",
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 86400000 * 30),
        discountAmount: 50000,
        minOrderAmount: 100000,
        isActive: true
      }
    ];

    for (const promoData of promotions) {
      await Promotion.findOneAndUpdate(
        { promotionCode: promoData.promotionCode },
        promoData,
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: "Mock testing events and promotions seeded successfully!" });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ error: error.message });
  }
};
