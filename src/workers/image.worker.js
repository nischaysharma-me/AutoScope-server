require('dotenv').config();
const { Worker } = require('bullmq');
const { redisConnection, WORKER_CONCURRENCY } = require('../configs/redis.config');
const { connectDB } = require('../configs/db.config');
const { ImageUploadModel } = require('../models');
const chunkUploadService = require('../services/chunkUpload.service');

const QUEUE_NAME = 'image-processing';

function startWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { uploadId } = job.data;
      console.log(`[BullMQ Worker] ⚙️ Processing job ${job.id} for upload ${uploadId}...`);

      try {
        await job.updateProgress(10);

        // Update MongoDB processing status to PROCESSING
        const session = await ImageUploadModel.findById(uploadId);
        if (!session) {
          throw new Error(`Upload session '${uploadId}' not found in MongoDB`);
        }

        session.processingStatus = 'PROCESSING';
        await session.save();

        await job.updateProgress(30);

        // Perform stream merge, S3 upload, and artifact creation
        console.log(`[BullMQ Worker] Merging chunks and synchronizing to S3 for ${uploadId}...`);
        const result = await chunkUploadService.mergeChunks(uploadId);

        await job.updateProgress(100);
        console.log(`[BullMQ Worker] ✅ Job ${job.id} finished successfully for upload ${uploadId}`);

        return {
          uploadId,
          fileName: result.fileName,
          fileSize: result.fileSize,
          s3Location: result.s3Location,
          artifactsCount: (result.artifacts || []).length,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`[BullMQ Worker Error] Job ${job.id} failed:`, error);

        // Mark processingStatus as FAILED in MongoDB
        try {
          await ImageUploadModel.findByIdAndUpdate(uploadId, {
            processingStatus: 'FAILED',
          });
        } catch (dbErr) {
          console.error('[BullMQ Worker] Failed to update DB on job error:', dbErr);
        }

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on('ready', () => {
    console.log(`[BullMQ Worker] 🚀 Image processing worker is ready (Concurrency: ${WORKER_CONCURRENCY})`);
  });

  worker.on('error', (err) => {
    console.error('[BullMQ Worker Global Error]:', err);
  });

  return worker;
}

// Standalone execution support: node src/workers/image.worker.js
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      startWorker();
      console.log('[BullMQ Worker] Standalone worker process running.');
    } catch (err) {
      console.error('[BullMQ Worker] Failed to start standalone worker:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  startWorker,
};
