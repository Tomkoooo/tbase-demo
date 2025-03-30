// server/database/methods/bucket.js
import { ObjectId } from "mongodb";

export const bucketMethods = {
  async createBucket(db) {
    try {
      const bucketId = `bucket_${Math.random().toString(36).substring(2, 15)}`;
      await db.createCollection(bucketId);
      console.log(`Created MongoDB bucket: ${bucketId}`);
      return bucketId;
    } catch (err) {
      throw new Error(err.message || "Error creating bucket");
    }
  },

  async uploadFile(db, bucketId, file) {
    try {
      const { name: fileName, type: fileType, data: fileData } = file;
      if (!fileName || !fileType || !fileData) {
        throw new Error("File name, type, and data are required");
      }

      const result = await db.collection(bucketId).insertOne({
        file_name: fileName,
        file_type: fileType,
        file_data: Buffer.from(fileData),
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`Uploaded file ${fileName} to ${bucketId} in MongoDB`);
      return result.insertedId.toString();
    } catch (err) {
      throw new Error(err.message || "Error uploading file to bucket");
    }
  },

  async getFile(db, bucketId, fileId) {
    try {
      const file = await db.collection(bucketId).findOne({ _id: new ObjectId(fileId) });
      if (!file) throw new Error("File not found");
      console.log(`Retrieved file ${file.file_name} from ${bucketId} in MongoDB`);
      return {
        fileName: file.file_name,
        fileType: file.file_type,
        fileData: file.file_data.buffer,
      };
    } catch (err) {
      throw new Error(err.message || "Error retrieving file from bucket");
    }
  },

  async listFiles(db, bucketId) {
    try {
      const files = await db.collection(bucketId).find().toArray();
      console.log(`Listed ${files.length} files in ${bucketId} in MongoDB`);
      return files.map(file => ({
        id: file._id.toString(),
        fileName: file.file_name,
        fileType: file.file_type,
        createdAt: file.created_at.toISOString(),
        updatedAt: file.updated_at.toISOString(),
      }));
    } catch (err) {
      throw new Error(err.message || "Error listing files in bucket");
    }
  },

  async deleteFile(db, bucketId, fileId) {
    try {
      const result = await db.collection(bucketId).deleteOne({ _id: new ObjectId(fileId) });
      if (result.deletedCount === 0) throw new Error("File not found");
      console.log(`Deleted file ${fileId} from ${bucketId} in MongoDB`);
    } catch (err) {
      throw new Error(err.message || "Error deleting file from bucket");
    }
  },

  async listBuckets(db) {
    try {
      const collections = await db.listCollections().toArray();
      const buckets = collections
        .filter((col) => col.name.startsWith("bucket_"))
        .map((col) => col.name);
      console.log(`Listed ${buckets.length} buckets in MongoDB`);
      return buckets;
    } catch (err) {
      throw new Error(err.message || "Error listing buckets");
    }
  },

  async deleteBucket(db, bucketId) {
    try {
      if (!bucketId.startsWith("bucket_")) {
        throw new Error("Invalid bucket ID: must start with 'bucket_'");
      }
      await db.collection(bucketId).drop();
      console.log(`Deleted bucket ${bucketId} in MongoDB`);
    } catch (err) {
      throw new Error(err.message || "Error deleting bucket");
    }
  },

  async renameBucket(db, oldBucketId, newBucketId) {
    try {
      if (!oldBucketId.startsWith("bucket_") || !newBucketId.startsWith("bucket_")) {
        throw new Error("Invalid bucket ID: must start with 'bucket_'");
      }
      if (oldBucketId === newBucketId) {
        throw new Error("New bucket ID must be different from the old one");
      }
      await db.collection(oldBucketId).rename(newBucketId);
      console.log(`Renamed bucket ${oldBucketId} to ${newBucketId} in MongoDB`);
    } catch (err) {
      throw new Error(err.message || "Error renaming bucket");
    }
  },
};