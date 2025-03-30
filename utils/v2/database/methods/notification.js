// server/database/methods/notification.js
export const notificationMethods = {
    async storeSubscription(db, userId, subscription) {
      const subscriptionDoc = {
        userId,
        subscription,
        createdAt: new Date(),
      };
      const result = await db.collection("push_subscriptions").insertOne(subscriptionDoc);
      console.log(`Stored subscription for ${userId} in MongoDB`);
      return result.insertedId;
    },
  
    async upsert(db, table, data) {
      const result = await db.collection(table).updateOne(
        { userId: data.userId },
        { $set: { subscription: data.subscription, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log(`Upserted into ${table} in MongoDB:`, data);
      return result;
    },
  
    async delete(db, table, query) {
      const result = await db.collection(table).deleteOne({
        userId: query.userId,
        subscription: query.subscription,
      });
      console.log(`Deleted from ${table} in MongoDB:`, query);
      return { deletedCount: result.deletedCount };
    },
  
    async find(db, table, query) {
      const results = await db.collection(table).find(query).toArray();
      console.log(`Found in ${table} in MongoDB:`, results);
      return results;
    },
  };